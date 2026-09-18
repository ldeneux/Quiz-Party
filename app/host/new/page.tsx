'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

const LEVELS = ['CP', 'CE1', 'CE2', 'CM1', 'CM2', 'ADO', 'ADULTE'];

type Category = { id: string; name: string; emoji: string };

export default function NewGamePage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedLevels, setSelectedLevels] = useState<string[]>(['CM1']);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    supabase
      .from('categories')
      .select('*')
      .then(({ data }) => setCategories((data as Category[]) ?? []));
  }, []);

  const toggleLevel = (level: string) => {
    setSelectedLevels((prev) => (prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]));
  };

  const toggleCategory = (id: string) => {
    setSelectedCategories((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  };

  const createGame = async () => {
    setError(null);
    if (selectedLevels.length === 0) {
      setError('Choisis au moins un niveau.');
      return;
    }
    setCreating(true);

    const res = await fetch('/api/create-game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        visualTheme: 'espace',
        levelIds: selectedLevels,
        categoryIds: selectedCategories, // vide = toutes les catégories
      }),
    });
    const data = await res.json();

    if (data.error) {
      setError(data.error);
      setCreating(false);
      return;
    }

    router.push(`/host/${data.game.id}`);
  };

  return (
    <main style={{ maxWidth: 560, margin: '40px auto', fontFamily: 'Inter, sans-serif', padding: '0 16px' }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Nouvelle partie</h1>
      <p style={{ color: '#7a819c', marginBottom: 24 }}>
        Configure le niveau et les catégories. Les équipes rejoindront après.
      </p>

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Niveaux</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {LEVELS.map((level) => (
            <button
              key={level}
              onClick={() => toggleLevel(level)}
              style={{
                padding: '8px 16px',
                borderRadius: 999,
                border: selectedLevels.includes(level) ? '2px solid #6c7bf7' : '2px solid #eaedf6',
                background: selectedLevels.includes(level) ? '#eceeff' : '#fff',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 28 }}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Catégories (vide = toutes)</div>
        {categories.length === 0 ? (
          <p style={{ color: '#7a819c', fontSize: 14 }}>
            Aucune catégorie en base pour l'instant — la partie piochera parmi toutes les questions disponibles.
          </p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => toggleCategory(cat.id)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 999,
                  border: selectedCategories.includes(cat.id) ? '2px solid #6c7bf7' : '2px solid #eaedf6',
                  background: selectedCategories.includes(cat.id) ? '#eceeff' : '#fff',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {cat.emoji} {cat.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <p style={{ color: '#ff7a68', marginBottom: 16 }}>{error}</p>}

      <button
        onClick={createGame}
        disabled={creating}
        style={{
          background: '#6c7bf7',
          color: '#fff',
          border: 'none',
          borderRadius: 999,
          padding: '14px 28px',
          fontWeight: 700,
          fontSize: 15,
          cursor: creating ? 'default' : 'pointer',
          opacity: creating ? 0.6 : 1,
          width: '100%',
        }}
      >
        {creating ? 'Création…' : 'Créer la partie'}
      </button>
    </main>
  );
}
