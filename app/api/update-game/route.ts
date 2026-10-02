import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Mise à jour d'une partie côté serveur (service role).
// Pourquoi : la table `games` n'a qu'une politique RLS en lecture. Les
// `update` faits depuis le navigateur (clé anon) étaient donc refusés
// SANS erreur (0 ligne modifiée) : profile_id / mode n'étaient jamais
// enregistrés après la création de la partie.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const gameId: string | undefined = body.gameId;
  if (!gameId) {
    return NextResponse.json({ error: 'gameId manquant' }, { status: 400 });
  }

  // Liste blanche des champs modifiables depuis la console
  const update: Record<string, unknown> = {};
  if ('mode' in body) update.mode = body.mode;
  if ('profileId' in body) update.profile_id = body.profileId || null;
  // Habillage choisi par l'animateur : détermine les équipes proposées aux joueurs
  if (typeof body.visualTheme === 'string' && body.visualTheme) update.visual_theme = body.visualTheme;
  if (body.resetCamembert) update.camembert_categories = [];

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Aucun champ à mettre à jour' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('games')
    .update(update)
    .eq('id', gameId)
    .select('id, mode, profile_id, visual_theme')
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Partie introuvable' }, { status: 404 });

  return NextResponse.json({ game: data });
}
