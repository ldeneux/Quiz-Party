import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { AskKind, DeezerTrack, buildQuestion, pickDistractors, shuffle } from '@/lib/deezer';

// Proxy Deezer (l'API publique n'autorise pas les appels directs depuis le navigateur) + création de questions « blind test ».
// Gratuit et sans compte : seuls les aperçus de 30 s sont utilisés, jamais stockés.
export const dynamic = 'force-dynamic';

const DEEZER = 'https://api.deezer.com';

async function deezer(path: string): Promise<any> {
  const res = await fetch(`${DEEZER}${path}`, { cache: 'no-store', signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Deezer a répondu ${res.status}`);
  const json = await res.json();
  if (json?.error) throw new Error(json.error.message ?? 'Erreur Deezer');
  return json;
}

function slim(t: any): DeezerTrack {
  return {
    id: t.id,
    title: t.title,
    titleShort: t.title_short || t.title,
    preview: t.preview || '',
    link: t.link || `https://www.deezer.com/track/${t.id}`,
    artist: { id: t.artist?.id, name: t.artist?.name ?? '' },
    album: { title: t.album?.title ?? '', cover: t.album?.cover_medium ?? t.album?.cover ?? '' },
    year: typeof t.release_date === 'string' && t.release_date.length >= 4 ? t.release_date.slice(0, 4) : undefined,
  };
}

// GET /api/deezer?search=...  -> liste de morceaux ; GET /api/deezer?track=ID -> un morceau (aperçu frais)
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  try {
    const q = params.get('search');
    if (q) {
      const json = await deezer(`/search?q=${encodeURIComponent(q)}&limit=15`);
      const tracks = (json.data ?? []).map(slim).filter((t: DeezerTrack) => t.preview);
      return NextResponse.json({ tracks });
    }
    const id = params.get('track');
    if (id && /^\d+$/.test(id)) {
      const track = slim(await deezer(`/track/${id}`));
      return NextResponse.json({ track });
    }
    return NextResponse.json({ error: 'Paramètre manquant (search ou track).' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Deezer injoignable' }, { status: 502 });
  }
}

// POST /api/deezer { trackId, ask: 'artist' | 'title', categoryId, levelId } -> crée la question dans le pack « Blind test · <catégorie> »
export async function POST(req: NextRequest) {
  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  try {
    const { trackId, ask, categoryId, levelId } = (await req.json()) as {
      trackId: number | string;
      ask: AskKind;
      categoryId: string;
      levelId: string;
    };
    if (!trackId || !categoryId || !levelId || (ask !== 'artist' && ask !== 'title')) {
      return NextResponse.json({ error: 'Paramètres invalides.' }, { status: 400 });
    }

    const track = slim(await deezer(`/track/${trackId}`));
    if (!track.preview) return NextResponse.json({ error: "Ce morceau n'a pas d'extrait disponible." }, { status: 422 });

    // Mauvaises réponses plausibles : artistes proches (ou autres titres du même artiste), sinon les classements du moment
    let candidates: string[] = [];
    try {
      candidates =
        ask === 'artist'
          ? ((await deezer(`/artist/${track.artist.id}/related?limit=25`)).data ?? []).map((a: any) => a.name)
          : ((await deezer(`/artist/${track.artist.id}/top?limit=40`)).data ?? []).map((t: any) => t.title_short || t.title);
    } catch {
      /* repli ci-dessous */
    }
    const correct = ask === 'artist' ? track.artist.name : track.titleShort;
    let distractors = pickDistractors(correct, candidates, 3);
    if (distractors.length < 3) {
      const chart = await deezer(ask === 'artist' ? '/chart/0/artists?limit=50' : '/chart/0/tracks?limit=50');
      const names = (chart.data ?? []).map((x: any) => (ask === 'artist' ? x.name : x.title_short || x.title));
      distractors = [...distractors, ...pickDistractors(correct, shuffle(names), 3 - distractors.length)].slice(0, 3);
    }
    if (distractors.length < 3) return NextResponse.json({ error: 'Impossible de trouver 3 mauvaises réponses.' }, { status: 422 });

    const q = buildQuestion(track, ask, distractors);

    // Pack « Blind test · <catégorie> » (créé au besoin) : à ajouter à un profil dans Paramétrage
    const { data: cat } = await supabaseAdmin.from('categories').select('name').eq('id', categoryId).single();
    const packName = `Blind test · ${cat?.name ?? 'Musique'}`;
    let packId: string | undefined;
    const { data: existing } = await supabaseAdmin
      .from('question_packs')
      .select('id')
      .eq('name', packName)
      .eq('level_id', levelId)
      .eq('category_id', categoryId)
      .limit(1);
    packId = existing?.[0]?.id;
    if (!packId) {
      const { data: created, error: packError } = await supabaseAdmin
        .from('question_packs')
        .insert({ name: packName, level_id: levelId, category_id: categoryId })
        .select('id')
        .single();
      if (packError || !created) return NextResponse.json({ error: `Pack non créé : ${packError?.message}` }, { status: 500 });
      packId = created.id;
    }

    // Anti-doublon : même morceau, même type de question, même pack
    const { data: dup } = await supabaseAdmin
      .from('questions')
      .select('id')
      .eq('pack_id', packId)
      .eq('media_url', q.media_url)
      .eq('prompt', q.prompt)
      .limit(1);
    if (dup && dup.length > 0) return NextResponse.json({ error: 'Cette question existe déjà dans le pack.' }, { status: 409 });

    const { error: insertError } = await supabaseAdmin
      .from('questions')
      .insert({ ...q, category_id: categoryId, level_id: levelId, pack_id: packId, validated: true });
    if (insertError) {
      const hint = /media_url/.test(insertError.message)
        ? ' Exécute supabase/migration-015-media.sql dans l\'éditeur SQL de Supabase.'
        : '';
      return NextResponse.json({ error: `${insertError.message}.${hint}` }, { status: 500 });
    }

    const { count } = await supabaseAdmin.from('questions').select('id', { count: 'exact', head: true }).eq('pack_id', packId);
    return NextResponse.json({ ok: true, packName, packCount: count ?? 0, question: q });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Erreur inattendue' }, { status: 500 });
  }
}
