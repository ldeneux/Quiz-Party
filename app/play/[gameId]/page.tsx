'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { getRandomPresets, TeamPreset } from '@/lib/teamPresets';
import { getTeamBackground, TeamBg } from '@/lib/teamBackgrounds';
import type { RealtimeChannel } from '@supabase/supabase-js';

const MODE_META: Record<string, { label: string; emoji: string }> = {
  classique: { label: 'Classique', emoji: '🎯' },
  defi: { label: 'Défi', emoji: '⚔️' },
  survie: { label: 'Survie', emoji: '❤️' },
  participatif: { label: 'Participatif', emoji: '🤝' },
  camembert: { label: 'Trivial Poursuit', emoji: '🥧' },
};

function ModeLabel({ mode }: { mode: string | null }) {
  if (!mode || !MODE_META[mode]) return null;
  return (
    <div
      style={{
        position: 'fixed',
        top: 10,
        left: 12,
        fontSize: 12,
        fontWeight: 800,
        color: '#7a819c',
        zIndex: 10,
      }}
    >
      {MODE_META[mode].emoji} {MODE_META[mode].label}
    </div>
  );
}

function TeamHeader({
  mode,
  avatar,
  name,
  lives,
  themed = false,
}: {
  mode: string | null;
  avatar: string;
  name: string;
  lives?: number | null;
  themed?: boolean;
}) {
  const meta = mode ? MODE_META[mode] : null;
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
        marginBottom: 14,
        fontSize: 12.5,
        fontWeight: 800,
        color: themed ? '#b9c6f2' : '#7a819c',
        textShadow: themed ? '0 1px 6px rgba(0,0,0,0.7)' : undefined,
      }}
    >
      <span>{meta ? `${meta.emoji} ${meta.label}` : ''}</span>
      <span>
        {avatar} {name}
        {mode === 'survie' && lives !== null && lives !== undefined && (
          <span style={{ marginLeft: 6 }}>{lives > 0 ? '❤️'.repeat(lives) : '💀'}</span>
        )}
      </span>
    </div>
  );
}


const QUESTION_TIME_SECONDS = 20; // même durée que sur l'écran principal (GameArea)

// Décompte des secondes (anneau + chiffre), comme sur l'écran principal
function CountdownRing({ seconds, themed }: { seconds: number; themed: boolean }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  const frac = Math.max(0, Math.min(1, seconds / QUESTION_TIME_SECONDS));
  const low = seconds <= 5;
  return (
    <div style={{ position: 'relative', width: 76, height: 76, margin: '0 auto 14px' }} aria-label={`${seconds} secondes restantes`}>
      <svg width="76" height="76" viewBox="0 0 76 76" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="38" cy="38" r={r} fill="none" stroke={themed ? 'rgba(255,255,255,0.18)' : '#eaedf6'} strokeWidth="6" />
        <circle
          cx="38"
          cy="38"
          r={r}
          fill="none"
          stroke={low ? '#ff7a68' : '#6c7bf7'}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
          style={{ transition: 'stroke-dashoffset 0.25s linear, stroke 0.3s' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 26, color: low ? '#ff7a68' : themed ? '#fff' : '#1f2440', textShadow: themed ? '0 0 10px rgba(0,0,0,0.7)' : undefined }}>
        {seconds}
      </div>
    </div>
  );
}

// Fond d'écran de l'équipe : image portrait/paysage selon l'orientation de l'appareil
function TeamBackdrop({ bg }: { bg: TeamBg }) {
  const css =
    `.tb-bg{position:fixed;inset:0;z-index:0;background-color:#050818;` +
    `background-image:linear-gradient(rgba(3,6,20,.15),rgba(3,6,20,.35)),url(${bg.portrait});` +
    `background-size:cover;background-position:center top;background-repeat:no-repeat}` +
    // sans version paysage : on recadre le fond portrait sur le haut de l'image
    `@media (orientation:landscape){.tb-bg{background-position:center 8%` +
    (bg.landscape ? `;background-image:linear-gradient(rgba(3,6,20,.15),rgba(3,6,20,.35)),url(${bg.landscape});background-position:center` : '') +
    `}}` +
    // en portrait, le contenu commence sous l'emblème de l'équipe
    `@media (orientation:portrait){.tb-content{padding-top:${bg.contentTop ?? '31vh'} !important}}`;
  return (
    <>
      <style>{css}</style>
      <div className="tb-bg" />
    </>
  );
}

