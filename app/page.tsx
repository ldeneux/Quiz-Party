import Link from 'next/link';

export default function HomePage() {
  return (
    <main style={{ maxWidth: 480, margin: '80px auto', textAlign: 'center', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🎯</div>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Quiz Party</h1>
      <p style={{ color: '#7a819c', marginBottom: 32 }}>
        Le quiz en équipes pour la classe, façon jeu télé.
      </p>

      <Link
        href="/host/new"
        style={{
          display: 'block',
          background: '#6c7bf7',
          color: '#fff',
          padding: '16px',
          borderRadius: 16,
          fontWeight: 700,
          textDecoration: 'none',
          marginBottom: 14,
        }}
      >
        🖥️ Nouveau jeu (écran projeté)
      </Link>

      <Link
        href="/join"
        style={{
          display: 'block',
          background: '#eef0f8',
          color: '#1f2440',
          padding: '16px',
          borderRadius: 16,
          fontWeight: 700,
          textDecoration: 'none',
        }}
      >
        📱 Rejoindre une partie (équipe)
      </Link>
    </main>
  );
}
