'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  scoreClassique,
  scoreSurvie,
  scoreDefi,
  applyCamembertAnswer,
  CAMEMBERT_POINTS_PER_WEDGE,
  CAMEMBERT_WIN_BONUS,
  CAMEMBERT_MAX_JOKERS,
  CAMEMBERT_JOKER_WINDOW_SECONDS,
} from '@/lib/scoring';
import type { RealtimeChannel } from '@supabase/supabase-js';

type Team = {
  id: string;
  name: string;
  avatar: string;
  color: string;
  score: number;
  lives: number;
  camembert_progress: Record<string, number>;
  camembert_won: string[];
  camembert_jokers: number;
};

type Category = { id: string; name: string; emoji: string };

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
  const [phase, setPhase] = useState<'lobby' | 'choosing-category' | 'question' | 'revealed' | 'finished'>('lobby');
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

  // --- Mode Camemberts ---
  const [wedgeCategories, setWedgeCategories] = useState<Category[]>([]);
  const wedgeCategoriesRef = useRef<Category[]>([]);
  const camembertChooserIndexRef = useRef(0);
  const [camembertChooserTeamId, setCamembertChooserTeamId] = useState<string | null>(null);
  const camembertChooserTeamIdRef = useRef<string | null>(null);
  const [camembertCategory, setCamembertCategory] = useState<Category | null>(null);
  const camembertCategoryRef = useRef<Category | null>(null);
  const [awaitingCategoryPick, setAwaitingCategoryPick] = useState(false);
  const [pendingJokerTeamIds, setPendingJokerTeamIds] = useState<string[]>([]);
  const usedJokerTeamIdsRef = useRef<Set<string>>(new Set());
  const [jokerSecondsLeft, setJokerSecondsLeft] = useState(0);
  const [camembertWinnerId, setCamembertWinnerId] = useState<string | null>(null);
  const proceedWithCategoryRef = useRef<((categoryId: string) => void) | null>(null);

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

    // Mode Camemberts : réception du choix de catégorie fait par l'équipe désignée
    ch.on('broadcast', { event: 'choose-category:pick' }, ({ payload }) => {
      if (payload.teamId === camembertChooserTeamIdRef.current) {
        proceedWithCategoryRef.current?.(payload.categoryId);
      }
    });

    // Mode Camemberts : une équipe décide d'utiliser un Joker pour se protéger
    ch.on('broadcast', { event: 'joker:use' }, ({ payload }) => {
      usedJokerTeamIdsRef.current.add(payload.teamId);
      setPendingJokerTeamIds((prev) => prev.filter((id) => id !== payload.teamId));
    });

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
        payload: {
          question: q,
          startedAt: Date.now(),
          turnTeamId: participatifTurnTeamIdRef.current,
          camembertCategory: camembertCategoryRef.current,
        },
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

  // --- Mode Camemberts ---

  const initWedgeCategoriesIfNeeded = useCallback(async () => {
    if (wedgeCategoriesRef.current.length > 0) return;

    const { data: game } = await supabase.from('games').select('profile_id, camembert_categories').eq('id', gameId).single();

    if (game?.camembert_categories && Array.isArray(game.camembert_categories) && game.camembert_categories.length > 0) {
      wedgeCategoriesRef.current = game.camembert_categories as Category[];
      setWedgeCategories(game.camembert_categories as Category[]);
      return;
    }

    let categoryIds: string[] = [];
    if (game?.profile_id) {
      const { data: profilePacks } = await supabase.from('quiz_profile_packs').select('pack_id').eq('profile_id', game.profile_id);
      const packIds = (profilePacks ?? []).map((p) => p.pack_id);
      const { data: packs } = await supabase.from('question_packs').select('category_id').in('id', packIds);
      categoryIds = Array.from(new Set((packs ?? []).map((p: any) => p.category_id).filter(Boolean)));
    }

    const n = Math.min(Math.max(teams.length, 6), 10);
    const chosenIds = categoryIds.slice(0, n);

    const { data: categoriesData } = await supabase.from('categories').select('id, name, emoji').in('id', chosenIds);
    const chosen = (categoriesData as Category[]) ?? [];

    wedgeCategoriesRef.current = chosen;
    setWedgeCategories(chosen);
    await supabase.from('games').update({ camembert_categories: chosen }).eq('id', gameId);
  }, [gameId, teams.length]);

  const pickCamembertChooser = useCallback((): Team | null => {
    if (teams.length === 0) return null;
    const idx = camembertChooserIndexRef.current % teams.length;
    camembertChooserIndexRef.current = (idx + 1) % teams.length;
    const chooser = teams[idx];
    camembertChooserTeamIdRef.current = chooser.id;
    setCamembertChooserTeamId(chooser.id);
    return chooser;
  }, [teams]);

  const categoryChoiceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startCategoryChoice = useCallback(async () => {
    await initWedgeCategoriesIfNeeded();
    const chooser = pickCamembertChooser();
    if (!chooser) return;

    const won = chooser.camembert_won ?? [];
    let available = wedgeCategoriesRef.current.filter((c) => !won.includes(c.id));
    if (available.length === 0) available = wedgeCategoriesRef.current; // sécurité, ne devrait pas arriver

    setPhase('choosing-category');
    setAwaitingCategoryPick(true);

    channel?.send({
      type: 'broadcast',
      event: 'choose-category:prompt',
      payload: { chooserTeamId: chooser.id, chooserTeamName: chooser.name, categories: available },
    });

    if (categoryChoiceTimeoutRef.current) clearTimeout(categoryChoiceTimeoutRef.current);
    categoryChoiceTimeoutRef.current = setTimeout(() => {
      proceedWithCategoryRef.current?.(available[0].id);
    }, 20000);
  }, [initWedgeCategoriesIfNeeded, pickCamembertChooser, channel]);

  const proceedWithCategory = useCallback(
    (categoryId: string) => {
      if (categoryChoiceTimeoutRef.current) {
        clearTimeout(categoryChoiceTimeoutRef.current);
        categoryChoiceTimeoutRef.current = null;
      }
      setAwaitingCategoryPick(false);
      const cat = wedgeCategoriesRef.current.find((c) => c.id === categoryId) ?? null;
      setCamembertCategory(cat);
      camembertCategoryRef.current = cat;
      setLoadError(null);
      loadNextQuestion(
        gameId,
        startQuestion,
        setLoadError,
        () => setPhase('finished'),
        askedQuestionIdsRef.current,
        categoryId
      );
    },
    [gameId, startQuestion]
  );

  useEffect(() => {
    proceedWithCategoryRef.current = proceedWithCategory;
  }, [proceedWithCategory]);


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
    if (mode === 'camembert') {
      startCategoryChoice();
      return;
    }
    setLoadError(null);
    loadNextQuestion(gameId, startQuestion, setLoadError, () => setPhase('finished'), askedQuestionIdsRef.current);
  }, [mode, pickNextChallenger, pickNextParticipatifTurn, finishParticipatif, startCategoryChoice, gameId, startQuestion]);

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

    if (mode === 'camembert') {
      const categoryId = camembertCategoryRef.current?.id;
      const immediateUpdates: { teamId: string; progress: Record<string, number>; won: string[]; jokers: number; pointsDelta: number }[] = [];
      const jokerCandidates: string[] = [];
      let winnerTeam: Team | null = null;

      for (const t of teams) {
        const answer = submitted.find((s) => s.teamId === t.id);
        const isCorrect = answer?.choice === question.correct_choice;
        const currentStreak = categoryId ? (t.camembert_progress?.[categoryId] ?? 0) : 0;
        const { newStreak, justWon, wouldReset } = applyCamembertAnswer(isCorrect, currentStreak);

        const newProgress = { ...(t.camembert_progress ?? {}) };
        const newWon = [...(t.camembert_won ?? [])];
        let newJokers = t.camembert_jokers ?? 0;
        let pointsDelta = 0;

        if (justWon && categoryId) {
          delete newProgress[categoryId];
          newWon.push(categoryId);
          pointsDelta += CAMEMBERT_POINTS_PER_WEDGE;
          newJokers = Math.min(newJokers + 1, CAMEMBERT_MAX_JOKERS);
          if (newWon.length === wedgeCategoriesRef.current.length) {
            winnerTeam = t;
            pointsDelta += CAMEMBERT_WIN_BONUS;
          }
        } else if (wouldReset && categoryId) {
          if ((t.camembert_jokers ?? 0) > 0) {
            jokerCandidates.push(t.id);
            continue; // décision différée : ne pas toucher à la progression tout de suite
          }
          newProgress[categoryId] = 0;
        } else if (categoryId) {
          newProgress[categoryId] = newStreak;
        }

        immediateUpdates.push({ teamId: t.id, progress: newProgress, won: newWon, jokers: newJokers, pointsDelta });
      }

      for (const u of immediateUpdates) {
        await supabase
          .from('teams')
          .update({ camembert_progress: u.progress, camembert_won: u.won, camembert_jokers: u.jokers })
          .eq('id', u.teamId);
        if (u.pointsDelta !== 0) {
          await supabase.rpc('increment_team_score', { p_team_id: u.teamId, p_points: u.pointsDelta });
        }
      }

      if (winnerTeam) {
        setCamembertWinnerId(winnerTeam.id);
        const { data: refreshedTeams } = await supabase.from('teams').select('*').eq('game_id', gameId);
        if (refreshedTeams) setTeams(refreshedTeams as Team[]);
        setTimeout(() => setPhase('finished'), 50);
        return;
      }

      if (jokerCandidates.length > 0 && categoryId) {
        usedJokerTeamIdsRef.current = new Set();
        setPendingJokerTeamIds(jokerCandidates);
        channel?.send({
          type: 'broadcast',
          event: 'joker:offer',
          payload: {
            teamIds: jokerCandidates,
            categoryName: camembertCategoryRef.current?.name,
            seconds: CAMEMBERT_JOKER_WINDOW_SECONDS,
          },
        });
        setJokerSecondsLeft(CAMEMBERT_JOKER_WINDOW_SECONDS);
      } else {
        const { data: refreshedTeams } = await supabase.from('teams').select('*').eq('game_id', gameId);
        if (refreshedTeams) setTeams(refreshedTeams as Team[]);
      }
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

  // Finalise la fenêtre Joker : applique la protection pour les équipes
  // qui ont répondu à temps, remet à zéro la progression des autres.
  const finalizeJokerWindow = useCallback(async () => {
    const categoryId = camembertCategoryRef.current?.id;
    if (!categoryId) {
      setPendingJokerTeamIds([]);
      return;
    }

    for (const teamId of pendingJokerTeamIds) {
      const t = teams.find((tt) => tt.id === teamId);
      if (!t) continue;

      if (usedJokerTeamIdsRef.current.has(teamId)) {
        await supabase
          .from('teams')
          .update({ camembert_jokers: Math.max((t.camembert_jokers ?? 0) - 1, 0) })
          .eq('id', teamId);
      } else {
        const newProgress = { ...(t.camembert_progress ?? {}), [categoryId]: 0 };
        await supabase.from('teams').update({ camembert_progress: newProgress }).eq('id', teamId);
      }
    }

    setPendingJokerTeamIds([]);
    usedJokerTeamIdsRef.current = new Set();

    const { data: refreshedTeams } = await supabase.from('teams').select('*').eq('game_id', gameId);
    if (refreshedTeams) setTeams(refreshedTeams as Team[]);
  }, [pendingJokerTeamIds, teams, gameId]);

  useEffect(() => {
    if (pendingJokerTeamIds.length === 0) return;
    if (jokerSecondsLeft <= 0) {
      finalizeJokerWindow();
      return;
    }
    const t = setTimeout(() => setJokerSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [pendingJokerTeamIds, jokerSecondsLeft, finalizeJokerWindow]);

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
    const winner = camembertWinnerId ? teams.find((t) => t.id === camembertWinnerId) : null;
    return (
      <div style={styles.mainCard}>
        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>🏁 Partie terminée</h2>
        {winner ? (
          <p style={{ color: '#35c2a3', fontSize: 14, fontWeight: 700, marginBottom: 20 }}>
            🥧 {winner.avatar} {winner.name} a complété tous ses camemberts !
          </p>
        ) : (
          <p style={{ color: '#7a819c', fontSize: 13.5, marginBottom: 20 }}>Voici le classement final.</p>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {ranked.map((t, i) => (
            <div key={t.id} style={{ ...styles.teamTile, borderColor: i === 0 ? '#ffb648' : '#eaedf6' }}>
              {i === 0 ? '🏆 ' : `${i + 1}. `}
              <span>{t.avatar}</span> {t.name} — <strong>{t.score} pts</strong>
              {mode === 'camembert' && (
                <span style={{ marginLeft: 8, color: '#7a819c', fontSize: 12 }}>
                  ({(t.camembert_won ?? []).length}/{wedgeCategories.length} parts)
                </span>
              )}
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

      {phase === 'choosing-category' && (
        <div style={styles.lobbyCard}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🥧</div>
          <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>
            {teams.find((t) => t.id === camembertChooserTeamId)?.name ?? 'Une équipe'} choisit une catégorie…
          </h1>
          <p style={{ color: '#7a819c', fontSize: 13.5 }}>La sélection se fait sur son téléphone.</p>
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
            {mode === 'camembert' && camembertCategory && (
              <span style={{ ...styles.qTag, background: '#eef0f8', color: '#6c7bf7' }}>
                {camembertCategory.emoji} {camembertCategory.name}
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
                  {mode === 'camembert' && t.id === camembertChooserTeamId && <span title="Choisit la catégorie">🥧 </span>}
                  <span>{t.avatar}</span> {t.name}
                  {mode === 'survie' && (
                    <span style={{ marginLeft: 6, fontSize: 12 }}>
                      {(t.lives ?? 3) > 0 ? '❤️'.repeat(t.lives ?? 3) : '💀'}
                    </span>
                  )}
                  {mode === 'camembert' && (
                    <span style={{ marginLeft: 6, fontSize: 12, color: '#7a819c' }}>
                      {(t.camembert_won ?? []).length}/{wedgeCategories.length} parts
                      {(t.camembert_jokers ?? 0) > 0 ? ` · 🃏×${t.camembert_jokers}` : ''}
                      {pendingJokerTeamIds.includes(t.id) ? ` · ⏳ décision Joker (${jokerSecondsLeft}s)` : ''}
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
              <button style={styles.startBtn} onClick={goToNextQuestion} disabled={pendingJokerTeamIds.length > 0}>
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
  askedQuestionIds: string[] = [],
  forceCategoryId?: string
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

  if (forceCategoryId) {
    pool = pool.filter((q) => q.category_id === forceCategoryId);
    if (pool.length === 0) {
      onError("Aucune question disponible pour cette catégorie précise. Ajoute des questions à ce pack dans Paramétrage.");
      return;
    }
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
