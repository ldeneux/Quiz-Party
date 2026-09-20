'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import GameArea from '@/components/GameArea';

const MODES = [
  {
    id: 'classique',
    label: 'Classique',
    emoji: '🎯',
    color: '#6c7bf7',
    desc: '1 point par bonne réponse, avec un bonus de rapidité pour les 3 premières équipes correctes (+3/+2/+1). Objectif : 150 points.',
  },
  {
    id: 'defi',
    label: 'Défi',
    emoji: '⚔️',
    color: '#a26ce0',
    desc: "Une équipe choisit le thème et joue : elle gagne 3 pts par bonne réponse sans jamais en perdre. Les adversaires qui se trompent perdent 2 pts, reversés à l'équipe qui a lancé le défi.",
  },
  {
    id: 'survie',
    label: 'Survie',
    emoji: '❤️',
    color: '#ff7a68',
    desc: '3 vies par équipe. Une mauvaise réponse (ou pas de réponse) coûte une vie. Les points aux équipes éliminées augmentent à chaque manche.',
  },
  {
    id: 'participatif',
    label: 'Participatif',
    emoji: '🤝',
    color: '#35c2a3',
    desc: 'Une cagnotte commune double à chaque bonne réponse en chaîne. Une erreur la redistribue à toutes les équipes.',
  },
];

type Team = { id: string; name: string; avatar: string; color: string; score: number };
type Profile = { id: string; name: string; is_favorite: boolean; is_default: boolean };

const pillLabel: React.CSSProperties = {
  display: 'inline-block',
  background: '#e6f5fd',
  color: '#4fb0e8',
  fontWeight: 800,
  fontSize: 12.5,
  padding: '6px 14px',
  borderRadius: 999,
  marginBottom: 18,
};

export default function ConsolePage() {
  const [activeMode, setActiveMode] = useState('classique');
  const [infoMode, setInfoMode] = useState<string | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [origin, setOrigin] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [gameStarted, setGameStarted] = useState(false);
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

        const defaultProfile = sorted.find((p) => p.is_default);
        if (defaultProfile && !selectedProfileId) {
          setSelectedProfileId(defaultProfile.id);
        }
      });
  }, []);

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

  // Charge + écoute les équipes (jointure, départ, ET score en direct)
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

    const ch = supabase.channel(`game:${gameId}:console`);
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
    ch.on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'teams', filter: `game_id=eq.${gameId}` },
      (payload) => {
        const updated = payload.new as Team;
        setTeams((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      }
    );
    ch.subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [gameId]);

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
    setGameStarted(false);
  };

  const inviteTeams = async () => {
    setError(null);

    if (gameId) {
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
      setError(`Impossible de déconnecter l'équipe (${error.message}).`);
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
    if (gameId) setGameStarted(true);
  };

  return (
    <main style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Inter, sans-serif', background: '#f4f6fb' }}>
      {/* Colonne gauche : modes + invitation + équipes */}
      <aside style={{ width: 270, background: '#eef0f8', padding: '28px 22px' }}>
        <div style={pillLabel}>Mode de jeu</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
          {MODES.map((m) => (
            <div key={m.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  onClick={() => selectMode(m.id)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 14px',
                    borderRadius: 999,
                    border: activeMode === m.id ? `2px solid ${m.color}` : '2px solid transparent',
                    background: activeMode === m.id ? m.color + '18' : '#fff',
                    fontWeight: 700,
                    fontSize: 13.5,
                    cursor: 'pointer',
                    textAlign: 'left',
                    color: activeMode === m.id ? '#1f2440' : '#7a819c',
                  }}
                >
                  <span style={{ fontSize: 17 }}>{m.emoji}</span> {m.label}
                </button>
                <button
                  onClick={() => setInfoMode(infoMode === m.id ? null : m.id)}
                  title="Règles du mode"
                  style={{
                    border: 'none',
                    background: 'none',
                    color: '#9aa1c2',
                    cursor: 'pointer',
                    fontSize: 15,
                    width: 22,
                    flexShrink: 0,
                  }}
                >
                  ⓘ
                </button>
              </div>
              {infoMode === m.id && (
                <p style={{ fontSize: 12, color: '#7a819c', lineHeight: 1.5, margin: '6px 4px 0' }}>{m.desc}</p>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={inviteTeams}
          disabled={creating}
          style={{ ...pillLabel, border: 'none', cursor: 'pointer', font: 'inherit' }}
        >
          {creating ? 'Création…' : 'Rejoindre le jeu'}
        </button>

        {error && <p style={{ color: '#ff7a68', fontSize: 12.5, marginBottom: 12 }}>{error}</p>}

        {/* Équipes déjà enrôlées, avec leur score */}
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
              {gameStarted && (
                <span style={{ color: '#7a819c', fontWeight: 800, fontSize: 12, flexShrink: 0 }}>{t.score} pts</span>
              )}
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

            {teams.length > 0 && !gameStarted && (
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

        {gameStarted && gameId && (
          <div style={{ marginTop: 28 }}>
            <GameArea gameId={gameId} onRestart={resetSession} onClose={() => setGameStarted(false)} />
          </div>
        )}
      </section>

      {/* Fenêtre d'invitation */}
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
