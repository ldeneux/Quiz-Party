export default function ParametragePage() {
  return (
    <main style={{ fontFamily: 'Inter, sans-serif', maxWidth: 500, margin: '80px auto', textAlign: 'center' }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>⚙️</div>
      <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Paramétrage</h1>
      <p style={{ color: '#7a819c' }}>
        Bientôt ici : gestion des packs de questions (niveau × catégorie, génération via Gemini)
        et des profils. En attendant, la partie pioche parmi toutes les questions validées de niveau CM1.
      </p>
      <a href="/" style={{ color: '#6c7bf7', fontWeight: 700, textDecoration: 'none' }}>← Retour</a>
    </main>
  );
}
