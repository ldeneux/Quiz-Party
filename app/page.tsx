'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

const MODES = [
  { id: 'classique', label: 'Classique', emoji: '🎯', desc: '1 pt/bonne réponse + bonus de rapidité, objectif 150 pts' },
  { id: 'defi', label: 'Défi', emoji: '⚔️', desc: 'Une équipe défie les autres sur un thème de son choix' },
  { id: 'survie', label: 'Survie', emoji: '❤️', desc: '3 vies par équipe, élimination progressive' },
  { id: 'participatif', label: 'Participatif', emoji: '🤝', desc: 'Cagnotte commune qui grandit à chaque bonne réponse' },
];

export default function ConsolePage() {
  const router = useRouter();
  const [creatingMode, setCreatingMode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startMode = async (mode: string) => {
    setError(null);
    setCreatingMode(mode);

    const res = await fetch('/api/create-game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, visualTheme: 'espace', levelIds: ['CM1'], categoryIds: [] }),
    });
    const data = await res.json();

    if (data.error) {
      setError(data.error);
      setCreatingMode(null);
      return;
    }

    router.push(`/host/${data.game.id}`);
  };

  return (
    <main style={{ fontFamily: 'Inter, sans-serif', background: '#f4f6fb', minHeight: '100vh' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 28px' }}>
        <div style={{ fontWeight: 800, fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 22 }}>🎯</span> Quiz Party
        </div>
        <a
          href="/parametrage"
          title="Paramétrage"
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            boxShadow: '0 4px 12px rgba(31,36,64,0.08)',
            textDecoration: 'none',
          }}
        >
          ⚙️
        </a>
      </header>

      <div style={{ maxWidth: 760, margin: '20px auto', padding: '0 20px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Choisis un mode de jeu</h1>
        <p style={{ color: '#7a819c', marginBottom: 28 }}>La partie se configure ensuite (équipes, questions).</p>

        {error && <p style={{ color: '#ff7a68', marginBottom: 16 }}>{error}</p>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => startMode(m.id)}
              disabled={creatingMode !== null}
              style={{
                background: '#fff',
                border: '1px solid #eaedf6',
                borderRadius: 20,
                padding: 24,
                textAlign: 'left',
                cursor: creatingMode ? 'default' : 'pointer',
                boxShadow: '0 10px 30px -14px rgba(31,36,64,0.15)',
                opacity: creatingMode && creatingMode !== m.id ? 0.5 : 1,
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 8 }}>{m.emoji}</div>
              <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 6 }}>
                {creatingMode === m.id ? 'Création…' : m.label}
              </div>
              <div style={{ color: '#7a819c', fontSize: 13.5, lineHeight: 1.4 }}>{m.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
