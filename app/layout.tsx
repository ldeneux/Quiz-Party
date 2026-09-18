import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Quiz Party',
  description: 'Le quiz en équipes pour la classe, façon jeu télé.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
