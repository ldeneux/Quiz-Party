import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateQuestionsViaGemini, isNearDuplicate } from '@/lib/gemini';

export const maxDuration = 60; // secondes (Vercel) : un appel Gemini de 15 questions peut prendre 10 à 25 s

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// Complète le pack du couple (niveau, catégorie) avec de NOUVELLES questions (ajout, jamais remplacement).
// Le niveau et la catégorie sont relus en base : libellé, « niveau scolaire »… ne viennent pas du navigateur.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { levelId, categoryId } = body;
  // L'écran envoie des lots de 15 questions max (1 appel Gemini par requête) : jamais de réponse tronquée ni de dépassement de durée
  const count = Math.max(1, Math.min(Number(body.count) || 15, 15));

  if (!levelId || !categoryId) {
    return NextResponse.json({ error: 'levelId et categoryId sont requis.' }, { status: 400 });
  }

  const [{ data: level }, { data: category }] = await Promise.all([
    supabaseAdmin.from('difficulty_levels').select('*').eq('id', levelId).maybeSingle(),
    supabaseAdmin.from('categories').select('*').eq('id', categoryId).maybeSingle(),
  ]);
  if (!level || !category) return NextResponse.json({ error: 'Niveau ou catégorie introuvable.' }, { status: 404 });

  // Questions déjà en base pour ce couple (pour ne pas les redemander ni les dupliquer)
  const { data: existingRows } = await supabaseAdmin
    .from('questions')
    .select('prompt')
    .eq('category_id', categoryId)
    .eq('level_id', levelId)
    .order('created_at', { ascending: true })
    .limit(3000);
  const existingPrompts = (existingRows ?? []).map((r: any) => r.prompt as string);

  // 1) On génère D'ABORD : un échec ne laisse donc pas de pack vide derrière lui
  let result;
  try {
    result = await generateQuestionsViaGemini({ label: level.label, isSchool: !!level.is_school }, category.name, count, existingPrompts);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }

  // 2) Pack du couple : réutilisé s'il existe, créé sinon
  const { data: existingPack } = await supabaseAdmin
    .from('question_packs')
    .select('*')
    .eq('level_id', levelId)
    .eq('category_id', categoryId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  let pack = existingPack;
  if (!pack) {
    const { data: newPack, error: packError } = await supabaseAdmin
      .from('question_packs')
      .insert({ name: `${level.label} · ${category.name}`, level_id: levelId, category_id: categoryId })
      .select()
      .single();
    if (packError || !newPack) return NextResponse.json({ error: packError?.message ?? 'Erreur création du pack' }, { status: 500 });
    pack = newPack;
  }

  // 3) Dernier filet anti-doublon (au cas où une question aurait été ajoutée entre-temps), puis insertion en un seul lot
  const fresh = result.questions.filter((q) => !existingPrompts.some((p) => isNearDuplicate(p, q.prompt)));
  const rows = fresh.map((q) => ({
    pack_id: pack.id,
    category_id: categoryId,
    level_id: levelId,
    prompt: q.prompt,
    choice_a: q.choice_a,
    choice_b: q.choice_b,
    choice_c: q.choice_c,
    choice_d: q.choice_d,
    correct_choice: q.correct_choice,
    explanation: q.explanation,
    validated: true,
  }));
  const { error: insertError } = await supabaseAdmin.from('questions').insert(rows);
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  return NextResponse.json({
    pack,
    added: rows.length,
    duplicatesSkipped: result.duplicatesSkipped + (result.questions.length - fresh.length),
    invalidSkipped: result.invalidSkipped,
    calls: result.calls,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    costUsd: result.costUsd,
    warnings: result.warnings,
  });
}