// Équivalent de <main> : ajoute le fond de l'équipe (s'il existe) et un texte clair
function Shell({ bg, style, children }: { bg: TeamBg | null; style: React.CSSProperties; children: React.ReactNode }) {
  if (!bg) return <main style={style}>{children}</main>;
  return (
    <>
      <TeamBackdrop bg={bg} />
      <main
        className="tb-content"
        style={{ ...style, marginTop: 0, position: 'relative', zIndex: 1, minHeight: '100vh', boxSizing: 'border-box', color: '#e8eeff' }}
      >
        {children}
      </main>
    </>
  );
}

type Question = {
  id: string;
  prompt: string;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string;
  category_name?: string;
  category_emoji?: string;
};

type CategoryChoice = { id: string; name: string; emoji: string };
type AllTeamProgress = {
  id: string;
  name: string;
  avatar: string;
  camembert_won: string[];
  camembert_progress: Record<string, number>;
};

export default function PlayScreen(props: { params: { gameId: string } }) {
  return (
    <Suspense fallback={null}>
      <PlayScreenInner {...props} />
    </Suspense>
  );
}

function PlayScreenInner({ params }: { params: { gameId: string } }) {
  const { gameId } = params;
  const searchParams = useSearchParams();
  const resumeTeamId = searchParams.get('team');

  const [team, setTeam] = useState<{ id: string; preset: TeamPreset } | null>(null);
  const [presets, setPresets] = useState<TeamPreset[]>([]);
  const [takenNames, setTakenNames] = useState<Set<string>>(new Set());
  const [question, setQuestion] = useState<Question | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [questionStartedAt, setQuestionStartedAt] = useState<number | null>(null);
  const [turnTeamId, setTurnTeamId] = useState<string | null>(null);
  const [kicked, setKicked] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  // Décompte : calculé à partir de l'instant où CE téléphone reçoit la question (insensible aux horloges différentes)
  const localStartRef = useRef<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!question) {
      setSecondsLeft(null);
      return;
    }
    const tick = () => {
      if (localStartRef.current == null) return;
      setSecondsLeft(Math.max(0, QUESTION_TIME_SECONDS - Math.floor((Date.now() - localStartRef.current) / 1000)));
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [question]);

  // Mode Camemberts
  const [categoryChoicePrompt, setCategoryChoicePrompt] = useState<{
    chooserTeamId: string;
    chooserTeamName: string;
    categories: CategoryChoice[];
  } | null>(null);
  const [camembertCategory, setCamembertCategory] = useState<CategoryChoice | null>(null);
  const [jokerOffer, setJokerOffer] = useState<{ categoryName: string; seconds: number } | null>(null);
  const [jokerUsed, setJokerUsed] = useState(false);
  const [myTeamData, setMyTeamData] = useState<{
    camembert_won: string[];
    camembert_jokers: number;
    camembert_progress: Record<string, number>;
    lives?: number;
  } | null>(null);
  const [allWedgeCategories, setAllWedgeCategories] = useState<CategoryChoice[]>([]);
  const [allTeamsProgress, setAllTeamsProgress] = useState<AllTeamProgress[]>([]);
  const [showProgressTable, setShowProgressTable] = useState(false);
  const [gameMode, setGameMode] = useState<string | null>(null);

  useEffect(() => {
    setPresets(getRandomPresets('espace', 12));
  }, []);

  // Reprise directe via un lien de récupération (?team=<id>) — utile si
  // la page d'une équipe s'est fermée par erreur : cliquer sur sa tuile
  // dans la console donne un lien qui la reconnecte directement.
  useEffect(() => {
    if (!resumeTeamId) return;
    supabase
      .from('teams')
      .select('*')
      .eq('id', resumeTeamId)
      .eq('game_id', gameId)
      .single()
      .then(({ data }) => {
        if (data) {
          setTeam({ id: data.id, preset: { name: data.name, avatar: data.avatar, color: data.color } });
        }
      });
  }, [resumeTeamId, gameId]);

  // Liste des noms déjà pris, pour griser les tuiles correspondantes
  // sur l'écran de choix — et les tenir à jour en direct.
  useEffect(() => {
    if (team) return; // pas besoin une fois l'équipe choisie

    supabase
      .from('teams')
      .select('name')
      .eq('game_id', gameId)
      .then(({ data }) => setTakenNames(new Set((data ?? []).map((t: any) => t.name))));

    const ch = supabase.channel(`taken-names:${gameId}`);
    ch.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'teams', filter: `game_id=eq.${gameId}` },
      (payload) => setTakenNames((prev) => new Set(prev).add((payload.new as any).name))
    );
    ch.on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'teams', filter: `game_id=eq.${gameId}` },
      (payload) => {
        setTakenNames((prev) => {
          const next = new Set(prev);
          next.delete((payload.old as any).name);
          return next;
        });
      }
    );
    ch.subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [team, gameId]);

  // Détecte si l'hôte supprime cette équipe pendant la partie, et suit sa
  // propre progression Camemberts (parts gagnées, jokers) en direct.
  useEffect(() => {
    if (!team) return;

    supabase
      .from('teams')
      .select('camembert_won, camembert_jokers, camembert_progress, lives')
      .eq('id', team.id)
      .single()
      .then(({ data }) => {
        if (data) setMyTeamData(data as any);
      });

    const kickChannel = supabase.channel(`team-watch:${team.id}`);
    kickChannel.on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'teams', filter: `id=eq.${team.id}` },
      () => {
        setKicked(true);
        setTeam(null);
        setQuestion(null);
      }
    );
    kickChannel.on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'teams', filter: `id=eq.${team.id}` },
      (payload) => {
        setMyTeamData(payload.new as any);
      }
    );
    kickChannel.subscribe();

    return () => {
      supabase.removeChannel(kickChannel);
    };
  }, [team]);


  useEffect(() => {
    if (!team) return;

    const channel = supabase.channel(`game:${gameId}:play`, {
      config: { broadcast: { self: false } },
    });

    channel.on('broadcast', { event: 'question:show' }, ({ payload }) => {
      setQuestion(payload.question);
      setQuestionStartedAt(payload.startedAt);
      localStartRef.current = Date.now();
      setHasAnswered(false);
      setTurnTeamId(payload.turnTeamId ?? null);
      setCamembertCategory(payload.camembertCategory ?? null);
      if (payload.mode) setGameMode(payload.mode);
      setCategoryChoicePrompt(null);
      setJokerOffer(null);
      setJokerUsed(false);
    });

    channel.on('broadcast', { event: 'choose-category:prompt' }, ({ payload }) => {
      setCategoryChoicePrompt(payload);
      setQuestion(null);
    });

    channel.on('broadcast', { event: 'joker:offer' }, ({ payload }) => {
      if (team && payload.teamIds?.includes(team.id)) {
        setJokerOffer({ categoryName: payload.categoryName, seconds: payload.seconds });
        setJokerUsed(false);
      }
    });

    channel.on('broadcast', { event: 'wedge-categories:set' }, ({ payload }) => {
      setAllWedgeCategories(payload.categories ?? []);
    });

    channel.on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'teams', filter: `game_id=eq.${gameId}` },
      (payload) => {
        const updated = payload.new as AllTeamProgress;
        setAllTeamsProgress((prev) => {
          const exists = prev.some((t) => t.id === updated.id);
          return exists ? prev.map((t) => (t.id === updated.id ? updated : t)) : [...prev, updated];
        });
      }
    );

    supabase
      .from('teams')
      .select('id, name, avatar, camembert_won, camembert_progress')
      .eq('game_id', gameId)
      .then(({ data }) => {
        if (data) setAllTeamsProgress(data as AllTeamProgress[]);
      });

    supabase
      .from('games')
      .select('mode')
      .eq('id', gameId)
      .single()
      .then(({ data }) => {
        if (data) setGameMode(data.mode);
      });

    channel.subscribe();
    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [team, gameId]);

  const joinAsTeam = async (preset: TeamPreset) => {
    const { data: newTeam, error } = await supabase
      .from('teams')
      .insert({ game_id: gameId, name: preset.name, avatar: preset.avatar, color: preset.color })
      .select()
      .single();

    if (error || !newTeam) return;

    setTeam({ id: newTeam.id, preset });
  };

  const [submitError, setSubmitError] = useState<string | null>(null);

  const pickCategory = (categoryId: string) => {
    if (!team) return;
    setCategoryChoicePrompt(null);
    channelRef.current?.send({
      type: 'broadcast',
      event: 'choose-category:pick',
      payload: { teamId: team.id, categoryId },
    });
  };

  const useJoker = () => {
    if (!team || jokerUsed) return;
    setJokerUsed(true);
    channelRef.current?.send({ type: 'broadcast', event: 'joker:use', payload: { teamId: team.id } });
  };

  const submitAnswer = async (choice: 'a' | 'b' | 'c' | 'd') => {
    if (!team || !question || hasAnswered) return;
    setSubmitError(null);

    const responseTimeMs = questionStartedAt ? Date.now() - questionStartedAt : null;

    const { error } = await supabase.from('answers').insert({
      game_id: gameId,
      question_id: question.id,
      team_id: team.id,
      choice,
      response_time_ms: responseTimeMs,
    });

    if (error) {
      setSubmitError(`Échec de l'envoi (${error.message}). Réessaie.`);
      return; // hasAnswered reste false : le bouton reste cliquable
    }

    setHasAnswered(true);

    channelRef.current?.send({
      type: 'broadcast',
      event: 'answer:submitted',
      payload: { teamId: team.id }, // jamais le choix : pas de fuite avant révélation
    });
  };

  const teamBg = team ? getTeamBackground(team.preset.name) : null;

  // --- Écran : équipe expulsée par l'hôte ---
  if (kicked) {
    return (
      <main style={{ textAlign: 'center', marginTop: 100, fontFamily: 'Inter, sans-serif', padding: 24 }}>
        <ModeLabel mode={gameMode} />
        <div style={{ fontSize: 36 }}>👋</div>
        <h2 style={{ fontWeight: 800 }}>Votre équipe a été retirée du jeu</h2>
        <p style={{ color: '#7a819c', marginBottom: 20 }}>L'hôte vous a déconnecté. Vous pouvez rejoindre à nouveau si besoin.</p>
        <button
          onClick={() => setKicked(false)}
          style={{
            background: '#6c7bf7',
            color: '#fff',
            border: 'none',
            borderRadius: 999,
            padding: '10px 24px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Choisir une nouvelle équipe
        </button>
      </main>
    );
  }

  // --- Écran 1 : choix du nom d'équipe ---
  if (!team) {
    return (
      <main style={{ padding: 24, fontFamily: 'Inter, sans-serif', maxWidth: 480, margin: '0 auto' }}>
        <ModeLabel mode={gameMode} />
        <h1 style={{ fontSize: 20, fontWeight: 800, textAlign: 'center', marginBottom: 16 }}>
          Choisissez votre équipe
        </h1>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {presets.map((p) => {
            const taken = takenNames.has(p.name);
            return (
              <button
                key={p.name}
                onClick={() => !taken && joinAsTeam(p)}
                disabled={taken}
                style={{
                  background: taken ? '#f0f1f5' : p.color + '22',
                  border: `2px solid ${taken ? '#dcdfe8' : p.color}`,
                  borderRadius: 16,
                  padding: 16,
                  fontWeight: 700,
                  cursor: taken ? 'not-allowed' : 'pointer',
                  textAlign: 'left',
                  opacity: taken ? 0.5 : 1,
                  position: 'relative',
                }}
              >
                <div style={{ fontSize: 24 }}>{p.avatar}</div>
                {p.name}
                {taken && (
                  <div style={{ fontSize: 11, color: '#7a819c', marginTop: 2 }}>Déjà prise</div>
                )}
              </button>
            );
          })}
        </div>
      </main>
    );
  }

  const leaveTeam = async () => {
    if (!team) return;
    await supabase.from('teams').delete().eq('id', team.id);
    setTeam(null);
    setQuestion(null);
  };

  // --- Écran : choix de catégorie (mode Camemberts) ---
  if (categoryChoicePrompt) {
    const isChooser = categoryChoicePrompt.chooserTeamId === team.id;
    return (
      <Shell bg={teamBg} style={{ padding: 24, fontFamily: 'Inter, sans-serif', maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
        <TeamHeader themed={!!teamBg} mode={gameMode} avatar={team.preset.avatar} name={team.preset.name} lives={myTeamData?.lives} />
        {isChooser ? (
          <>
            <h2 style={{ fontWeight: 800, fontSize: 18, marginBottom: 16 }}>🥧 Choisis une catégorie</h2>
            <div style={{ display: 'grid', gap: 10 }}>
              {categoryChoicePrompt.categories.map((c) => {
                const progress = myTeamData?.camembert_progress?.[c.id] ?? 0;
                const bg =
                  progress === 2 ? '#7fe0b8' : progress === 1 ? '#c8f0df' : '#eef0f8';
                return (
                  <button
                    key={c.id}
                    onClick={() => pickCategory(c.id)}
                    style={{
                      padding: 18,
                      borderRadius: 16,
                      border: 'none',
                      fontWeight: 700,
                      fontSize: 16,
                      background: bg,
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span>{c.emoji} {c.name}</span>
                    {progress > 0 && <span style={{ fontSize: 13, fontWeight: 800 }}>{progress}/3</span>}
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🥧</div>
            <p style={{ color: '#7a819c' }}>{categoryChoicePrompt.chooserTeamName} choisit une catégorie…</p>
          </>
        )}
      </Shell>
    );
  }

  // --- Écran : offre de Joker (mode Camemberts) ---
  if (jokerOffer) {
    return (
      <Shell bg={teamBg} style={{ padding: 24, fontFamily: 'Inter, sans-serif', maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
        <TeamHeader themed={!!teamBg} mode={gameMode} avatar={team.preset.avatar} name={team.preset.name} lives={myTeamData?.lives} />
        <div style={{ fontSize: 32, marginBottom: 8 }}>🤡</div>
        <h2 style={{ fontWeight: 800, fontSize: 17, marginBottom: 10 }}>
          Votre progression sur "{jokerOffer.categoryName}" va être perdue
        </h2>
        {jokerUsed ? (
          <p style={{ color: '#35c2a3', fontWeight: 700 }}>Joker utilisé — votre progression est protégée ✓</p>
        ) : (
          <>
            <button
              onClick={useJoker}
              style={{
                background: '#ffb648',
                color: '#1f2440',
                border: 'none',
                borderRadius: 999,
                padding: '14px 28px',
                fontWeight: 800,
                fontSize: 15,
                cursor: 'pointer',
                marginBottom: 10,
              }}
            >
              🤡 Utiliser un Joker
            </button>
            <p style={{ color: '#7a819c', fontSize: 13 }}>Sinon la progression sera remise à zéro.</p>
          </>
        )}
      </Shell>
    );
  }

  // --- Écran 2 : en attente de question ---
  if (!question) {
    return (
      <Shell bg={teamBg} style={{ textAlign: 'center', marginTop: 40, fontFamily: 'Inter, sans-serif' }}>
        <ModeLabel mode={gameMode} />
        <div style={{ fontSize: 36 }}>{team.preset.avatar}</div>
        <h2 style={{ fontWeight: 800 }}>{team.preset.name}</h2>
        <p style={{ color: '#7a819c' }}>En attente du démarrage…</p>
        {myTeamData && (myTeamData.camembert_won?.length > 0 || myTeamData.camembert_jokers > 0) && (
          <p style={{ color: '#7a819c', fontSize: 13, marginTop: 8 }}>
            🥧×{myTeamData.camembert_won.length}
            {myTeamData.camembert_jokers > 0 ? ` · 🤡×${myTeamData.camembert_jokers}` : ''}
          </p>
        )}
        <button
          onClick={leaveTeam}
          style={{
            marginTop: 20,
            background: 'none',
            border: '1px solid #eaedf6',
            borderRadius: 999,
            padding: '8px 18px',
            color: '#ff7a68',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Quitter la partie
        </button>
      </Shell>
    );
  }

  // --- Écran 3 : réponse ---
  return (
    <Shell bg={teamBg} style={{ padding: 24, fontFamily: 'Inter, sans-serif', maxWidth: 480, margin: '0 auto' }}>
      <TeamHeader themed={!!teamBg} mode={gameMode} avatar={team.preset.avatar} name={team.preset.name} lives={myTeamData?.lives} />

      {submitError && (
        <p style={{ textAlign: 'center', color: '#ff7a68', fontSize: 13, marginBottom: 12 }}>{submitError}</p>
      )}

      {secondsLeft !== null && <CountdownRing seconds={secondsLeft} themed={!!teamBg} />}

      {hasAnswered ? (
        <p style={{ textAlign: 'center', fontWeight: 800, fontSize: 18 }}>Réponse envoyée ✓</p>
      ) : (
        <>
          {(question.category_name || camembertCategory) && (
            <p style={{ textAlign: 'center', color: '#6c7bf7', fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
              {question.category_emoji ?? camembertCategory?.emoji} {question.category_name ?? camembertCategory?.name}
            </p>
          )}
          <p style={{ fontWeight: 800, fontSize: 19, lineHeight: 1.4, marginBottom: 20, textAlign: 'center' }}>
            {question.prompt}
          </p>
          <div style={{ display: 'grid', gap: 12 }} key={question.id}>
            {(['a', 'b', 'c', 'd'] as const).map((letter) => (
              <button
                key={`${question.id}-${letter}`}
                onClick={() => submitAnswer(letter)}
                style={{
                  padding: 20,
                  borderRadius: 16,
                  border: 'none',
                  fontWeight: 700,
                  fontSize: 16,
                  background: teamBg ? 'rgba(15,25,70,0.75)' : '#eef0f8',
                  color: teamBg ? '#e8eeff' : undefined,
                  boxShadow: teamBg ? 'inset 0 0 0 1px rgba(120,160,255,0.5)' : undefined,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <strong>{letter.toUpperCase()}.</strong> {question[`choice_${letter}` as const]}
              </button>
            ))}
          </div>
        </>
      )}
    </Shell>
  );
}
