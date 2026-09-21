// Moteur de scoring — V1 : mode CLASSIQUE complet.
// Les autres modes (DÉFI, SURVIE, PARTICIPATIF) viendront
// ajouter leur propre fonction ici, appelée selon
// game_rounds_meta.mode.

export type SubmittedAnswer = {
  teamId: string;
  choice: 'a' | 'b' | 'c' | 'd' | null;
  responseTimeMs: number | null; // null si pas de réponse dans le temps imparti
};

export type ScoreResult = {
  teamId: string;
  isCorrect: boolean;
  points: number;
};

/**
 * Mode CLASSIQUE
 * - 1 point par bonne réponse
 * - Bonus de rapidité aux 3 premières bonnes réponses : +3 / +2 / +1
 * - Objectif : 150 points pour gagner la partie
 */
export function scoreClassique(
  answers: SubmittedAnswer[],
  correctChoice: 'a' | 'b' | 'c' | 'd'
): ScoreResult[] {
  // On ne classe par rapidité que parmi les bonnes réponses
  const correctAnswers = answers
    .filter((a) => a.choice === correctChoice && a.responseTimeMs !== null)
    .sort((a, b) => a.responseTimeMs! - b.responseTimeMs!);

  const speedBonus: Record<number, number> = { 0: 3, 1: 2, 2: 1 };

  return answers.map((a) => {
    const isCorrect = a.choice === correctChoice;
    let points = 0;

    if (isCorrect) {
      points += 1; // point de base
      const rank = correctAnswers.findIndex((c) => c.teamId === a.teamId);
      if (rank >= 0 && speedBonus[rank] !== undefined) {
        points += speedBonus[rank];
      }
    }

    return { teamId: a.teamId, isCorrect, points };
  });
}

export const CLASSIQUE_TARGET_SCORE = 150;

/**
 * Mode DÉFI
 * - L'équipe qui défie (challengerTeamId) choisit le thème ET répond aussi
 * - Elle gagne +3 pts par bonne réponse, mais ne perd jamais de points sur
 *   son propre défi (mauvaise réponse = 0, jamais de malus)
 * - Chaque adversaire qui répond juste : neutre (ni gain ni perte)
 * - Chaque adversaire qui se trompe : -2 pts, reversés à l'équipe qui a lancé le défi
 *
 * NOTE : suppose un tour par tour (une équipe = challenger sur cette question).
 * Nécessite un écran dédié pour désigner le challenger à chaque round.
 */
export function scoreDefi(
  answers: SubmittedAnswer[],
  correctChoice: 'a' | 'b' | 'c' | 'd',
  challengerTeamId: string
): ScoreResult[] {
  let challengerBonus = 0;

  const opponentResults = answers
    .filter((a) => a.teamId !== challengerTeamId)
    .map((a) => {
      const isCorrect = a.choice === correctChoice;
      if (!isCorrect) {
        challengerBonus += 2; // volé à l'adversaire, reversé au challenger
        return { teamId: a.teamId, isCorrect, points: -2 };
      }
      return { teamId: a.teamId, isCorrect, points: 0 };
    });

  const challengerAnswer = answers.find((a) => a.teamId === challengerTeamId);
  const challengerCorrect = challengerAnswer?.choice === correctChoice;
  const challengerPoints = (challengerCorrect ? 3 : 0) + challengerBonus;

  return [
    { teamId: challengerTeamId, isCorrect: challengerCorrect, points: challengerPoints },
    ...opponentResults,
  ];
}

/**
 * Mode SURVIE
 * - 3 vies par équipe au départ (stockées sur teams.lives)
 * - Mauvaise réponse ou absence de réponse = perte d'une vie
 * - Points aux équipes éliminées CE round = (nb d'équipes déjà éliminées
 *   avant ce round) + 1, appliqué à toutes les équipes éliminées ce round
 * - Les équipes déjà éliminées (lives <= 0) ne répondent plus
 */
export type SurvieResult = {
  teamId: string;
  isCorrect: boolean | null; // null = équipe déjà éliminée, n'a pas joué ce round
  livesRemaining: number;
  justEliminated: boolean;
  points: number;
};

