'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewGamePage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/create-game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visualTheme: 'espace' }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        router.push(`/host/${data.game.id}`);
      })
      .catch((err) => setError(err.message));
  }, [router]);

  return (
    <main style={{ textAlign: 'center', marginTop: 100, fontFamily: 'Inter, sans-serif' }}>
      {error ? <p style={{ color: '#ff7a68' }}>Erreur : {error}</p> : <p>Création de la partie…</p>}
    </main>
  );
}
