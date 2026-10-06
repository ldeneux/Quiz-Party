// Vidéo de lancement propre à chaque habillage.
// Au démarrage de la partie, elle s'affiche dans le hublot (image de départ figée), le décompte 3-2-1 est lancé,
// puis la vidéo se joue et reste sur sa dernière image HOLD_AFTER_VIDEO_MS avant la première question.
// Un habillage sans vidéo n'affiche que le décompte 3-2-1 puis « C'EST PARTI ! ».
//
// Pour ajouter la vidéo d'un autre thème : déposer public/themes/<thème>/intro.mp4 (+ intro-poster.webp = sa première image)
// puis ajouter une ligne ci-dessous.

export type ThemeIntro = { src: string; poster?: string };

export const THEME_INTROS: Record<string, ThemeIntro> = {
  sucrerie: { src: '/themes/sucrerie/intro.mp4', poster: '/themes/sucrerie/intro-poster.webp' },
};

export const HOLD_AFTER_VIDEO_MS = 3000;
