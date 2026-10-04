// Génération de questions via l'API Gemini.
//
// Choix de coûts (on optimise TOUJOURS le coût Gemini) :
// - Modèle par défaut : gemini-3.5-flash-lite — le plus économique pour cette tâche factuelle
//   (~0.30 $/M tokens en entrée, 2.50 $/M en sortie). Pour en changer : GEMINI_MODEL dans .env.local.
// - Génération en BATCH : un appel produit jusqu'à `chunkSize` (15) questions d'un coup, jamais une question
//   par appel. Au-delà, la sortie dépasse le plafond de tokens et serait tronquée : on paierait pour une
//   réponse inexploitable. 30 questions = 2 appels.
// - Sortie structurée (responseSchema) : le JSON est garanti valide et `correct_choice` ne peut être
//   que a/b/c/d. Plus d'appels perdus pour un JSON illisible ni de lettre invalide en base.
// - Aucun appel de relance « pour compléter » : si quelques questions sont écartées (doublons, réponse
//   invalide), on garde les autres et on l'indique, plutôt que de payer un nouvel appel.
// - Anti-doublons : les dernières questions existantes sont transmises à Gemini (quelques centaines de
//   tokens d'entrée, négligeables) ET toute question trop proche d'une question déjà en base est écartée
//   avant l'insertion.
// - Les questions sont stockées en base et réutilisées sans nouvel appel : le coût est payé une seule fois.
// - Option GEMINI_THINKING_BUDGET=0 : coupe les tokens de « réflexion » facturés comme sortie, si le modèle
//   choisi les active par défaut.

import { GENERATION, tokensToUsd } from './geminiCost';

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-3.5-flash-lite';

export type GeneratedQuestion = {
  prompt: string;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string;
  correct_choice: 'a' | 'b' | 'c' | 'd';
  explanation: string;
};

export type GenerationLevel = { label: string; isSchool: boolean };
export type GenerationResult = {
  questions: GeneratedQuestion[];
  duplicatesSkipped: number;
  invalidSkipped: number;
  calls: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  warnings: string[];
};

// ───────────── Outils de texte ─────────────
export const normalizeText = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const wordSet = (s: string) => new Set(normalizeText(s).split(' ').filter((w) => w.length > 2));

// Deux énoncés sont « les mêmes » s'ils sont identiques une fois normalisés, ou très proches (mots communs)
export function isNearDuplicate(a: string, b: string): boolean {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const A = wordSet(a);
  const B = wordSet(b);
  if (A.size < 4 || B.size < 4) return false;
  let common = 0;
  A.forEach((w) => B.has(w) && common++);
  return common / (A.size + B.size - common) >= 0.8;
}

// ───────────── Lecture robuste de la réponse ─────────────
// Récupère les objets JSON COMPLETS d'un tableau, même si la fin a été tronquée : ce qui a déjà été payé est gardé.
function salvageObjects(raw: string): unknown[] {
  const start = raw.indexOf('[');
  if (start < 0) return [];
  const out: unknown[] = [];
  let depth = 0;
  let inStr = false;
  let esc = false;
  let objStart = -1;
  for (let i = start + 1; i < raw.length; i++) {
    const ch = raw[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === '{') {
      if (depth === 0) objStart = i;
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && objStart >= 0) {
        try {
          out.push(JSON.parse(raw.slice(objStart, i + 1)));
        } catch {
          // objet abîmé : ignoré
        }
        objStart = -1;
      }
    }
  }
  return out;
}

function parseResponse(rawText: string): unknown[] {
  const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // on tente la récupération partielle
  }
  return salvageObjects(cleaned);
}

// Normalise une question brute ; renvoie null si elle est inexploitable.
// `correct_choice` est une colonne char(1) : n'importe quoi d'autre qu'une lettre a-d est converti ou refusé.
function normalizeQuestion(q: any): GeneratedQuestion | null {
  if (!q || typeof q !== 'object') return null;
  const s = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  const prompt = s(q.prompt);
  const choices = [s(q.choice_a), s(q.choice_b), s(q.choice_c), s(q.choice_d)];
  if (!prompt || choices.some((c) => !c)) return null;

  const raw = s(q.correct_choice).toLowerCase();
  let letter: 'a' | 'b' | 'c' | 'd' | null = null;
  if (/^[abcd]$/.test(raw)) letter = raw as 'a';
  else if (/^[abcd][\s).:\-]/.test(raw)) letter = raw[0] as 'a';
  else {
    const idx = choices.findIndex((c) => normalizeText(c) === normalizeText(raw));
    if (idx >= 0) letter = 'abcd'[idx] as 'a';
  }
  if (!letter) return null;

  return { prompt, choice_a: choices[0], choice_b: choices[1], choice_c: choices[2], choice_d: choices[3], correct_choice: letter, explanation: s(q.explanation) };
}

