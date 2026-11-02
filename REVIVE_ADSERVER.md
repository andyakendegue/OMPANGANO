# Régie publicitaire NKALA — Revive Adserver (auto-hébergée)

> Créé le 2 novembre 2026 à la demande de Capp. Compagnon de `NKALA_EXPO.md`.
> Règles d'usage de la publicité : `../15_modele_economique/01_modele_economique_application.md` (à reprendre telles quelles).
> En cas de mise à jour : ajouter, ne rien supprimer.

## 1. Pourquoi Revive Adserver
- Logiciel libre (PHP), auto-hébergeable sur le VPS d'Essaka Engineering, à côté de la pile OMPANGANO (`server/docker-compose.yml`).
- Fonctions d'une régie : annonceurs, campagnes, bannières, zones (emplacements), ciblage, plafonds d'affichage, statistiques, comptes annonceurs.
- Base de données : MySQL **ou PostgreSQL** → on réutilise le savoir-faire PostgreSQL déjà en place.
- Version stable au 2 nov. 2026 : branche **v6.0.x** (6.0.6 publiée le 18 mars 2026 ; vérifier la dernière sur revive-adserver.com avant l'installation). PHP 8.1 à 8.5.
- Extensions PHP requises : intl, mbstring, pgsql, pcre, xml, zip, zlib ; conseillées : curl, gd, opcache, openssl. HTTPS obligatoire.
- Pas d'image Docker officielle : on construit la nôtre (section 4).

## 2. Place dans l'architecture
```
NKALA (Expo : iOS, Android, web)
   │  GET /v1/pub?zone=…   (aucune donnée personnelle)
   ▼
API OMPANGANO (Fastify, api-ompangano.essaka.engineering)
   │  passerelle : choisit la zone selon le module et le profil d'âge, appelle Revive, renvoie du JSON
   ▼
Revive Adserver (pub.essaka.engineering) ── PostgreSQL « revive » (base séparée)
```
- **Revive n'a pas de SDK mobile.** NKALA ne parle jamais directement à Revive : la passerelle de l'API renvoie `{ image, lien, texte_alternatif, id_affichage }`, NKALA affiche avec ses propres composants (`Image`, `Pressable`), puis signale l'affichage et le clic à l'API, qui les relaie à Revive.
- Avantage : même code pour le web et le mobile (`packages/core`), aucun identifiant d'appareil transmis, publicité coupée d'un seul interrupteur.
- Hors ligne : pas d'appel, pas de publicité, aucune pénalité pour le joueur (règle du modèle économique).

## 3. Zones (emplacements) à créer
| Zone Revive | Écran NKALA | Format | Public |
|---|---|---|---|
| `bandeau_accueil` | accueil, menus | bannière 320×50 | ados, adultes |
| `bandeau_resultats` | écran de résultats d'un jeu | bannière 320×50 | ados, adultes |
| `recompense_coeur` | entre deux écrans, au choix du joueur | image ou vidéo plein écran | ados, adultes |
| `enfants_contextuel` | uniquement si Capp l'autorise (décision ouverte pour *Ntina*) | bannière relue à la main, sans ciblage | enfants |
| `partenaires_culture` | pages culture, Wulinya myè | bannière | tous |

Interdits (règle du modèle économique) : jamais pendant un exercice audio, une question ou un enregistrement de voix.

**Publicité récompensée** : Revive ne gère pas la récompense. NKALA affiche la création de la zone `recompense_coeur` pendant un temps minimal, puis l'API accorde le cœur ou les crédits et applique le **plafond quotidien** par joueur.

## 4. Installation sur le VPS (projet Docker séparé `regie`)
Dossier proposé : `server/regie/` (à créer lors de la mise en œuvre).

`server/regie/Dockerfile`
```dockerfile
FROM php:8.3-apache
RUN apt-get update && apt-get install -y libicu-dev libpq-dev libzip-dev libpng-dev unzip curl \
 && docker-php-ext-install intl pgsql zip gd opcache \
 && rm -rf /var/lib/apt/lists/*
ARG REVIVE_VERSION=6.0.6
RUN curl -fsSL https://download.revive-adserver.com/revive-adserver-${REVIVE_VERSION}.tar.gz \
    | tar xz --strip-components=1 -C /var/www/html \
 && chown -R www-data:www-data /var/www/html/var /var/www/html/plugins /var/www/html/www/admin/plugins /var/www/html/www/images
```
(Vérifier l'URL exacte de l'archive sur la page de téléchargement avant le premier build.)

`server/regie/docker-compose.yml`
```yaml
name: regie
services:
  revive-db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: revive
      POSTGRES_PASSWORD: ${REVIVE_DB_PASSWORD:?définir dans .env}
      POSTGRES_DB: revive
    volumes: [revive_pg:/var/lib/postgresql/data]
  revive:
    build: .
    restart: unless-stopped
    depends_on: [revive-db]
    ports: ["${BIND_IP:-127.0.0.1}:3910:80"]
    volumes:
      - revive_var:/var/www/html/var        # configuration et cache
      - revive_images:/var/www/html/www/images
volumes: { revive_pg: {}, revive_var: {}, revive_images: {} }
```

À ajouter au Caddyfile du VPS (même méthode que `Caddyfile.snippet`) :
```
pub.essaka.engineering {
	encode zstd gzip
	reverse_proxy 172.17.0.1:3910
}
```
Puis : DNS A `pub` → VPS ; ouvrir `https://pub.essaka.engineering/` et suivre l'assistant (base PostgreSQL : hôte `revive-db`, base et utilisateur `revive`).

**Maintenance obligatoire** (statistiques, plafonds, fin des campagnes), toutes les heures :
```
0 * * * * docker exec regie-revive-1 php /var/www/html/scripts/maintenance/maintenance.php pub.essaka.engineering
```

**Sauvegarde** : ajouter la base `revive` et le volume `revive_images` au script de `server/backup/`.

**Sécurité** : mettre à jour à chaque version corrective (le projet publie souvent des correctifs de sécurité) ; interface d'administration réservée (mot de passe fort, accès restreint si possible).

## 5. Passerelle dans l'API OMPANGANO (à coder)
- `GET /v1/pub?emplacement=bandeau_accueil&profil=ado` → l'API traduit en identifiant de zone Revive, interroge Revive côté serveur (balise asynchrone ou XML-RPC de livraison), renvoie du JSON ; cache court (1 à 5 min).
- `POST /v1/pub/affichage` et `POST /v1/pub/clic` → relais vers Revive pour les statistiques.
- `POST /v1/pub/recompense` → vérifie la durée d'affichage, le plafond quotidien, accorde la récompense.
- Rien de personnel n'est transmis à Revive : ni compte, ni voix, ni réponses du crowdsourcing, ni identifiant d'appareil. Seuls comptent la zone, le module et le profil d'âge déclaré.

## 6. Conformité (rappel du modèle économique)
- Loi n° 001/2011 modifiée par la loi n° 025/2023 du 12 juillet 2023 ; autorité : APDPVP. Déclarer le traitement « publicité » ; consentement, celui des parents pour les mineurs.
- Publicité **contextuelle** seulement (thème, module, province déclarée), sans profilage.
- Enfants : Google Play Familles et Apple Enfants (règle 1.3) ; une régie propre avec visuels relus à la main est l'option la plus sûre, ou aucune publicité dans *Ntina* (décision ouverte).
- Catégories bloquées : alcool, jeux d'argent, rencontres, contenus pour adultes, tout ce qui heurte les valeurs du projet.
- Dans Revive : désactiver les cookies de suivi tiers et ne pas activer la géolocalisation par IP (MaxMind) au départ ; vérifier les réglages de confidentialité de l'interface d'administration.
- Validation juridique (APDPVP ou avocat) avant le lancement.

## 7. Commercial (régie propre)
- Annonceurs visés (modèle économique) : commerces de Port-Gentil, institutions culturelles, partenaires de la Royauté Ampenda m'Ôrungu.
- Chaque annonceur reçoit un compte Revive (statistiques de ses campagnes) ; contrats et factures conformes au droit gabonais, prix en FCFA (au forfait, au millier d'affichages ou au clic).
- Relecture humaine de chaque visuel avant mise en ligne.

## 8. Étapes
1. Décisions de Capp : régie propre seule, ou régie propre + kit certifié « Familles » ; publicité ou non dans *Ntina*.
2. Installer Revive sur le VPS (section 4), créer les zones (section 3).
3. Coder la passerelle dans l'API (section 5) et le composant `Publicite` dans `packages/core` + `apps/mobile`.
4. Déclaration APDPVP, validation juridique.
5. Premiers annonceurs locaux ; lancement avec la version Expo de NKALA.

## Sources
- Revive Adserver, exigences techniques : https://www.revive-adserver.com/support/requirements/
- Revive Adserver, notes de version (v6.0.x) : https://www.revive-adserver.com/blog/
- Modèle économique NKALA : `../15_modele_economique/01_modele_economique_application.md`
