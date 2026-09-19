'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { scoreClassique } from '@/lib/scoring';
import type { RealtimeChannel } from '@supabase/supabase-js';

type Team = {
  id: string;
  name: string;
  avatar: string;
  color: string;
  score: number;
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

const QUESTION_TIME_SECONDS = 20;

export default function HostScreen({ params }: { params: { gameId: string } }) {
  const { gameId } = params;

  const [joinCode, setJoinCode] = useState<string>('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [answeredTeamIds, setAnsweredTeamIds] = useState<Set<string>>(new Set());
  const [question, setQuestion] = useState<Question | null>(null);
  const [phase, setPhase] = useState<'lobby' | 'question' | 'revealed'>('lobby');
  const [secondsLeft, setSecondsLeft] = useState(QUESTION_TIME_SECONDS);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [autoAttempted, setAutoAttempted] = useState(false);
  const currentQuestionIdRef = useRef<string | null>(null);

  // Connexion au channel Realtime de la partie
  useEffect(() => {
    const loadGame = async () => {
      const { data: game } = await supabase.from('games').select('*').eq('id', gameId).single();
      if (game) setJoinCode(game.join_code);
    };
    loadGame();

    // Charge les équipes déjà présentes (utile si on recharge la page hôte)
    const loadTeams = async () => {
      const { data } = await supabase.from('teams').select('*').eq('game_id', gameId);
      if (data) setTeams(data as Team[]);
    };
    loadTeams();

    const ch = supabase.channel(`game:${gameId}`, {
      config: { broadcast: { self: false } },
    });

    // On écoute directement les insertions en base plutôt qu'un broadcast :
    // fiable même si le canal de l'équipe qui rejoint n'était pas encore
    // complètement établi au moment de l'envoi.
    ch.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'teams', filter: `game_id=eq.${gameId}` },
      (payload) => {
        setTeams((prev) => [...prev, payload.new as Team]);
      }
    );

    // Déconnexion d'une équipe (déclenchée côté hôte ou côté tablette équipe)
    ch.on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'teams', filter: `game_id=eq.${gameId}` },
      (payload) => {
        const removedId = (payload.old as { id: string }).id;
        setTeams((prev) => prev.filter((t) => t.id !== removedId));
      }
    );

    // Idem pour les réponses : on écoute l'insertion en base plutôt qu'un
    // broadcast envoyé depuis l'appareil équipe (même souci de fiabilité).
    // On affiche seulement "a répondu", jamais le choix, avant révélation.
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

  // Démarre une nouvelle question
  const startQuestion = useCallback(
    async (q: Question) => {
      setQuestion(q);
      currentQuestionIdRef.current = q.id;
      setPhase('question');
      setAnsweredTeamIds(new Set());
      setSecondsLeft(QUESTION_TIME_SECONDS);

      await supabase
        .from('games')
        .update({ current_question_id: q.id, status: 'question', question_started_at: new Date().toISOString() })
        .eq('id', gameId);

      channel?.send({
        type: 'broadcast',
        event: 'question:show',
        payload: { question: q, startedAt: Date.now() },
      });
    },
    [channel, gameId]
  );

  // Arrivée avec des équipes déjà enrôlées (depuis la console) : on tente
  // de démarrer directement, sans repasser par l'écran de code redondant.
  useEffect(() => {
    if (!autoAttempted && channel && phase === 'lobby' && teams.length > 0) {
      setAutoAttempted(true);
      loadNextQuestion(gameId, startQuestion, setLoadError);
    }
  }, [autoAttempted, channel, phase, teams.length, gameId, startQuestion]);

  // Timer local (le vrai départage de rapidité se fait côté serveur sur les timestamps d'insertion)
  useEffect(() => {
    if (phase !== 'question') return;
    if (secondsLeft <= 0 || answeredTeamIds.size === teams.length) {
      reveal();
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, secondsLeft, answeredTeamIds, teams.length]);

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

    const results = scoreClassique(submitted as any, question.correct_choice);

    // Met à jour les scores en base
    for (const r of results) {
      await supabase.rpc('increment_team_score', { p_team_id: r.teamId, p_points: r.points });
    }

    channel?.send({ type: 'broadcast', event: 'answers:revealed', payload: { results } });

    // Recharge les scores locaux
    const { data: refreshedTeams } = await supabase.from('teams').select('*').eq('game_id', gameId);
    if (refreshedTeams) setTeams(refreshedTeams as Team[]);
  }, [question, channel, gameId]);

  return (
    <main style={styles.page}>
      <a href="/" style={styles.backLink}>← Retour</a>

      {phase === 'lobby' && (
        <div style={styles.lobbyCard}>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>Rejoignez la partie</h1>
          <div style={styles.joinCode}>{joinCode}</div>
          <p style={{ color: '#7a819c' }}>
            Sur votre appareil : {typeof window !== 'undefined' ? window.location.origin : ''}/join
          </p>

          <div style={styles.teamsGrid}>
            {teams.map((t) => (
              <div key={t.id} style={{ ...styles.teamChip, borderColor: t.color }}>
                <span style={{ fontSize: 20 }}>{t.avatar}</span> {t.name}
                <button
                  onClick={() => supabase.from('teams').delete().eq('id', t.id).then()}
                  title="Déconnecter l'équipe"
                  style={styles.disconnectBtn}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {loadError && (
            <p style={{ color: '#ff7a68', fontSize: 14, margin: '12px 0', maxWidth: 420, marginInline: 'auto' }}>
              {loadError}
            </p>
          )}

          {teams.length > 0 && (
            <button
              style={styles.startBtn}
              onClick={() => {
                setLoadError(null);
                loadNextQuestion(gameId, startQuestion, setLoadError);
              }}
            >
              Démarrer la partie ({teams.length} équipes)
            </button>
          )}
        </div>
      )}

      {(phase === 'question' || phase === 'revealed') && question && (
        <div style={styles.mainCard}>
          <div style={styles.qHead}>
            <span style={styles.qTag}>Question</span>
            {phase === 'question' && <div style={styles.timer}>{secondsLeft}s</div>}
          </div>
          <div style={styles.questionText}>{question.prompt}</div>

          <div style={styles.choices}>
            {(['a', 'b', 'c', 'd'] as const).map((letter) => (
              <div
                key={letter}
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

          <div style={styles.teamsRow}>
            {teams.map((t) => {
              const hasAnswered = answeredTeamIds.has(t.id);
              return (
                <div
                  key={t.id}
                  style={{
                    ...styles.teamTile,
                    ...(phase === 'question' && hasAnswered ? styles.teamAnswered : {}),
                    ...(phase === 'revealed' ? { borderColor: t.color, background: t.color + '22' } : {}),
                  }}
                >
                  <span>{t.avatar}</span> {t.name} — {t.score} pts
                </div>
              );
            })}
          </div>

          {phase === 'revealed' && (
            <>
              {loadError && (
                <p style={{ color: '#ff7a68', fontSize: 14, marginBottom: 12 }}>{loadError}</p>
              )}
              <button
                style={styles.startBtn}
                onClick={() => {
                  setLoadError(null);
                  loadNextQuestion(gameId, startQuestion, setLoadError);
                }}
              >
                Question suivante
              </button>
            </>
          )}
        </div>
      )}
    </main>
  );
}

// Charge une question au hasard parmi les niveaux/catégories configurés pour la partie
async function loadNextQuestion(
  gameId: string,
  startQuestion: (q: Question) => void,
  onError: (msg: string) => void
) {
  const { data: game } = await supabase.from('games').select('level_ids, category_ids').eq('id', gameId).single();

  let query = supabase.from('questions').select('*').eq('validated', true);

  if (game?.level_ids?.length) {
    query = query.in('level_id', game.level_ids);
  }
  if (game?.category_ids?.length) {
    query = query.in('category_id', game.category_ids);
  }

  const { data: pool, error } = await query;

  if (error) {
    onError(`Erreur lors du chargement des questions : ${error.message}`);
    return;
  }
  if (!pool || pool.length === 0) {
    onError(
      "Aucune question disponible pour ce niveau/ces catégories. Ajoute des questions validées (validated = true) dans la table `questions` — voir le README."
    );
    return;
  }

  const randomQuestion = pool[Math.floor(Math.random() * pool.length)];
  startQuestion(randomQuestion as Question);
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    fontFamily: 'Inter, sans-serif',
    background: '#f4f6fb',
    minHeight: '100vh',
    padding: 32,
  },
  backLink: {
    position: 'fixed',
    top: 20,
    left: 24,
    color: '#7a819c',
    fontWeight: 700,
    fontSize: 14,
    textDecoration: 'none',
    zIndex: 20,
  },
  lobbyCard: {
    maxWidth: 600,
    margin: '60px auto',
    textAlign: 'center',
    background: '#fff',
    borderRadius: 24,
    padding: 40,
    boxShadow: '0 10px 30px -12px rgba(31,36,64,0.12)',
  },
  joinCode: {
    fontSize: 48,
    fontWeight: 800,
    letterSpacing: 6,
    margin: '16px 0',
    color: '#6c7bf7',
  },
  teamsGrid: { display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', margin: '24px 0' },
  teamChip: {
    border: '2px solid',
    borderRadius: 999,
    padding: '6px 8px 6px 14px',
    fontWeight: 700,
    fontSize: 14,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  disconnectBtn: {
    border: 'none',
    background: 'rgba(0,0,0,0.06)',
    borderRadius: '50%',
    width: 20,
    height: 20,
    fontSize: 11,
    lineHeight: '20px',
    cursor: 'pointer',
    color: '#7a819c',
    padding: 0,
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
    margin: '0 auto',
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
