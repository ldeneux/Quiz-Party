// Vidéo de lancement propre à chaque habillage.
// Au clic sur « Démarrer la partie », la mascotte allume son écran et ouvre un portail holographique (40 % de la scène,
// au centre) qui joue la vidéo du thème. À la fin de la vidéo, le portail reste HOLD_AFTER_VIDEO_MS sur la dernière image,
// puis se réduit vers la mascotte et la première question s'affiche.
// Un habillage sans vidéo affiche un « ? » en halo lumineux pendant NO_VIDEO_MS.
//
// Pour ajouter la vidéo d'un autre thème : déposer public/themes/<thème>/intro.mp4 (+ intro-poster.webp = sa première image,
// facultatif) puis ajouter une ligne ci-dessous.

export type ThemeIntro = { src: string; poster?: string };

export const THEME_INTROS: Record<string, ThemeIntro> = {
  sucrerie: { src: '/themes/sucrerie/intro.mp4', poster: '/themes/sucrerie/intro-poster.webp' },
  art: { src: '/themes/art/intro.mp4' },
};

export const HOLD_AFTER_VIDEO_MS = 2000; // pause sur la dernière image, avant que le portail se referme
export const NO_VIDEO_MS = 5000; // durée du « ? » lumineux quand le thème n'a pas de vidéo
