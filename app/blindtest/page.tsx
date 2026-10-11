'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { AskKind, DeezerTrack } from '@/lib/deezer';

// Création de questions « blind test » : on cherche un morceau sur Deezer, on l'écoute (30 s), et la question est créée
// avec 3 mauvaises réponses plausibles. Rien n'est stocké à part le lien du morceau.
type Category = { id: string; name: string; emoji: string };
type Level = { id: string; label: string; sort_order: number; is_hidden?: boolean };

const FONT: React.CSSProperties = { fontFamily: 'Inter, sans-serif' };
const card: React.CSSProperties = { background: '#fff', borderRadius: 20, padding: 24, marginBottom: 20, maxWidth: 820, boxShadow: '0 10px 30px -16px rgba(31,36,64,0.15)', ...FONT };
const inputStyle: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: 12, border: '1.5px solid #dfe3f0', background: '#fff', fontSize: 13.5, fontWeight: 600, color: '#1f2440', ...FONT };
const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: '#1f2440', marginBottom: 6, display: 'block', ...FONT };
const actionBtn: React.CSSProperties = { background: '#6c7bf7', color: '#fff', border: 'none', borderRadius: 999, padding: '10px 20px', fontWeight: 700, fontSize: 13.5, cursor: 'pointer', ...FONT };
const ghostBtn: React.CSSProperties = { background: '#eef0f8', color: '#1f2440', border: 'none', borderRadius: 999, padding: '10px 16px', fontWeight: 700, fontSize: 13.5, cursor: 'pointer', ...FONT };

export default function BlindTestPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [levelId, setLevelId] = useState('');
  const [ask, setAsk] = useState<AskKind>('artist');
  const [query, setQuery] = useState('');
  const [tracks, setTracks] = useState<DeezerTrack[]>([]);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState<number | null>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [created, setCreated] = useState<string[]>([]);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: cats }, { data: lvls }] = await Promise.all([
        supabase.from('categories').select('*').order('name'),
        supabase.from('difficulty_levels').select('*').order('sort_order'),
      ]);
      const cl = (cats ?? []) as Category[];
      const ll = ((lvls ?? []) as Level[]).filter((l) => !l.is_hidden);
      setCategories(cl);
      setLevels(ll);
      setCategoryId((cl.find((c) => /musi/i.test(c.name)) ?? cl[0])?.id ?? '');
      setLevelId(ll[0]?.id ?? '');
    })();
    return () => audioRef.current?.pause();
  }, []);

  const search = async () => {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/deezer?search=${encodeURIComponent(q)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Recherche impossible');
      setTracks(json.tracks ?? []);
      if ((json.tracks ?? []).length === 0) setMessage({ kind: 'error', text: 'Aucun morceau avec extrait pour cette recherche.' });
    } catch (e: any) {
      setMessage({ kind: 'error', text: e.message });
    } finally {
      setSearching(false);
    }
  };

  const togglePlay = (t: DeezerTrack) => {
    const a = audioRef.current;
    if (!a) return;
    if (playingId === t.id) {
      a.pause();
      setPlayingId(null);
      return;
    }
    a.src = t.preview;
    a.play().then(() => setPlayingId(t.id)).catch(() => setPlayingId(null));
  };

  const create = async (t: DeezerTrack) => {
    if (!categoryId || !levelId) {
      setMessage({ kind: 'error', text: 'Choisis une catégorie et un niveau.' });
      return;
    }
    setCreating(t.id);
    setMessage(null);
    try {
      const res = await fetch('/api/deezer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId: t.id, ask, categoryId, levelId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Création impossible');
      setCreated((prev) => [`${t.titleShort} — ${t.artist.name}`, ...prev]);
      setMessage({ kind: 'ok', text: `Question ajoutée au pack « ${json.packName} » (${json.packCount} question${json.packCount > 1 ? 's' : ''}).` });
    } catch (e: any) {
      setMessage({ kind: 'error', text: e.message });
    } finally {
      setCreating(null);
    }
  };

  return (
    <main style={{ minHeight: '100vh', padding: '28px 40px', background: '#eef0f8', ...FONT }}>
      <audio ref={audioRef} onEnded={() => setPlayingId(null)} />
      <div style={{ maxWidth: 820, marginBottom: 14 }}>
        <a href="/parametrage" style={{ color: '#6c7bf7', fontWeight: 700, fontSize: 13.5, textDecoration: 'none' }}>← Paramétrage</a>
      </div>

      <section style={card}>
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 6px', color: '#1f2440' }}>🎵 Blind test (Deezer)</h1>
        <p style={{ color: '#7a819c', fontSize: 13.5, margin: '0 0 18px' }}>
          Cherche un morceau, écoute l'extrait de 30 s, puis crée la question : seule l'adresse du morceau est enregistrée, jamais le son. Les questions vont dans un pack « Blind test · catégorie » à ajouter à un profil.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
          <div>
            <label style={labelStyle}>Catégorie</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} style={inputStyle}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Niveau</label>
            <select value={levelId} onChange={(e) => setLevelId(e.target.value)} style={inputStyle}>
              {levels.map((l) => (
                <option key={l.id} value={l.id}>{l.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Question posée</label>
            <select value={ask} onChange={(e) => setAsk(e.target.value as AskKind)} style={inputStyle}>
              <option value="artist">Qui interprète ce morceau ?</option>
              <option value="title">Quel est le titre ?</option>
            </select>
          </div>
        </div>
      </section>

      <section style={card}>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') search(); }}
            placeholder="Artiste et/ou titre (ex. Aya Nakamura Djadja)"
            style={inputStyle}
          />
          <button type="button" onClick={search} disabled={searching} style={{ ...actionBtn, whiteSpace: 'nowrap' }}>
            {searching ? 'Recherche…' : 'Chercher'}
          </button>
        </div>

        {message && (
          <p style={{ margin: '14px 0 0', fontSize: 13.5, fontWeight: 700, color: message.kind === 'ok' ? '#1d8f74' : '#c0392b' }}>
            {message.kind === 'ok' ? '✓ ' : ''}{message.text}
          </p>
        )}

        <div style={{ marginTop: 16 }}>
          {tracks.map((t) => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0', borderTop: '1px solid #eaedf6' }}>
              {t.album.cover ? (
                <img src={t.album.cover} alt="" width={52} height={52} style={{ borderRadius: 10, objectFit: 'cover', flex: '0 0 auto' }} />
              ) : (
                <div style={{ width: 52, height: 52, borderRadius: 10, background: '#eef0f8', flex: '0 0 auto' }} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: '#1f2440', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.titleShort}</div>
                <div style={{ fontSize: 12.5, color: '#7a819c', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {t.artist.name}{t.album.title ? ` · ${t.album.title}` : ''}
                </div>
              </div>
              <button type="button" onClick={() => togglePlay(t)} style={ghostBtn}>{playingId === t.id ? '⏸ Pause' : '▶ Écouter'}</button>
              <button type="button" onClick={() => create(t)} disabled={creating === t.id} style={actionBtn}>
                {creating === t.id ? 'Création…' : '＋ Créer la question'}
              </button>
            </div>
          ))}
        </div>
      </section>

      {created.length > 0 && (
        <section style={card}>
          <h2 style={{ fontSize: 15, fontWeight: 800, margin: '0 0 8px', color: '#1f2440' }}>Ajoutées pendant cette session</h2>
          <ul style={{ margin: 0, paddingLeft: 18, color: '#4b5270', fontSize: 13.5, lineHeight: 1.7 }}>
            {created.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
