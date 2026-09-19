'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

const MODES = [
  { id: 'classique', label: 'Classique', emoji: '🎯' },
  { id: 'defi', label: 'Défi', emoji: '⚔️' },
  { id: 'survie', label: 'Survie', emoji: '❤️' },
  { id: 'participatif', label: 'Participatif', emoji: '🤝' },
];

type Team = { id: string; name: string; avatar: string; color: string };

export default function ConsolePage() {
  const router = useRouter();
  const [activeMode, setActiveMode] = useState('classique');
  const [gameId, setGameId] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [origin, setOrigin] = useState('');

  // Adresse réelle de l'appli (jamais un domaine en dur)
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  // Reprend une session en cours si on recharge la page
  useEffect(() => {
    const saved = localStorage.getItem('quiz-party-game-id');
    if (saved) {
      supabase
        .from('games')
        .select('*')
        .eq('id', saved)
        .single()
        .then(({ data }) => {
          if (data) {
            setGameId(data.id);
            setJoinCode(data.join_code);
            setActiveMode(data.mode ?? 'classique');
          } else {
            localStorage.removeItem('quiz-party-game-id');
          }
        });
    }
  }, []);

  // Charge + écoute les équipes une fois la partie créée
  useEffect(() => {
    if (!gameId) return;

    supabase
      .from('teams')
      .select('*')
      .eq('game_id', gameId)
      .then(({ data }) => setTeams((data as Team[]) ?? []));

    const ch = supabase.channel(`game:${gameId}`);
    ch.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'teams', filter: `game_id=eq.${gameId}` },
      (payload) => setTeams((prev) => [...prev, payload.new as Team])
    );
    ch.on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'teams', filter: `game_id=eq.${gameId}` },
      (payload) => setTeams((prev) => prev.filter((t) => t.id !== (payload.old as { id: string }).id))
    );
    ch.subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [gameId]);

  const selectMode = async (mode: string) => {
    setActiveMode(mode);
    if (gameId) {
      await supabase.from('games').update({ mode }).eq('id', gameId);
    }
  };

  const inviteTeams = async () => {
    if (gameId) return; // déjà créée, rien à refaire
    setError(null);
    setCreating(true);

    const res = await fetch('/api/create-game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: activeMode, visualTheme: 'espace', levelIds: ['CM1'], categoryIds: [] }),
    });
    const data = await res.json();

    if (data.error) {
      setError(data.error);
      setCreating(false);
      return;
    }

    setGameId(data.game.id);
    setJoinCode(data.game.join_code);
    localStorage.setItem('quiz-party-game-id', data.game.id);
    setCreating(false);
  };

  const removeTeam = async (teamId: string) => {
    await supabase.from('teams').delete().eq('id', teamId);
  };

  const startGame = () => {
    if (gameId) router.push(`/host/${gameId}`);
  };

  return (
    <main style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Inter, sans-serif', background: '#f4f6fb' }}>
      {/* Colonne gauche : modes + invitation */}
      <aside
        style={{
          width: 260,
          borderRight: '2px solid #6c7bf7',
          padding: '32px 24px',
          background: '#f4f6fb',
        }}
      >
        <h1 style={{ fontSize: 19, fontWeight: 800, marginBottom: 24 }}>Choisis un mode de jeu</h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginBottom: 40 }}>
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => selectMode(m.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: 'none',
                border: 'none',
                textAlign: 'left',
                fontSize: 15,
                fontWeight: 800,
                cursor: 'pointer',
                padding: 0,
                color: activeMode === m.id ? '#1f2440' : '#9aa1c2',
              }}
            >
              <span style={{ fontSize: 20 }}>{m.emoji}</span> {m.label}
              {activeMode === m.id && <span style={{ marginLeft: 'auto', color: '#6c7bf7' }}>●</span>}
            </button>
          ))}
        </div>

        <button
          onClick={inviteTeams}
          disabled={creating}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            fontWeight: 800,
            fontSize: 14,
            textAlign: 'left',
            color: '#1f2440',
            cursor: gameId ? 'default' : 'pointer',
            textDecoration: gameId ? 'none' : 'underline',
          }}
        >
          {creating ? 'Création…' : 'Inviter une équipe à rejoindre le jeu'}
        </button>
      </aside>

      {/* Zone centrale */}
      <section style={{ flex: 1, padding: '28px 40px' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div style={{ fontWeight: 800, fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 22 }}>🎯</span> Quiz Party
          </div>
          <a
            href="/parametrage"
            title="Paramétrage"
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              boxShadow: '0 4px 12px rgba(31,36,64,0.08)',
              textDecoration: 'none',
            }}
          >
            ⚙️
          </a>
        </header>

        {error && <p style={{ color: '#ff7a68', marginBottom: 16 }}>{error}</p>}

        {joinCode && (
          <div
            style={{
              background: '#fff',
              borderRadius: 20,
              padding: 28,
              boxShadow: '0 10px 30px -14px rgba(31,36,64,0.15)',
              marginBottom: 24,
              maxWidth: 460,
            }}
          >
            <div style={{ color: '#7a819c', fontSize: 13, marginBottom: 6 }}>
              Les équipes rejoignent sur : <strong>{origin}/join</strong>
            </div>
            <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: 6, color: '#6c7bf7' }}>{joinCode}</div>
          </div>
        )}

        {teams.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 28 }}>
            {teams.map((t) => (
              <div
                key={t.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: '#fff',
                  border: `2px solid ${t.color}`,
                  borderRadius: 999,
                  padding: '8px 8px 8px 14px',
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                <span style={{ fontSize: 18 }}>{t.avatar}</span> {t.name}
                <button
                  onClick={() => removeTeam(t.id)}
                  title="Déconnecter l'équipe"
                  style={{
                    border: 'none',
                    background: 'rgba(0,0,0,0.06)',
                    borderRadius: '50%',
                    width: 20,
                    height: 20,
                    fontSize: 11,
                    cursor: 'pointer',
                    color: '#7a819c',
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {teams.length > 0 && (
          <button
            onClick={startGame}
            style={{
              background: '#6c7bf7',
              color: '#fff',
              border: 'none',
              borderRadius: 999,
              padding: '14px 28px',
              fontWeight: 700,
              fontSize: 15,
              cursor: 'pointer',
            }}
          >
            Démarrer la partie ({teams.length} équipe{teams.length > 1 ? 's' : ''})
          </button>
        )}
      </section>
    </main>
  );
}
