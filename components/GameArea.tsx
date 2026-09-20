'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { scoreClassique, scoreSurvie, scoreDefi } from '@/lib/scoring';
import type { RealtimeChannel } from '@supabase/supabase-js';

type Team = {
  id: string;
  name: string;
  avatar: string;
  color: string;
  score: number;
  lives: number;
};

type Question = {
  id: string;
  prompt: string;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string;
  correct_choice: 'a' | 'b' | 'c' | 'd';
  explanation: string | null;
};

type RevealInfo = { choice: string | null; timeMs: number | null };

const QUESTION_TIME_SECONDS = 20;

const CHOICE_COLORS: Record<'a' | 'b' | 'c' | 'd', string> = {
  a: '#6c7bf7',
  b: '#35c2a3',
  c: '#ffb648',
  d: '#ff7a68',
};

export default function GameArea({
  gameId,
  onRestart,
  onClose,
}: {
  gameId: string;
  onRestart?: () => void;
  onClose?: () => void;
}) {
  const [joinCode, setJoinCode] = useState<string>('');
  const [mode, setMode] = useState<string>('classique');
  const [teams, setTeams] = useState<Team[]>([]);
  const [answeredTeamIds, setAnsweredTeamIds] = useState<Set<string>>(new Set());
  const [question, setQuestion] = useState<Question | null>(null);
  const [phase, setPhase] = useState<'lobby' | 'question' | 'revealed' | 'finished'>('lobby');
  const [secondsLeft, setSecondsLeft] = useState(QUESTION_TIME_SECONDS);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [autoAttempted, setAutoAttempted] = useState(false);
  const [revealedInfo, setRevealedInfo] = useState<Record<string, RevealInfo>>({});
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const askedQuestionIdsRef = useRef<string[]>([]);
  const currentQuestionIdRef = useRef<string | null>(null);
  const [challengerTeamId, setChallengerTeamId] = useState<string | null>(null);
  const challengerCountsRef = useRef<Record<string, number>>({});
  const challengerIndexRef = useRef(0);
  const [participatifTurnTeamId, setParticipatifTurnTeamId] = useState<string | null>(null);
  const participatifTurnTeamIdRef = useRef<string | null>(null);
  const participatifTurnsRef = useRef<Record<string, number>>({});
  const participatifIndexRef = useRef(0);
  const participatifPotRef = useRef(0);

  useEffect(() => {
    const loadGame = async () => {
      const { data: game } = await supabase.from('games').select('*').eq('id', gameId).single();
      if (game) {
        setJoinCode(game.join_code);
        setMode(game.mode ?? 'classique');
      }
    };
    loadGame();

    const loadTeams = async () => {
      const { data } = await supabase.from('teams').select('*').eq('game_id', gameId);
      if (data) setTeams(data as Team[]);
    };
    loadTeams();

    supabase
      .from('answers')
      .select('question_id')
      .eq('game_id', gameId)
      .then(({ data }) => {
        if (data) {
          askedQuestionIdsRef.current = Array.from(new Set(data.map((a: any) => a.question_id)));
        }
      });

    const ch = supabase.channel(`game:${gameId}:play`, {
      config: { broadcast: { self: false } },
    });

    ch.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'teams', filter: `game_id=eq.${gameId}` },
      (payload) => {
        setTeams((prev) => [...prev, payload.new as Team]);
      }
    );

    ch.on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'teams', filter: `game_id=eq.${gameId}` },
      (payload) => {
        const removedId = (payload.old as { id: string }).id;
        setTeams((prev) => prev.filter((t) => t.id !== removedId));
      }
    );

    ch.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'answers', filter: `game_id=eq.${gameId}` },
      (payload) => {
        const row = payload.new as { team_id: string; question_id: string };
        if (row.question_id === currentQuestionIdRef.current) {
          setAnsweredTeamIds((prev) => new Set(prev).add(row.team_id));
        }
      }
    );

    ch.subscribe();
    setChannel(ch);

    return () => {
      supabase.removeChannel(ch);
    };
  }, [gameId]);

  const startQuestion = useCallback(
    async (q: Question) => {
      setQuestion(q);
      currentQuestionIdRef.current = q.id;
      askedQuestionIdsRef.current = [...askedQuestionIdsRef.current, q.id];
      setPhase('question');
      setAnsweredTeamIds(new Set());
      setRevealedInfo({});
      setSecondsLeft(QUESTION_TIME_SECONDS);

      await supabase
        .from('games')
        .update({ current_question_id: q.id, status: 'question', question_started_at: new Date().toISOString() })
        .eq('id', gameId);

      channel?.send({
        type: 'broadcast',
        event: 'question:show',
        payload: { question: q, startedAt: Date.now(), turnTeamId: participatifTurnTeamIdRef.current },
      });
    },
    [channel, gameId]
  );

  // Désigne le prochain challenger (round-robin, 3 tours max par équipe).
  // Retourne false si toutes les équipes ont déjà défié 3 fois (fin du mode Défi).
  const pickNextChallenger = useCallback((): boolean => {
    if (teams.length === 0) return false;

    for (let i = 0; i < teams.length; i++) {
      const idx = (challengerIndexRef.current + i) % teams.length;
      const candidate = teams[idx];
      const count = challengerCountsRef.current[candidate.id] ?? 0;
      if (count < 3) {
        challengerCountsRef.current[candidate.id] = count + 1;
        challengerIndexRef.current = (idx + 1) % teams.length;
        setChallengerTeamId(candidate.id);
        return true;
      }
    }
    return false; // toutes les équipes ont défié 3 fois
  }, [teams]);

  // Désigne l'équipe qui joue le tour suivant (round-robin, 3 tours max
  // par équipe). Retourne false quand toutes les équipes ont joué 3 fois.
  const pickNextParticipatifTurn = useCallback((): boolean => {
    if (teams.length === 0) return false;
    if (participatifPotRef.current === 0) participatifPotRef.current = teams.length;

    for (let i = 0; i < teams.length; i++) {
      const idx = (participatifIndexRef.current + i) % teams.length;
      const candidate = teams[idx];
      const count = participatifTurnsRef.current[candidate.id] ?? 0;
      if (count < 3) {
        participatifTurnsRef.current[candidate.id] = count + 1;
        participatifIndexRef.current = (idx + 1) % teams.length;
        participatifTurnTeamIdRef.current = candidate.id;
        setParticipatifTurnTeamId(candidate.id);
        return true;
      }
    }
    return false;
  }, [teams]);

  // Distribue la cagnotte restante s'il y a une chaîne en cours au moment
  // où tout le monde a joué ses 3 tours, puis termine la partie.
  const finishParticipatif = useCallback(async () => {
    if (participatifPotRef.current > teams.length && teams.length > 0) {
      const share = participatifPotRef.current / teams.length;
      for (const t of teams) {
        await supabase.rpc('increment_team_score', { p_team_id: t.id, p_points: share });
      }
      const { data: refreshedTeams } = await supabase.from('teams').select('*').eq('game_id', gameId);
      if (refreshedTeams) setTeams(refreshedTeams as Team[]);
    }
    setPhase('finished');
  }, [teams, gameId]);

  const goToNextQuestion = useCallback(() => {
    if (mode === 'defi') {
      const hasNext = pickNextChallenger();
      if (!hasNext) {
        setPhase('finished');
        return;
      }
    }
    if (mode === 'participatif') {
      const hasNext = pickNextParticipatifTurn();
      if (!hasNext) {
        finishParticipatif();
        return;
      }
    }
    setLoadError(null);
    loadNextQuestion(gameId, startQuestion, setLoadError, () => setPhase('finished'), askedQuestionIdsRef.current);
  }, [mode, pickNextChallenger, pickNextParticipatifTurn, finishParticipatif, gameId, startQuestion]);

  useEffect(() => {
    if (!autoAttempted && channel && phase === 'lobby' && teams.length > 0) {
      setAutoAttempted(true);
      goToNextQuestion();
    }
  }, [autoAttempted, channel, phase, teams.length, gameId, goToNextQuestion]);

  useEffect(() => {
    if (phase !== 'question') return;

    const shouldReveal =
      mode === 'participatif'
        ? secondsLeft <= 0 || answeredTeamIds.has(participatifTurnTeamId ?? '__none__')
        : secondsLeft <= 0 ||
          answeredTeamIds.size === (mode === 'survie' ? teams.filter((t) => (t.lives ?? 3) > 0).length : teams.length);

    if (shouldReveal) {
      reveal();
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, secondsLeft, answeredTeamIds, teams, mode, participatifTurnTeamId]);

  const reveal = useCallback(async () => {
    if (!question) return;
    setPhase('revealed');

    const { data: answers } = await supabase
      .from('answers')
      .select('team_id, choice, response_time_ms')
      .eq('question_id', question.id)
      .eq('game_id', gameId);

    const submitted = (answers ?? []).map((a) => ({
      teamId: a.team_id,
      choice: a.choice,
      responseTimeMs: a.response_time_ms,
    }));

    const infoMap: Record<string, RevealInfo> = {};
    teams.forEach((t) => {
      const found = submitted.find((s) => s.teamId === t.id);
      infoMap[t.id] = { choice: found?.choice ?? null, timeMs: found?.responseTimeMs ?? null };
    });
    setRevealedInfo(infoMap);

    if (mode === 'survie') {
      const currentLives: Record<string, number> = {};
      teams.forEach((t) => (currentLives[t.id] = t.lives ?? 3));
      const eliminatedBefore = teams.filter((t) => (t.lives ?? 3) <= 0).length;

      const survieResults = scoreSurvie(submitted as any, question.correct_choice, currentLives, eliminatedBefore);

      for (const r of survieResults) {
        await supabase.from('teams').update({ lives: r.livesRemaining }).eq('id', r.teamId);
        if (r.points > 0) {
          await supabase.rpc('increment_team_score', { p_team_id: r.teamId, p_points: r.points });
        }
      }

      channel?.send({ type: 'broadcast', event: 'answers:revealed', payload: { results: survieResults } });

      const { data: refreshedTeams } = await supabase.from('teams').select('*').eq('game_id', gameId);
      if (refreshedTeams) {
        setTeams(refreshedTeams as Team[]);
        // Fin de partie : une seule équipe (ou aucune) encore en vie
        const stillAlive = (refreshedTeams as Team[]).filter((t) => (t.lives ?? 0) > 0);
        if (stillAlive.length <= 1) {
          setTimeout(() => setPhase('finished'), 50);
        }
      }
      return;
    }

    if (mode === 'participatif') {
      const turnAnswer = submitted.find((s) => s.teamId === participatifTurnTeamId);
      const isCorrect = turnAnswer?.choice === question.correct_choice;

      if (isCorrect) {
        participatifPotRef.current = participatifPotRef.current * 2;
      } else {
        const share = participatifPotRef.current / Math.max(teams.length, 1);
        for (const t of teams) {
          await supabase.rpc('increment_team_score', { p_team_id: t.id, p_points: share });
        }
        participatifPotRef.current = teams.length;
      }

      channel?.send({ type: 'broadcast', event: 'answers:revealed', payload: {} });

      const { data: refreshedTeams } = await supabase.from('teams').select('*').eq('game_id', gameId);
      if (refreshedTeams) setTeams(refreshedTeams as Team[]);
      return;
    }

    const results =
      mode === 'defi' && challengerTeamId
        ? scoreDefi(submitted as any, question.correct_choice, challengerTeamId)
        : scoreClassique(submitted as any, question.correct_choice);

    for (const r of results) {
      await supabase.rpc('increment_team_score', { p_team_id: r.teamId, p_points: r.points });
    }

    channel?.send({ type: 'broadcast', event: 'answers:revealed', payload: { results } });

    const { data: refreshedTeams } = await supabase.from('teams').select('*').eq('game_id', gameId);
    if (refreshedTeams) setTeams(refreshedTeams as Team[]);
  }, [question, channel, gameId, teams, mode, challengerTeamId, participatifTurnTeamId]);

  const quitKeepingScores = () => {
    setShowQuitConfirm(false);
    setPhase('finished');
  };

  const quitResettingScores = async () => {
    setShowQuitConfirm(false);
    for (const t of teams) {
      await supabase.from('teams').update({ score: 0 }).eq('id', t.id);
    }
    const { data: refreshedTeams } = await supabase.from('teams').select('*').eq('game_id', gameId);
    if (refreshedTeams) setTeams(refreshedTeams as Team[]);
    setPhase('finished');
  };

  // --- Écran : partie terminée (plus de questions disponibles) ---
  if (phase === 'finished') {
    const ranked = [...teams].sort((a, b) => b.score - a.score);
    return (
      <div style={styles.mainCard}>
        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>🏁 Partie terminée</h2>
        <p style={{ color: '#7a819c', fontSize: 13.5, marginBottom: 20 }}>Voici le classement final.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {ranked.map((t, i) => (
            <div key={t.id} style={{ ...styles.teamTile, borderColor: i === 0 ? '#ffb648' : '#eaedf6' }}>
              {i === 0 ? '🏆 ' : `${i + 1}. `}
              <span>{t.avatar}</span> {t.name} — <strong>{t.score} pts</strong>
            </div>
          ))}
        </div>
        {onRestart && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button style={styles.startBtn} onClick={onRestart}>
              Nouvelle partie
            </button>
            {onClose && (
              <button
                style={{ ...styles.startBtn, background: '#eef0f8', color: '#1f2440' }}
                onClick={onClose}
              >
                Fermer
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {phase === 'lobby' && (
        <div style={styles.lobbyCard}>
          <h1 style={{ fontSize: 22, fontWeight: 800 }}>En attente de démarrage…</h1>
          <div style={styles.joinCode}>{joinCode}</div>

          {loadError && (
            <p style={{ color: '#ff7a68', fontSize: 14, margin: '12px 0', maxWidth: 420, marginInline: 'auto' }}>
              {loadError}
            </p>
          )}

          {teams.length > 0 && (
            <button style={styles.startBtn} onClick={goToNextQuestion}>
              Démarrer la partie ({teams.length} équipes)
            </button>
          )}
        </div>
      )}

      {(phase === 'question' || phase === 'revealed') && question && (
        <div style={styles.mainCard}>
          <div style={styles.qHead}>
            <span style={styles.qTag}>Question</span>
            {mode === 'participatif' && (
              <span style={{ ...styles.qTag, background: '#fff3e0', color: '#b5761f' }}>
                🪙 Cagnotte : {participatifPotRef.current} pts
              </span>
            )}
            {phase === 'question' && <div style={styles.timer}>{secondsLeft}s</div>}
          </div>
          <div style={styles.questionText}>{question.prompt}</div>

          <div style={styles.choices} key={question.id}>
            {(['a', 'b', 'c', 'd'] as const).map((letter) => (
              <div
                key={`${question.id}-${letter}`}
                style={{
                  ...styles.choice,
                  ...(phase === 'revealed' && letter === question.correct_choice ? styles.choiceCorrect : {}),
                }}
              >
                <strong>{letter.toUpperCase()}.</strong> {question[`choice_${letter}` as const]}
              </div>
            ))}
          </div>

          {phase === 'revealed' && question.explanation && (
            <div style={styles.explainBox}>{question.explanation}</div>
          )}

          {/* Seules les réponses et temps sont affichés ici — les scores sont sur les tuiles équipes du menu */}
          <div style={styles.teamsRow}>
            {teams.map((t) => {
              const hasAnswered = answeredTeamIds.has(t.id);
              const info = revealedInfo[t.id];
              const isCorrect = phase === 'revealed' && info?.choice === question.correct_choice;
              const choiceColor = info?.choice ? CHOICE_COLORS[info.choice as 'a' | 'b' | 'c' | 'd'] : null;

              return (
                <div
                  key={t.id}
                  style={{
                    ...styles.teamTile,
                    ...(mode === 'defi' && t.id === challengerTeamId && phase === 'question'
                      ? { borderColor: '#ffb648', background: '#fff3e0' }
                      : {}),
                    ...(mode === 'participatif' && t.id === participatifTurnTeamId && phase === 'question'
                      ? { borderColor: '#ffb648', background: '#fff3e0' }
                      : {}),
                    ...(phase === 'question' && hasAnswered ? styles.teamAnswered : {}),
                    ...(phase === 'revealed' && choiceColor
                      ? { borderColor: choiceColor, background: choiceColor + '22' }
                      : {}),
                  }}
                >
                  {mode === 'defi' && t.id === challengerTeamId && <span title="Challenger">👑 </span>}
                  {mode === 'participatif' && t.id === participatifTurnTeamId && <span title="Son tour">🎙️ </span>}
                  <span>{t.avatar}</span> {t.name}
                  {mode === 'survie' && (
                    <span style={{ marginLeft: 6, fontSize: 12 }}>
                      {(t.lives ?? 3) > 0 ? '❤️'.repeat(t.lives ?? 3) : '💀'}
                    </span>
                  )}
                  {phase === 'revealed' && (
                    <strong style={{ marginLeft: 6 }}>
                      {info?.choice
                        ? `· ${info.choice.toUpperCase()}${isCorrect ? ' ✓' : ' ✕'}${
                            info.timeMs ? ` (${(info.timeMs / 1000).toFixed(1)}s)` : ''
                          }`
                        : '· pas de réponse'}
                    </strong>
                  )}
                </div>
              );
            })}
          </div>

          {phase === 'revealed' && (
            <>
              {loadError && (
                <p style={{ color: '#ff7a68', fontSize: 14, marginBottom: 12 }}>{loadError}</p>
              )}
              <button style={styles.startBtn} onClick={goToNextQuestion}>
                Question suivante
              </button>
              <button
                onClick={() => setShowQuitConfirm(true)}
                style={{
                  marginLeft: 10,
                  background: 'none',
                  border: '1px solid #eaedf6',
                  borderRadius: 999,
                  padding: '13px 20px',
                  fontWeight: 700,
                  fontSize: 14,
                  color: '#7a819c',
                  cursor: 'pointer',
                }}
              >
                Quitter la partie
              </button>

              {showQuitConfirm && (
                <div style={{ marginTop: 14, background: '#f4f6fb', borderRadius: 14, padding: 16 }}>
                  <p style={{ fontSize: 13.5, marginBottom: 10 }}>
                    Terminer la partie maintenant — que faire des scores actuels ?
                  </p>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      onClick={quitKeepingScores}
                      style={{ ...styles.startBtn, marginTop: 0, fontSize: 13, padding: '10px 16px' }}
                    >
                      Garder les scores
                    </button>
                    <button
                      onClick={quitResettingScores}
                      style={{
                        ...styles.startBtn,
                        marginTop: 0,
                        fontSize: 13,
                        padding: '10px 16px',
                        background: '#eef0f8',
                        color: '#1f2440',
                      }}
                    >
                      Remettre à zéro
                    </button>
                    <button
                      onClick={() => setShowQuitConfirm(false)}
                      style={{
                        marginTop: 0,
                        fontSize: 13,
                        padding: '10px 16px',
                        background: 'none',
                        border: 'none',
                        color: '#7a819c',
                        cursor: 'pointer',
                      }}
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

async function loadNextQuestion(
  gameId: string,
  startQuestion: (q: Question) => void,
  onError: (msg: string) => void,
  onExhausted: () => void,
  askedQuestionIds: string[] = []
) {
  const { data: game } = await supabase
    .from('games')
    .select('level_ids, category_ids, profile_id')
    .eq('id', gameId)
    .single();

  let pool: any[] | null = null;
  let error: any = null;

  if (game?.profile_id) {
    const { data: profilePacks } = await supabase
      .from('quiz_profile_packs')
      .select('pack_id')
      .eq('profile_id', game.profile_id);

    const packIds = (profilePacks ?? []).map((pp) => pp.pack_id);

    if (packIds.length === 0) {
      onError("Le profil sélectionné n'a aucun pack associé. Ajoute des packs à ce profil dans Paramétrage.");
      return;
    }

    const res = await supabase.from('questions').select('*').eq('validated', true).in('pack_id', packIds);
    pool = res.data;
    error = res.error;
  } else {
    let query = supabase.from('questions').select('*').eq('validated', true);
    if (game?.level_ids?.length) query = query.in('level_id', game.level_ids);
    if (game?.category_ids?.length) query = query.in('category_id', game.category_ids);
    const res = await query;
    pool = res.data;
    error = res.error;
  }

  if (error) {
    onError(`Erreur lors du chargement des questions : ${error.message}`);
    return;
  }
  if (!pool || pool.length === 0) {
    onError(
      "Aucune question disponible. Va dans Paramétrage pour créer des packs (Gemini) et un profil, ou vérifie que la table `questions` contient des lignes validées."
    );
    return;
  }

  const freshPool = pool.filter((q) => !askedQuestionIds.includes(q.id));

  if (freshPool.length === 0) {
    // Plus de questions neuves : la partie se termine proprement (pas de répétition).
    onExhausted();
    return;
  }

  const randomQuestion = freshPool[Math.floor(Math.random() * freshPool.length)];
  startQuestion(randomQuestion as Question);
}

const styles: Record<string, React.CSSProperties> = {
  lobbyCard: {
    maxWidth: 600,
    textAlign: 'center',
    background: '#fff',
    borderRadius: 24,
    padding: 40,
    boxShadow: '0 10px 30px -12px rgba(31,36,64,0.12)',
  },
  joinCode: {
    fontSize: 40,
    fontWeight: 800,
    letterSpacing: 6,
    margin: '16px 0',
    color: '#6c7bf7',
  },
  startBtn: {
    background: '#6c7bf7',
    color: '#fff',
    border: 'none',
    borderRadius: 999,
    padding: '14px 28px',
    fontWeight: 700,
    fontSize: 15,
    cursor: 'pointer',
    marginTop: 12,
  },
  mainCard: {
    maxWidth: 900,
    background: '#fff',
    borderRadius: 24,
    padding: 32,
    boxShadow: '0 10px 30px -12px rgba(31,36,64,0.12)',
  },
  qHead: { display: 'flex', justifyContent: 'space-between', marginBottom: 16 },
  qTag: { background: '#e6f5fd', color: '#4fb0e8', fontWeight: 800, padding: '6px 12px', borderRadius: 999, fontSize: 12 },
  timer: { fontWeight: 800, fontSize: 20, color: '#6c7bf7' },
  questionText: { fontSize: 24, fontWeight: 800, marginBottom: 24 },
  choices: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 },
  choice: { background: '#f4f6fb', borderRadius: 16, padding: 16, fontWeight: 700, border: '2px solid transparent' },
  choiceCorrect: { background: '#e3f8f2', borderColor: '#35c2a3' },
  explainBox: { background: '#e3f8f2', borderRadius: 16, padding: 16, marginBottom: 24, color: '#1f2440' },
  teamsRow: { display: 'flex', flexWrap: 'wrap', gap: 10 },
  teamTile: { border: '2px solid #eaedf6', borderRadius: 16, padding: '10px 14px', fontWeight: 700, fontSize: 14 },
  teamAnswered: { borderColor: '#d8dcec', background: '#eef0f8' },
};
