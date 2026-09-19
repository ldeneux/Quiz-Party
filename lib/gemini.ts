// Génération de questions via l'API Gemini.
//
// Choix de coûts (cf. discussion) :
// - Modèle par défaut : gemini-2.0-flash, le plus économique pour ce
//   type de tâche factuelle. Configurable via GEMINI_MODEL si besoin.
// - Génération en BATCH : un seul appel génère tout le pack d'un coup
//   (ex. 3 ou 10 questions), jamais un appel par question ni par joueur.
// - Les questions générées sont ensuite stockées en base et réutilisées
//   à volonté sans nouvel appel — le coût est donc figé une fois pour
//   toutes à la création du pack, jamais pendant une partie.

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';

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
          maxOutputTokens: 2048,
        },
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Erreur Gemini (${response.status}) : ${errText}`);
  }

  const data = await response.json();
  const rawText: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;

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
