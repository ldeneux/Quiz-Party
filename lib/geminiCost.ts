// Estimation du coût Gemini AVANT de lancer une génération (affichée dans la fenêtre de confirmation)
// et calcul du coût réel APRÈS (à partir des tokens renvoyés par l'API).
//
// Les tarifs sont ceux du modèle économique par défaut (cf. lib/gemini.ts). Si Google change ses prix,
// ajuste NEXT_PUBLIC_GEMINI_PRICE_IN / NEXT_PUBLIC_GEMINI_PRICE_OUT (en $ par million de tokens)
// et NEXT_PUBLIC_USD_EUR dans .env.local — pas besoin de toucher au code.

export const GEMINI_PRICING = {
  inputPerM: Number(process.env.NEXT_PUBLIC_GEMINI_PRICE_IN ?? 0.3),
  outputPerM: Number(process.env.NEXT_PUBLIC_GEMINI_PRICE_OUT ?? 2.5),
  usdToEur: Number(process.env.NEXT_PUBLIC_USD_EUR ?? 0.93),
};

// Réglages de génération partagés avec lib/gemini.ts : ils déterminent à la fois le coût et la fiabilité.
export const GENERATION = {
  chunkSize: 15, // questions par appel : au-delà, la réponse risque d'être tronquée (appel payé pour rien)
  avoidCap: 40, // anciennes questions envoyées à Gemini pour qu'il ne les répète pas
  baseInputTokens: 330, // consigne
  tokensPerAvoidPrompt: 24,
  tokensPerQuestionOut: 230, // question + 4 choix + explication + JSON (estimation prudente)
};

export type CostEstimate = {
  packs: number;
  questions: number;
  calls: number;
  inputTokens: number;
  outputTokens: number;
  usd: number;
  eur: number;
};

export const tokensToUsd = (inputTokens: number, outputTokens: number) =>
  (inputTokens / 1e6) * GEMINI_PRICING.inputPerM + (outputTokens / 1e6) * GEMINI_PRICING.outputPerM;

// pairs : pour chaque pack à compléter, le nombre de questions déjà en base (sert au calcul des tokens d'entrée)
export function estimateGeminiCost(pairs: { existing: number }[], perPack: number): CostEstimate {
  let calls = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  for (const { existing } of pairs) {
    let remaining = perPack;
    let known = existing;
    while (remaining > 0) {
      const n = Math.min(GENERATION.chunkSize, remaining);
      inputTokens += GENERATION.baseInputTokens + Math.min(known, GENERATION.avoidCap) * GENERATION.tokensPerAvoidPrompt;
      outputTokens += n * GENERATION.tokensPerQuestionOut;
      known += n;
      remaining -= n;
      calls += 1;
    }
  }
  const usd = tokensToUsd(inputTokens, outputTokens);
  return { packs: pairs.length, questions: pairs.length * perPack, calls, inputTokens, outputTokens, usd, eur: usd * GEMINI_PRICING.usdToEur };
}

export const formatEur = (v: number) => (v < 0.01 ? '< 0,01' : v.toFixed(2).replace('.', ',')) + '€';
export const formatUsd = (v: number) => (v < 0.01 ? '< 0,01' : v.toFixed(2).replace('.', ',')) + '$';
