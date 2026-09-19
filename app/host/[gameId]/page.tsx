import GameArea from '@/components/GameArea';

export default function HostPage({ params }: { params: { gameId: string } }) {
  return (
    <main style={{ fontFamily: 'Inter, sans-serif', background: '#f4f6fb', minHeight: '100vh', padding: 32 }}>
      <a
        href="/"
        style={{
          position: 'fixed',
          top: 20,
          left: 24,
          color: '#7a819c',
          fontWeight: 700,
          fontSize: 14,
          textDecoration: 'none',
          zIndex: 20,
        }}
      >
        ← Retour
      </a>
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}>
        <GameArea gameId={params.gameId} />
      </div>
    </main>
  );
}