// ───────────── Appel Gemini ─────────────
const QUESTION_SCHEMA = {
  type: 'ARRAY',
  items: {
    type: 'OBJECT',
    properties: {
      prompt: { type: 'STRING' },
      choice_a: { type: 'STRING' },
      choice_b: { type: 'STRING' },
      choice_c: { type: 'STRING' },
      choice_d: { type: 'STRING' },
      correct_choice: { type: 'STRING', enum: ['a', 'b', 'c', 'd'] },
      explanation: { type: 'STRING' },
    },
    required: ['prompt', 'choice_a', 'choice_b', 'choice_c', 'choice_d', 'correct_choice', 'explanation'],
  },
};

function buildPrompt(level: GenerationLevel, categoryName: string, count: number, avoid: string[]) {
  const audience = level.isSchool
    ? `élèves de la classe de « ${level.label} » dans le système scolaire français (école primaire, collège ou lycée selon la classe). « ${level.label} » désigne bien la classe scolaire — par exemple « Première » est la classe de Première du lycée, pas « la première fois ». Respecte le programme et le niveau de cette classe`
    : `un public de niveau « ${level.label} »`;

  const avoidBlock = avoid.length
    ? `\nQuestions déjà existantes, à ne répéter NI reformuler (traite d'autres sujets) :\n${avoid.map((p) => `- ${p.slice(0, 110)}`).join('\n')}\n`
    : '';

  return `Tu génères des questions de quiz en français pour une application éducative, destinées à ${audience}, sur le thème « ${categoryName} ».

Génère exactement ${count} questions à choix multiples, chacune avec :
- "prompt" : l'énoncé
- "choice_a", "choice_b", "choice_c", "choice_d" : 4 propositions plausibles
- "correct_choice" : UNIQUEMENT la lettre "a", "b", "c" ou "d"
- "explanation" : 1 à 2 phrases qui justifient la bonne réponse et apportent un complément intéressant

Contraintes : difficulté et vocabulaire adaptés au public, faits exacts, questions variées.${avoidBlock}`;
}

async function callGemini(prompt: string, count: number) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY manquante dans les variables d'environnement.");

  const generationConfig: Record<string, unknown> = {
    temperature: 0.9,
    maxOutputTokens: Math.min(count * 320 + 400, 8192),
    responseMimeType: 'application/json',
    responseSchema: QUESTION_SCHEMA,
  };
  if (process.env.GEMINI_THINKING_BUDGET !== undefined && process.env.GEMINI_THINKING_BUDGET !== '') {
    generationConfig.thinkingConfig = { thinkingBudget: Number(process.env.GEMINI_THINKING_BUDGET) };
  }

  // Un appel refusé (429 / 5xx) n'est pas facturé : on réessaie deux fois avec une courte pause.
  let lastErr = '';
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig }),
    });
    if (response.ok) return response.json();
    const errText = await response.text();
    lastErr = `Erreur Gemini (${response.status}) : ${errText.slice(0, 300)}`;
    if (![429, 500, 503].includes(response.status)) break;
    await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
  }
  throw new Error(lastErr);
}

// existingPrompts : questions déjà en base pour ce couple niveau × catégorie (les plus récentes en dernier)
export async function generateQuestionsViaGemini(
  level: GenerationLevel,
  categoryName: string,
  count: number,
  existingPrompts: string[]
): Promise<GenerationResult> {
  const result: GenerationResult = { questions: [], duplicatesSkipped: 0, invalidSkipped: 0, calls: 0, inputTokens: 0, outputTokens: 0, costUsd: 0, warnings: [] };
  const known = [...existingPrompts];
  let remaining = count;

  while (remaining > 0) {
    const n = Math.min(GENERATION.chunkSize, remaining);
    const prompt = buildPrompt(level, categoryName, n, known.slice(-GENERATION.avoidCap));
    const data = await callGemini(prompt, n);
    result.calls += 1;
    result.inputTokens += data?.usageMetadata?.promptTokenCount ?? 0;
    result.outputTokens += (data?.usageMetadata?.candidatesTokenCount ?? 0) + (data?.usageMetadata?.thoughtsTokenCount ?? 0);

    const candidate = data?.candidates?.[0];
    const rawText: string | undefined = candidate?.content?.parts?.map((p: any) => p?.text ?? '').join('');
    if (!rawText) throw new Error('Réponse Gemini vide ou inattendue.');
    if (candidate?.finishReason === 'MAX_TOKENS') result.warnings.push('Réponse coupée : seules les questions complètes ont été conservées.');

    const items = parseResponse(rawText);
    if (items.length === 0) throw new Error(`Réponse Gemini illisible : ${rawText.slice(0, 160)}…`);

    for (const item of items) {
      const q = normalizeQuestion(item);
      if (!q) {
        result.invalidSkipped += 1;
        continue;
      }
      if (known.some((p) => isNearDuplicate(p, q.prompt))) {
        result.duplicatesSkipped += 1;
        continue;
      }
      result.questions.push(q);
      known.push(q.prompt);
    }
    remaining -= n;
  }

  result.costUsd = tokensToUsd(result.inputTokens, result.outputTokens);
  if (result.questions.length === 0) throw new Error('Aucune question exploitable (doublons ou réponses invalides).');
  return result;
}
