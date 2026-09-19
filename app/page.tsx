'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

const MODES = [
  { id: 'classique', label: 'Classique', emoji: '🎯' },
  { id: 'defi', label: 'Défi', emoji: '⚔️' },
  { id: 'survie', label: 'Survie', emoji: '❤️' },
  { id: 'participatif', label: 'Participatif', emoji: '🤝' },
];

type Team = { id: string; name: string; avatar: string; color: string };
type Profile = { id: string; name: string; is_favorite: boolean; is_default: boolean };

export default function ConsolePage() {
  const router = useRouter();
  const [activeMode, setActiveMode] = useState('classique');
  const [gameId, setGameId] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [origin, setOrigin] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const prevTeamsCount = useRef(0);

  useEffect(() => {
    setOrigin(window.location.origin);
    supabase
      .from('quiz_profiles')
      .select('id, name, is_favorite, is_default')
      .then(({ data }) => {
        const list = (data as Profile[]) ?? [];
        const sorted = list.sort((a, b) => {
          if (a.is_default !== b.is_default) return a.is_default ? -1 : 1;
          if (a.is_favorite !== b.is_favorite) return a.is_favorite ? -1 : 1;
          return a.name.localeCompare(b.name);
        });
        setProfiles(sorted);

        // Présélectionne le profil par défaut s'il en existe un ; sinon, rien n'est sélectionné
        const defaultProfile = sorted.find((p) => p.is_default);
        if (defaultProfile && !selectedProfileId) {
          setSelectedProfileId(defaultProfile.id);
        }
      });
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
      .then(({ data }) => {
        setTeams((data as Team[]) ?? []);
        prevTeamsCount.current = data?.length ?? 0;
      });

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

  // Ferme automatiquement la fenêtre d'invitation dès qu'une équipe rejoint
  useEffect(() => {
    if (showInvite && teams.length > prevTeamsCount.current) {
      setShowInvite(false);
    }
    prevTeamsCount.current = teams.length;
  }, [teams, showInvite]);

  const selectMode = async (mode: string) => {
    setActiveMode(mode);
    if (gameId) {
      await supabase.from('games').update({ mode }).eq('id', gameId);
    }
  };

  const selectProfile = async (profileId: string) => {
    setSelectedProfileId(profileId);
    if (gameId) {
      await supabase.from('games').update({ profile_id: profileId || null }).eq('id', gameId);
    }
  };

  const resetSession = () => {
    localStorage.removeItem('quiz-party-game-id');
    setGameId(null);
    setJoinCode(null);
    setTeams([]);
    setShowInvite(false);
    setError(null);
  };

  const inviteTeams = async () => {
    setError(null);

    if (gameId) {
      // La partie existe déjà : on réaffiche juste le même code
      setShowInvite(true);
      return;
    }

    setCreating(true);
    const res = await fetch('/api/create-game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: activeMode,
        visualTheme: 'espace',
        levelIds: ['CM1'],
        categoryIds: [],
        profileId: selectedProfileId || null,
      }),
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
    setShowInvite(true);
  };

  const removeTeam = async (teamId: string) => {
    const { error } = await supabase.from('teams').delete().eq('id', teamId);
    if (error) {
      setError(
        `Impossible de déconnecter l'équipe (${error.message}). As-tu bien exécuté la migration qui autorise la suppression d'équipe (migration-003) ?`
      );
    }
  };

  const [copiedTeamId, setCopiedTeamId] = useState<string | null>(null);

  const copyTeamLink = async (teamId: string) => {
    const link = `${origin}/play/${gameId}?team=${teamId}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedTeamId(teamId);
      setTimeout(() => setCopiedTeamId(null), 2000);
    } catch {
      window.prompt('Lien de récupération (copie-le manuellement) :', link);
    }
  };

  const startGame = () => {
    if (gameId) router.push(`/host/${gameId}`);
  };

  return (
    <main style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Inter, sans-serif', background: '#f4f6fb' }}>
      {/* Colonne gauche : modes + invitation + équipes */}
      <aside
        style={{
          width: 260,
          borderRight: '2px solid #6c7bf7',
          padding: '32px 24px',
          background: '#f4f6fb',
        }}
      >
        <h1 style={{ fontSize: 19, fontWeight: 800, marginBottom: 24 }}>Choisis un mode de jeu</h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginBottom: 32 }}>
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
            cursor: 'pointer',
            textDecoration: 'underline',
            marginBottom: 18,
          }}
        >
          {creating ? 'Création…' : 'Inviter une équipe à rejoindre le jeu'}
        </button>

        {error && <p style={{ color: '#ff7a68', fontSize: 13, marginBottom: 12 }}>{error}</p>}

        {/* Équipes déjà enrôlées */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
                padding: '6px 6px 6px 12px',
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              <span style={{ fontSize: 16 }}>{t.avatar}</span>
              <span
                onClick={() => copyTeamLink(t.id)}
                title="Copier le lien de récupération de cette équipe"
                style={{
                  flex: 1,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  cursor: 'pointer',
                }}
              >
                {copiedTeamId === t.id ? 'Lien copié ✓' : t.name}
              </span>
              <button
                onClick={() => removeTeam(t.id)}
                title="Déconnecter l'équipe"
                style={{
                  border: 'none',
                  background: 'rgba(0,0,0,0.06)',
                  borderRadius: '50%',
                  width: 18,
                  height: 18,
                  fontSize: 10,
                  cursor: 'pointer',
                  color: '#7a819c',
                  flexShrink: 0,
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* Zone centrale */}
      <section style={{ flex: 1, padding: '28px 40px' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 22 }}>🎯</span> Quiz Party
          </div>

          <select
            value={selectedProfileId}
            onChange={(e) => selectProfile(e.target.value)}
            style={{
              padding: '10px 14px',
              borderRadius: 999,
              border: '1px solid #eaedf6',
              fontSize: 13,
              fontWeight: 700,
              color: '#1f2440',
              background: '#fff',
            }}
          >
            <option value="">— Choisir un profil —</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.is_default ? '🏠 ' : p.is_favorite ? '⭐ ' : ''}{p.name}
              </option>
            ))}
          </select>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {gameId && (
              <button
                onClick={resetSession}
                title="Oublier cette partie et repartir de zéro"
                style={{
                  background: 'none',
                  border: '1px solid #eaedf6',
                  borderRadius: 999,
                  padding: '8px 14px',
                  fontWeight: 700,
                  fontSize: 12.5,
                  color: '#7a819c',
                  cursor: 'pointer',
                }}
              >
                Nouvelle partie
              </button>
            )}

            {teams.length > 0 && (
              <button
                onClick={startGame}
                style={{
                  background: '#6c7bf7',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 999,
                  padding: '12px 22px',
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                Démarrer la partie ({teams.length} équipe{teams.length > 1 ? 's' : ''})
              </button>
            )}

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
                flexShrink: 0,
              }}
            >
              ⚙️
            </a>
          </div>
        </header>
      </section>

      {/* Fenêtre d'invitation : se ferme seule dès qu'une équipe rejoint,
          ou manuellement via la croix si personne n'a encore répondu */}
      {showInvite && joinCode && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(31,36,64,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 24,
              padding: 36,
              maxWidth: 420,
              width: '90%',
              textAlign: 'center',
              position: 'relative',
              boxShadow: '0 20px 50px -12px rgba(31,36,64,0.3)',
            }}
          >
            <button
              onClick={() => setShowInvite(false)}
              title="Fermer"
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                border: 'none',
                background: '#f4f6fb',
                borderRadius: '50%',
                width: 32,
                height: 32,
                fontSize: 14,
                cursor: 'pointer',
                color: '#7a819c',
              }}
            >
              ✕
            </button>

            <p style={{ color: '#7a819c', marginBottom: 8 }}>En attente de l'équipe…</p>
            <div style={{ color: '#7a819c', fontSize: 13, marginBottom: 16 }}>
              Rejoindre sur : <strong>{origin}/join</strong>
            </div>
            <div style={{ fontSize: 48, fontWeight: 800, letterSpacing: 8, color: '#6c7bf7' }}>{joinCode}</div>
          </div>
        </div>
      )}
    </main>
  );
}
