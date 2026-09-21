import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateQuestionsViaGemini } from '@/lib/gemini';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { levelId, levelLabel, categoryId, categoryName, count = 3 } = body;

  if (!levelId || !categoryId) {
    return NextResponse.json({ error: 'levelId et categoryId sont requis.' }, { status: 400 });
  }

  // 1) Réutilise un pack existant pour ce couple niveau/catégorie s'il y en
  //    a déjà un (les nouvelles questions viennent le compléter), sinon en crée un.
  const { data: existingPack } = await supabaseAdmin
    .from('question_packs')
    .select('*')
    .eq('level_id', levelId)
    .eq('category_id', categoryId)
    .limit(1)
    .maybeSingle();

  let pack = existingPack;
  if (!pack) {
    const { data: newPack, error: packError } = await supabaseAdmin
      .from('question_packs')
      .insert({ name: `${levelLabel} · ${categoryName}`, level_id: levelId, category_id: categoryId })
      .select()
      .single();

    if (packError || !newPack) {
      return NextResponse.json({ error: packError?.message ?? 'Erreur création du pack' }, { status: 500 });
    }
    pack = newPack;
  }

  // 2) Génère les questions via Gemini (un seul appel batch)
  let questions;
  try {
    questions = await generateQuestionsViaGemini(levelLabel, categoryName, count);
  } catch (e: any) {
    // On garde le pack (vide) plutôt que de le supprimer : l'utilisateur
    // peut réessayer la génération depuis l'écran Paramétrage.
    return NextResponse.json({ error: e.message, pack }, { status: 500 });
  }

  // 3) Insère les questions générées, rattachées au pack
  const rows = questions.map((q) => ({
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

  if (insertError) {
    return NextResponse.json({ error: insertError.message, pack }, { status: 500 });
  }

  return NextResponse.json({ pack, questionCount: rows.length, merged: !!existingPack });
}