export function scoreSurvie(
  answers: SubmittedAnswer[],
  correctChoice: 'a' | 'b' | 'c' | 'd',
  currentLives: Record<string, number>,
  eliminatedBeforeThisRound: number
): SurvieResult[] {
  const results: SurvieResult[] = [];
  let newlyEliminatedCount = 0;

  for (const teamId of Object.keys(currentLives)) {
    const livesBefore = currentLives[teamId];

    if (livesBefore <= 0) {
      results.push({ teamId, isCorrect: null, livesRemaining: 0, justEliminated: false, points: 0 });
      continue;
    }

    const answer = answers.find((a) => a.teamId === teamId);
    const isCorrect = answer?.choice === correctChoice;
    const livesRemaining = isCorrect ? livesBefore : livesBefore - 1;
    const justEliminated = livesRemaining <= 0;

    if (justEliminated) newlyEliminatedCount++;

    results.push({ teamId, isCorrect, livesRemaining: Math.max(livesRemaining, 0), justEliminated, points: 0 });
  }

  // Les points ne peuvent être calculés qu'une fois tous les éliminés du
  // round connus (même formule pour tous ceux éliminés ce round-ci)
  const pointsThisRound = eliminatedBeforeThisRound + 1;
  return results.map((r) => (r.justEliminated ? { ...r, points: pointsThisRound } : r));
}

/**
 * Mode PARTICIPATIF
 * - Cagnotte commune, part = nombre total d'équipes
 * - Elle double à chaque bonne réponse en chaîne (un seul joueur répond
 *   par tour, à tour de rôle)
 * - Dès qu'une équipe se trompe, la cagnotte accumulée est divisée par le
 *   nombre TOTAL d'équipes (pas seulement celles qui ont joué) et
 *   redistribuée à toutes
 * - Continue jusqu'à ce que chaque équipe ait joué 3 fois
 *
 * NOTE : suppose un tour par tour. Nécessite un écran dédié.
 */
/**
 * Mode CAMEMBERTS
 * - 3 bonnes réponses d'affilée dans une catégorie = 1 part gagnée (définitive)
 * - Une mauvaise réponse alors qu'il y a une progression en cours (1 ou 2/3)
 *   remet à zéro CETTE catégorie — sauf protection par un Joker (géré côté appelant)
 * - +10 pts par part gagnée, +50 pts bonus pour la première équipe qui a
 *   toutes ses parts
 * - Jokers : 1 gagné par part complétée, plafond 3, utilisables sur
 *   n'importe quelle catégorie
 */
export function applyCamembertAnswer(
  isCorrect: boolean,
  currentStreak: number
): { newStreak: number; justWon: boolean; wouldReset: boolean } {
  if (isCorrect) {
    const newStreak = currentStreak + 1;
    if (newStreak >= 3) {
      return { newStreak: 0, justWon: true, wouldReset: false };
    }
    return { newStreak, justWon: false, wouldReset: false };
  }
  if (currentStreak > 0) {
    return { newStreak: currentStreak, justWon: false, wouldReset: true };
  }
  return { newStreak: 0, justWon: false, wouldReset: false };
}

export const CAMEMBERT_POINTS_PER_WEDGE = 10;
export const CAMEMBERT_WIN_BONUS = 50;
export const CAMEMBERT_MAX_JOKERS = 3;
export const CAMEMBERT_JOKER_WINDOW_SECONDS = 10;

export type ParticipatifState = {
  pot: number;
  teamCount: number;
};

export function scoreParticipatifTurn(
  isCorrect: boolean,
  state: ParticipatifState
): { newState: ParticipatifState; payout: Record<string, number> | null } {
  if (isCorrect) {
    return { newState: { ...state, pot: state.pot * 2 }, payout: null };
  }

  // Échec : on redistribue la cagnotte accumulée à toutes les équipes
  const share = state.pot / state.teamCount;
  return {
    newState: { pot: state.teamCount, teamCount: state.teamCount }, // reset à la mise de départ
    payout: { share } as any, // le caller distribue `share` à chaque équipe
  };
}
