// Génération de questions via l'API Gemini.
//
// Choix de coûts (cf. discussion) :
// - Modèle par défaut : gemini-3.5-flash-lite — le plus économique disponible
//   pour ce type de tâche factuelle (~0.30 $/M tokens en entrée, 2.50 $/M en
//   sortie). gemini-2.0-flash, utilisé initialement, a été retiré par Google
//   mi-2026 ; gemini-3.6-flash existe aussi mais coûte nettement plus cher
//   (~1.50 $/M entrée, 7.50 $/M sortie) pour ce cas d'usage simple — inutile
//   ici. Si gemini-3.5-flash-lite venait à son tour à disparaître, vérifie
//   le modèle le moins cher du moment sur https://ai.google.dev/gemini-api/docs/pricing
//   et mets à jour GEMINI_MODEL dans .env.local (pas besoin de toucher au code).
// - Génération en BATCH : un seul appel génère tout le pack d'un coup
//   (ex. 3 ou 10 questions), jamais un appel par question ni par joueur.
// - Les questions générées sont ensuite stockées en base et réutilisées
//   à volonté sans nouvel appel — le coût est donc figé une fois pour
//   toutes à la création du pack, jamais pendant une partie.

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

export async function generateQuestionsViaGemini(
  levelLabel: string,
  categoryName: string,
  count: number
): Promise<GeneratedQuestion[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY manquante dans les variables d\'environnement.');
  }

  const prompt = `Tu génères des questions de quiz en français pour une application éducative destinée à des élèves de niveau "${levelLabel}", sur le thème "${categoryName}".

Génère exactement ${count} questions à choix multiples, chacune avec :
- "prompt" : l'énoncé de la question
- "choice_a", "choice_b", "choice_c", "choice_d" : 4 propositions de réponse plausibles
- "correct_choice" : la lettre de la bonne réponse ("a", "b", "c" ou "d")
- "explanation" : une explication éducative de 2 à 3 phrases qui justifie la bonne réponse et apporte un complément d'information intéressant

Contraintes :
- Adapte la difficulté et le vocabulaire au niveau "${levelLabel}"
- Les questions doivent être factuellement exactes
- Varie les questions, ne te répète pas
- Réponds UNIQUEMENT avec un tableau JSON valide, sans texte avant ni après, sans balises markdown, au format :
[{"prompt": "...", "choice_a": "...", "choice_b": "...", "choice_c": "...", "choice_d": "...", "correct_choice": "b", "explanation": "..."}]`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.9,
          // Budget dynamique : ~350 tokens/question (prompt + 4 choix + explication)
          // + marge, plafonné pour éviter un coût incontrôlé sur une erreur de saisie.
          maxOutputTokens: Math.min(count * 350 + 500, 8192),
          // Force une sortie JSON stricte : évite les balises markdown et
          // réduit fortement le risque de troncature en plein milieu du JSON.
          responseMimeType: 'application/json',
        },
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Erreur Gemini (${response.status}) : ${errText}`);
  }

  const data = await response.json();
  const candidate = data?.candidates?.[0];
  const rawText: string | undefined = candidate?.content?.parts?.[0]?.text;

  if (candidate?.finishReason === 'MAX_TOKENS') {
    throw new Error(
      `Réponse Gemini tronquée (trop de questions demandées d'un coup pour le budget de tokens). Réduis le nombre de questions par pack et réessaie.`
    );
  }

  if (!rawText) {
    throw new Error('Réponse Gemini vide ou inattendue.');
  }

  // Gemini respecte rarement 100% la consigne "pas de markdown" : on nettoie au cas où
  const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();

  let parsed: GeneratedQuestion[];
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    throw new Error(`Impossible de parser la réponse Gemini en JSON : ${cleaned.slice(0, 200)}...`);
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('Gemini n\'a renvoyé aucune question exploitable.');
  }

  return parsed;
}
