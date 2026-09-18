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

// --- Emplacements prêts pour les prochains modes ---
// export function scoreDefi(...) { ... }
// export function scoreSurvie(...) { ... }
// export function scoreParticipatif(...) { ... }
