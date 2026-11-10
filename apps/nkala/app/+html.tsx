import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/** Page HTML racine du rendu web : fond de marque dès le premier affichage, fenêtre adaptable (pas de mode téléphone). */
export default function Racine({ children }: PropsWithChildren) {
  return (
    <html lang="fr">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />
        <title>Nkala</title>
        <meta name="theme-color" content="#170d08" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: 'body{background-color:#170d08;color:#fdfaf7}' }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
