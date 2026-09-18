'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function JoinPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    const { data: game, error: fetchError } = await supabase
      .from('games')
      .select('id')
      .eq('join_code', code.toUpperCase())
      .single();

    if (fetchError || !game) {
      setError('Code introuvable, vérifie et réessaie.');
      return;
    }

    router.push(`/play/${game.id}`);
  };

  return (
    <main style={{ maxWidth: 400, margin: '80px auto', textAlign: 'center', fontFamily: 'Inter, sans-serif' }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 20 }}>Rejoindre une partie</h1>
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Code à 4 lettres"
        maxLength={4}
        style={{
          fontSize: 28,
          textAlign: 'center',
          letterSpacing: 6,
          padding: 16,
          borderRadius: 16,
          border: '2px solid #eaedf6',
          width: '100%',
          textTransform: 'uppercase',
          marginBottom: 16,
        }}
      />
      {error && <p style={{ color: '#ff7a68', fontSize: 14 }}>{error}</p>}
      <button
        onClick={handleSubmit}
        style={{
          background: '#6c7bf7',
          color: '#fff',
          border: 'none',
          borderRadius: 999,
          padding: '14px 28px',
          fontWeight: 700,
          fontSize: 15,
          cursor: 'pointer',
          width: '100%',
        }}
      >
        Valider
      </button>
    </main>
  );
}
