# Nkala — migration vers Expo (React Native + Web), iOS et Android

Décisions de Capp (fil « partage Mobile Ompangano », 2 nov. 2026) : Ompangano devient **Nkala** en absorbant
**Onenji** ; les fonctions sortent au fur et à mesure ; chaque fonction est écrite **une seule fois** pour le web
et le mobile. Le conseil initial (Capacitor) est retiré : **Expo + React Native Web**.
Compagnon : `REVIVE_ADSERVER.md` (régie publicitaire maison).

## Architecture cible
- `packages/noyau` : logique partagée sans interface — types, import des phrases (`parsePhrasesAndDiscoverThemes`),
  synchronisation hors-ligne vers le VPS, règles d'encodage DONDO (NFC, ɛ, ṉ, ȼ ; traduction TypeScript de `_contexte/texte_myene.py`).
- `apps/nkala` : application Expo unique (web + Android + iOS). Chaque module (collecte Ompangano, leçons et jeux Onenji,
  traducteur) s'active par un **interrupteur de fonctionnalité** ; publication progressive sans nouvelle application.
- Firebase (connexion) et VPS inchangés. Le prix : réécrire une fois l'interface actuelle.

## Inventaire du code actuel (web → Expo)
| Web | Fichiers | Équivalent |
|---|---|---|
| IndexedDB (`itemStore`) | 3 | `expo-sqlite` (même schéma dialecte/thème) ; enregistrements dans le système de fichiers |
| localStorage | 7 | AsyncStorage |
| MediaRecorder | 1 | `expo-audio` |
| Service worker / PWA | 2 | inutile ; `expo-updates` |
| speechSynthesis | 2 | `expo-speech` |
| Notifications web | 6 | `expo-notifications` |
| framer-motion, canvas-confetti | 2+2 | reanimated, confetti natif |
| recharts | 1 | victory-native / gifted-charts |
| Tailwind + HTML | tous | NativeWind ; `div/span/button` → `View/Text/Pressable` |

Réutilisable tel quel : `src/types`, `src/data/api.ts`, `myeneLexique.ts`, `seedData.ts`, `userSecurity.ts`, logique de synchro de `src/firebase.ts`.

## Points de vigilance (fil)
1. Connexion Google : la fenêtre surgissante ne marche pas en natif → `@react-native-firebase` (ou équivalent Expo).
2. Voix (cœur du projet) : `expo-audio`, test sur iOS.
3. Hors-ligne : iOS peut vider IndexedDB → SQLite + fichiers.
4. Envoi vers le VPS : file d'attente avec reprise d'un envoi interrompu (connexions instables).
5. À corriger avant import : l'import ignore la colonne `dialect` et met « orungu » partout (`07_donnees/OMPANGANO/00_LISEZMOI_OMPANGANO.md`) ; à traiter avant les lignes mpongwè et galwa.
6. Téléphones modestes : Android d'abord.
7. Publicité : contextuelle (thème, dialecte, province), jamais de profilage ni dans les parcours enfants ; loi gabonaise n°025/2023 (APDPVP) — voir `REVIVE_ADSERVER.md`.

## Étapes
1. Monorepo `packages/noyau` + extraction de la logique de `App.tsx` (≈2 900 lignes) en hooks.
2. `apps/nkala` Expo Router : Contribuer (Contribuer/Ezango/Classement), Administration (4 groupes), Profil (3 sections), comme sur le web.
3. Stockage, audio et synchro natifs.
4. `eas build --platform all` (iOS : compte Apple Developer).
5. Greffer Onenji puis le streaming comme modules.

## Décidé le 2 nov. 2026 : porter aussi le code Flutter
Malgré leur base Flutter, `nkala-app` et `essaka-play` sont **portés dans ce monorepo Expo** (réécriture Dart → TypeScript, pas de pont Flutter).

| Source | Taille | Modules à porter |
|---|---|---|
| `~/Projets/nkala-app` (Flutter, Firebase, GraphQL) | ≈ 13 000 lignes | annonces (3 400), auth (2 150), carte (1 270), bibliothèque (1 070), emplois (970), actualités (730), p2p/WebRTC (650), services (590), médias (380), profil (470) |
| `~/Projets/stream/essaka-play` (Flutter, Firebase `ontci-21a78`) | ≈ 13 700 lignes | pages (8 950), modèles (2 990), lecteur audio (1 800) |

Équivalences : Riverpod/BLoC → hooks + store (Zustand) ; go_router → Expo Router ; `just_audio` + `audio_service` → `expo-audio` (arrière-plan : `react-native-track-player`) ; `flutter_map` → `react-native-maps` ou MapLibre ; `cloud_firestore` → SDK Firebase JS ; `graphql_flutter` → Apollo/urql ; `flutter_webrtc` + peerdart → `react-native-webrtc` (hors Expo Go, build de développement) ; `fl_chart` → victory-native ; `intl_phone_field` → `react-native-phone-number-input`. Les modèles `json_serializable` deviennent des types TypeScript dans `packages/noyau`.

Ordre proposé : (1) noyau + coque Expo avec les 3 entrées actuelles ; (2) auth ; (3) Ompangano (collecte) ; (4) lecteur et catalogue Essaka Play ; (5) Onenji ; (6) annonces, carte, emplois, actualités, p2p.

## À trancher
Tranché : cible Expo, code Flutter porté (voir ci-dessus). Reste l'ordre des modules.
Note : une première version de ce fichier, écrite par la session claude.ai, a été écrasée par erreur puis reconstituée ici depuis le fil.
