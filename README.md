# Quiz Party — V1

Quiz en équipes pour la classe, façon jeu télé. Écran hôte projeté + équipes
qui répondent depuis leur tablette/PC/téléphone. Next.js + Supabase Realtime.

## Ce qui est fait (V1)

- Création de partie avec code à 4 lettres
- Enrôlement d'équipe : choix parmi une liste de noms/avatars pré-faits (thème espace)
- Écran hôte : lobby → question → révélation simultanée
- Timer de 20s, fin anticipée si toutes les équipes ont répondu
- Réponses masquées jusqu'à la révélation (les tuiles équipe passent juste en "a répondu")
- Mode de jeu **CLASSIQUE** complet : 1 pt/bonne réponse + bonus rapidité (+3/+2/+1)
- Schéma de base de données prêt pour les 3 autres modes (DÉFI, SURVIE, PARTICIPATIF)

## Ce qui reste à faire (prochaines étapes)

- [ ] Implémenter les modes DÉFI, SURVIE, PARTICIPATIF (`lib/scoring.ts`)
- [ ] Écran de sélection/création de profil de jeu (niveau + catégories)
- [ ] Écran de fin de partie / classement final
- [ ] Alimenter la table `questions` (génération IA en batch + validation)
- [ ] QR code sur l'écran lobby en plus du code texte
- [ ] Support des 5 thèmes visuels (actuellement : espace uniquement dans `teamPresets.ts`)
- [ ] Édge Function dédiée pour le calcul du "premier à avoir buzzé" avec timestamp serveur fiable

## Installation

1. Crée un projet sur [supabase.com](https://supabase.com)
2. Dans l'éditeur SQL du projet, exécute dans l'ordre :
   - `supabase/schema.sql`
   - `supabase/functions.sql`
3. Copie `.env.example` en `.env.local` et remplis avec tes clés Supabase
   (Project Settings → API)
4. Installe les dépendances et lance le serveur de dev :

```bash
npm install
npm run dev
```

5. Ouvre `http://localhost:3000` — clique "Nouveau jeu" sur un écran (le PC
   qui sera projeté), et "Rejoindre une partie" sur les appareils des équipes.

## Ajouter des questions de test

Le lobby ne montre le bouton "Démarrer" que si au moins une équipe a rejoint,
et la partie ne trouvera des questions que si la table `questions` contient
des lignes avec `validated = true`. Exemple à coller dans l'éditeur SQL :

```sql
insert into categories (name, emoji) values ('Culture générale', '🌍');

insert into questions (category_id, level_id, prompt, choice_a, choice_b, choice_c, choice_d, correct_choice, explanation, validated)
select id, 'CM1',
  'Combien de planètes compte notre système solaire ?',
  '7 planètes', '8 planètes', '9 planètes', '10 planètes', 'b',
  'Depuis 2006, Pluton n''est plus classée comme planète mais comme "planète naine". Notre système solaire compte Mercure, Vénus, Terre, Mars, Jupiter, Saturne, Uranus et Neptune.',
  true
from categories where name = 'Culture générale';
```

## Déploiement

Le projet est prêt pour Vercel : `vercel deploy`, en renseignant les mêmes
variables d'environnement dans les Settings du projet Vercel.
