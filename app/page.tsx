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
  {
    id: 'camembert',
    label: 'Trivial Poursuit',
    emoji: '🥧',
    color: '#ffb648',
    desc: "À tour de rôle, une équipe choisit une catégorie (sur son téléphone) parmi les 6 à 10 \"camemberts\" du profil. 3 bonnes réponses d'affilée dans une catégorie = 1 part gagnée définitivement. Une erreur remet à zéro la progression en cours, sauf Joker (gagné à chaque part complétée, max 3). Première équipe avec toutes ses parts : +50 pts bonus. Nécessite un profil marqué 🎡 Trivial Poursuit (10 catégories distinctes).",
  },
];

const PLANET_WIDTH: Record<string, number> = { classique: 11.2, defi: 8.2, survie: 8.6, participatif: 10.9, camembert: 8.2 };

type Team = {
  id: string;
  name: string;
  avatar: string;
  color: string;
  score: number;
  camembert_won?: string[];
  camembert_jokers?: number;
};
type Profile = {
  id: string;
  name: string;
  is_favorite: boolean;
  is_default: boolean;
  distinctCategoryCount?: number;
  isTrivialEligible?: boolean;
};

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
  const [showStats, setShowStats] = useState(false);
  const [showNewGameChoice, setShowNewGameChoice] = useState(false);
  const [statsData, setStatsData] = useState<
    Record<string, { teamName: string; teamAvatar: string; categories: Record<string, { correct: number; wrong: number }> }>
  >({});
  const prevTeamsCount = useRef(0);

  useEffect(() => {
    setOrigin(window.location.origin);

    (async () => {
      const { data: profileRows } = await supabase.from('quiz_profiles').select('id, name, is_favorite, is_default');
      const { data: profilePackRows } = await supabase.from('quiz_profile_packs').select('*');
      const { data: packRows } = await supabase.from('question_packs').select('id, category_id');

      const categoryByPackId: Record<string, string> = {};
      (packRows ?? []).forEach((p: any) => {
        if (p.category_id) categoryByPackId[p.id] = p.category_id;
      });

      const packsByProfile: Record<string, string[]> = {};
      (profilePackRows ?? []).forEach((pp: any) => {
        packsByProfile[pp.profile_id] = [...(packsByProfile[pp.profile_id] ?? []), pp.pack_id];
      });

      const list = ((profileRows as Profile[]) ?? []).map((p) => {
        const packIds = packsByProfile[p.id] ?? [];
        const distinctCategoryCount = new Set(packIds.map((id) => categoryByPackId[id]).filter(Boolean)).size;
        return { ...p, distinctCategoryCount, isTrivialEligible: distinctCategoryCount === 10 };
      });

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
    })();
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

  // Toutes les mises à jour de la partie passent par le serveur (service role) :
  // les update directs depuis le navigateur étaient bloqués silencieusement par RLS.
  const updateGame = async (fields: { mode?: string; profileId?: string | null; resetCamembert?: boolean }) => {
    if (!gameId) return true;
    try {
      const res = await fetch('/api/update-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, ...fields }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(`Mise à jour de la partie impossible : ${data.error ?? res.status}`);
        return false;
      }
      return true;
    } catch (e: any) {
      setError(`Mise à jour de la partie impossible : ${e?.message ?? e}`);
      return false;
    }
  };

  const selectMode = async (mode: string) => {
    setActiveMode(mode);

    if (mode === 'camembert') {
      const eligible = profiles.filter((p) => p.isTrivialEligible);
      const currentIsEligible = eligible.some((p) => p.id === selectedProfileId);
      if (!currentIsEligible && eligible.length > 0) {
        setSelectedProfileId(eligible[0].id);
        await updateGame({ profileId: eligible[0].id, resetCamembert: true });
      }
    }

    await updateGame({ mode });
  };

  const selectProfile = async (profileId: string) => {
    setSelectedProfileId(profileId);
    // On efface aussi les thèmes Trivial Poursuit déjà mémorisés pour
    // cette partie : ils appartenaient à l'ancien profil.
    await updateGame({ profileId: profileId || null, resetCamembert: true });
  };

  const fullReset = () => {
    localStorage.removeItem('quiz-party-game-id');
    setGameId(null);
    setJoinCode(null);
    setTeams([]);
    setShowInvite(false);
    setError(null);
    setGameStarted(false);
    setShowNewGameChoice(false);
  };

  // Garde le même code et les mêmes équipes : remet juste les scores à zéro
  // (et les vies, pour le mode Survie) et efface l'historique des
  // questions posées pour repartir sur un pool de questions neuf.
  const restartSameTeams = async () => {
    setShowNewGameChoice(false);
    if (!gameId) return;

    await supabase
      .from('teams')
      .update({ score: 0, lives: 3, camembert_progress: {}, camembert_won: [], camembert_jokers: 0 })
      .eq('game_id', gameId);
    await supabase.from('answers').delete().eq('game_id', gameId);
    await supabase
      .from('games')
      .update({ status: 'lobby', current_question_id: null, camembert_categories: [] })
      .eq('id', gameId);

    const { data: refreshedTeams } = await supabase.from('teams').select('*').eq('game_id', gameId);
    if (refreshedTeams) setTeams(refreshedTeams as Team[]);

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
      return;
    }
    // Retrait immédiat côté client : la tuile disparaît sans délai et les
    // autres remontent (flexbox column), le nom redevient aussitôt
    // disponible pour une nouvelle équipe sur l'écran de jointure.
    setTeams((prev) => prev.filter((t) => t.id !== teamId));
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

  const startGame = async () => {
    if (!gameId) return;
    // Filet de sécurité final : garantit qu'au moment précis où l'écran de
    // jeu se lance, la base reflète bien le mode et le profil actuellement
    // affichés dans la console, quoi qu'il ait pu se passer avant.
    const ok = await updateGame({ mode: activeMode, profileId: selectedProfileId || null });
    if (!ok) return; // on ne lance pas la partie avec un mauvais profil
    setGameStarted(true);
  };

  const openStats = async () => {
    if (!gameId) return;
    setShowStats(true);

    const { data: answersRows } = await supabase
      .from('answers')
      .select('team_id, choice, question_id')
      .eq('game_id', gameId);

    if (!answersRows || answersRows.length === 0) {
      setStatsData({});
      return;
    }

    const questionIds = Array.from(new Set(answersRows.map((a: any) => a.question_id)));
    const { data: questionsRows } = await supabase
      .from('questions')
      .select('id, category_id, correct_choice')
      .in('id', questionIds);

    const { data: categoriesRows } = await supabase.from('categories').select('id, name');

    const categoryNameById: Record<string, string> = {};
    (categoriesRows ?? []).forEach((c: any) => (categoryNameById[c.id] = c.name));

    const questionById: Record<string, any> = {};
    (questionsRows ?? []).forEach((q: any) => (questionById[q.id] = q));

    const result: typeof statsData = {};
    teams.forEach((t) => {
      result[t.id] = { teamName: t.name, teamAvatar: t.avatar, categories: {} };
    });

    answersRows.forEach((a: any) => {
      const q = questionById[a.question_id];
      if (!q) return;
      const catName = categoryNameById[q.category_id] ?? 'Sans catégorie';
      if (!result[a.team_id]) return; // équipe supprimée depuis
      if (!result[a.team_id].categories[catName]) {
        result[a.team_id].categories[catName] = { correct: 0, wrong: 0 };
      }
      if (a.choice === q.correct_choice) {
        result[a.team_id].categories[catName].correct++;
      } else {
        result[a.team_id].categories[catName].wrong++;
      }
    });

    setStatsData(result);
  };

  const activeModeInfo = MODES.find((m) => m.id === activeMode) ?? MODES[0];
  const barBtn: React.CSSProperties = {
    background: 'rgba(20,35,90,0.85)',
    color: '#e8eeff',
    border: '1px solid rgba(120,170,255,0.55)',
    borderRadius: 999,
    padding: '0.5cqw 1.3cqw',
    fontWeight: 700,
    fontSize: '1.15cqw',
    cursor: 'pointer',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
  };
  const eligibleProfiles = activeMode === 'camembert' ? profiles.filter((p) => p.isTrivialEligible) : profiles;

  return (
    <main style={{ minHeight: '100vh', background: '#03040c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
      {/* Scène cockpit : ratio fixe de l'image, tout est positionné en % (et texte en cqw) pour rester aligné */}
      <div
        style={
          {
            position: 'relative',
            width: 'min(100vw, calc(100vh * 1536 / 944))',
            aspectRatio: '1536 / 944',
            containerType: 'size',
            backgroundImage: 'url(/cockpit.webp)',
            backgroundSize: '100% 100%',
            color: '#e8eeff',
            overflow: 'hidden',
          } as React.CSSProperties
        }
      >
        {/* Écran gauche : équipes et scores */}
        <div style={{ position: 'absolute', left: '1.6%', top: '14.3%', width: '13.4%', height: '26.5%', overflowY: 'auto', boxSizing: 'border-box', padding: '0.4cqw' }}>
          <div style={{ fontSize: '0.9cqw', fontWeight: 800, color: '#7fd1ff', letterSpacing: '0.1cqw', marginBottom: '0.4cqw' }}>ÉQUIPES</div>
          {teams.length === 0 && <div style={{ fontSize: '0.9cqw', color: '#8a97c4' }}>Aucune équipe connectée</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35cqw' }}>
            {teams.map((t) => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4cqw', border: `1px solid ${t.color}`, borderRadius: 999, padding: '0.15cqw 0.4cqw 0.15cqw 0.6cqw', fontWeight: 700, fontSize: '0.95cqw', background: 'rgba(10,18,50,0.7)' }}>
                <span>{t.avatar}</span>
                <span
                  onClick={() => copyTeamLink(t.id)}
                  title="Copier le lien de récupération de cette équipe"
                  style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer' }}
                >
                  {copiedTeamId === t.id ? 'Lien copié ✓' : t.name}
                </span>
                <span style={{ color: '#ffd166', fontWeight: 800, flexShrink: 0 }}>
                  {t.score ?? 0}
                  {activeMode === 'camembert' && ` · 🥧${(t.camembert_won ?? []).length}${(t.camembert_jokers ?? 0) > 0 ? `🤡${t.camembert_jokers}` : ''}`}
                </span>
                <button onClick={() => removeTeam(t.id)} title="Déconnecter l'équipe" style={{ border: 'none', background: 'rgba(255,255,255,0.12)', borderRadius: '50%', width: '1.3cqw', height: '1.3cqw', fontSize: '0.7cqw', cursor: 'pointer', color: '#c8d3ff', flexShrink: 0, padding: 0 }}>
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Écran droit : code de partie + explication de la réponse (alimentée par GameArea) */}
        <div style={{ position: 'absolute', left: '84.6%', top: '14.3%', width: '14%', height: '26.5%', overflowY: 'auto', boxSizing: 'border-box', padding: '0.4cqw', textAlign: 'center' }}>
          {joinCode ? (
            <>
              <div style={{ fontSize: '0.85cqw', color: '#8a97c4' }}>Rejoindre sur {origin.replace(/^https?:\/\//, '')}/join</div>
              <div style={{ fontSize: '2.6cqw', fontWeight: 800, letterSpacing: '0.3cqw', color: '#7fd1ff', textShadow: '0 0 1cqw #2aa8ff' }}>{joinCode}</div>
            </>
          ) : (
            <div style={{ fontSize: '1cqw', color: '#8a97c4', marginTop: '2cqw' }}>Clique sur « Rejoindre le jeu » pour créer un code</div>
          )}
          <div id="cockpit-explain" style={{ marginTop: '0.5cqw', textAlign: 'left' }} />
        </div>

        {/* Hublot : menu des modes (planètes) ou écran de jeu */}
        <div style={{ position: 'absolute', left: '20%', top: '11.7%', width: '60%', height: '33.9%', boxSizing: 'border-box' }}>
          {!gameStarted ? (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end' }}>
                {MODES.map((m) => {
                  const sel = activeMode === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => selectMode(m.id)}
                      title={m.label}
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5cqw', opacity: sel ? 1 : 0.72, transform: sel ? 'scale(1.15)' : 'scale(1)', transition: 'transform .25s, opacity .25s, filter .25s', filter: sel ? `drop-shadow(0 0 1.1cqw ${m.color})` : 'none' }}
                    >
                      <img src={`/planets/${m.id}.png`} alt="" draggable={false} style={{ width: `${PLANET_WIDTH[m.id]}cqw`, display: 'block' }} />
                      <span style={{ fontWeight: 800, fontSize: '1.3cqw', color: sel ? '#fff' : '#a9b6e6', textShadow: '0 0 0.8cqw #000' }}>
                        {m.emoji} {m.label}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p style={{ textAlign: 'center', fontSize: '1.15cqw', lineHeight: 1.35, color: '#c8d3ff', margin: '1.2cqw 2cqw 0', textShadow: '0 0 0.6cqw #000' }}>
                {activeModeInfo.desc}
              </p>
            </div>
          ) : (
            gameId && (
              <GameArea gameId={gameId} initialMode={activeMode} cockpit onRestart={() => setShowNewGameChoice(true)} onClose={() => setGameStarted(false)} />
            )
          )}
        </div>

        {/* Pupitre du bas : profil et commandes */}
        <div style={{ position: 'absolute', left: '5%', top: '88%', width: '90%', height: '11%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.9cqw', flexWrap: 'wrap' }}>
          <select
            value={selectedProfileId}
            onChange={(e) => selectProfile(e.target.value)}
            disabled={gameStarted}
            title={gameStarted ? 'Impossible de changer de profil en cours de partie' : ''}
            style={{ ...barBtn, maxWidth: '22cqw', cursor: gameStarted ? 'not-allowed' : 'pointer', opacity: gameStarted ? 0.6 : 1 }}
          >
            <option value="">— Choisir un profil —</option>
            {eligibleProfiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.is_default ? '🏠 ' : p.is_favorite ? '⭐ ' : ''}{p.name}
              </option>
            ))}
          </select>
          {activeMode === 'camembert' && eligibleProfiles.length === 0 && (
            <span style={{ color: '#ff9a8a', fontSize: '1cqw', fontWeight: 700 }}>Aucun profil éligible (10 catégories distinctes requises)</span>
          )}

          {!gameStarted && (
            <button onClick={inviteTeams} disabled={creating} style={barBtn}>
              {creating ? 'Création…' : 'Rejoindre le jeu'}
            </button>
          )}
          {teams.length > 0 && !gameStarted && (
            <button onClick={startGame} style={{ ...barBtn, background: 'linear-gradient(135deg,#3b82f6,#7c5cff)', boxShadow: '0 0 1cqw rgba(80,140,255,.7)' }}>
              Démarrer la partie ({teams.length} équipe{teams.length > 1 ? 's' : ''})
            </button>
          )}
          {gameId && (
            <button onClick={() => setShowNewGameChoice(true)} title="Oublier cette partie et repartir de zéro" style={barBtn}>
              Nouvelle partie
            </button>
          )}

          {/* Boutons « Question suivante / Quitter » injectés par GameArea */}
          <div id="cockpit-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.8cqw' }} />

          {gameId && (
            <button onClick={openStats} title="Statistiques par équipe et par catégorie" style={barBtn}>
              📊
            </button>
          )}
          <a href="/parametrage" title="Paramétrage" style={barBtn}>
            ⚙️
          </a>
          {error && <span style={{ color: '#ff9a8a', fontSize: '1cqw', fontWeight: 700 }}>{error}</span>}
        </div>
      </div>

      {/* Fenêtre de choix Nouvelle partie */}
      {showNewGameChoice && (
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
              padding: 32,
              maxWidth: 420,
              width: '90%',
              textAlign: 'center',
              boxShadow: '0 20px 50px -12px rgba(31,36,64,0.3)',
            }}
          >
            <h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 20 }}>Nouvelle partie</h2>
            <button
              onClick={restartSameTeams}
              style={{
                display: 'block',
                width: '100%',
                background: '#6c7bf7',
                color: '#fff',
                border: 'none',
                borderRadius: 999,
                padding: '14px 20px',
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
                marginBottom: 10,
              }}
            >
              Garder les mêmes équipes (même code, scores à zéro)
            </button>
            <button
              onClick={fullReset}
              style={{
                display: 'block',
                width: '100%',
                background: '#eef0f8',
                color: '#1f2440',
                border: 'none',
                borderRadius: 999,
                padding: '14px 20px',
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
                marginBottom: 10,
              }}
            >
              Changer d'équipes (nouveau code)
            </button>
            <button
              onClick={() => setShowNewGameChoice(false)}
              style={{ background: 'none', border: 'none', color: '#7a819c', fontWeight: 700, cursor: 'pointer' }}
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Fenêtre statistiques */}
      {showStats && (
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
              padding: 32,
              maxWidth: 640,
              width: '90%',
              maxHeight: '80vh',
              overflowY: 'auto',
              position: 'relative',
              boxShadow: '0 20px 50px -12px rgba(31,36,64,0.3)',
            }}
          >
            <button
              onClick={() => setShowStats(false)}
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

            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 18 }}>📊 Réponses par équipe et par catégorie</h2>

            {Object.keys(statsData).length === 0 ? (
              <p style={{ color: '#7a819c', fontSize: 13.5 }}>Aucune réponse enregistrée pour l'instant.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {Object.entries(statsData).map(
                  ([
                    teamId,
                    data,
                  ]: [
                    string,
                    { teamName: string; teamAvatar: string; categories: Record<string, { correct: number; wrong: number }> }
                  ]) => (
                    <div key={teamId}>
                      <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 8 }}>
                        {data.teamAvatar} {data.teamName}
                      </div>
                      {Object.keys(data.categories).length === 0 ? (
                        <p style={{ color: '#7a819c', fontSize: 12.5, marginLeft: 8 }}>Pas encore de réponse.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {Object.entries(data.categories).map(([catName, counts]: [string, { correct: number; wrong: number }]) => (
                            <div
                              key={catName}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: 13,
                                background: '#f4f6fb',
                                borderRadius: 10,
                                padding: '6px 12px',
                              }}
                            >
                              <span>{catName}</span>
                              <span>
                                <span style={{ color: '#35c2a3', fontWeight: 700 }}>{counts.correct} ✓</span>
                                {'  '}
                                <span style={{ color: '#ff7a68', fontWeight: 700 }}>{counts.wrong} ✕</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

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
