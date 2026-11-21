# Nkala complet — plan des lots (18 novembre 2026)

Demande de Capp (18/11/2026) : rendre la partie Nkala (Village) complète : annonces de tous types sur le modèle des annonces de logement, annuaire de services avec comptes de commerçants et métiers informels, taxi, voyages, portefeuille, paiements administratifs, affichage liste / grille / carte, recherche par photo, guidage GPS, et une vraie photo 360° (sphère complète, nette, avec détection du déplacement).
Correspond aux lignes N1 à N14 de `NKALA_PLAN_DEVELOPPEMENT.md` (module 4).

## Décisions de Capp (18/11/2026)
- **Photo 360°** : capture en réalité augmentée (ARKit sur iPhone, ARCore sur Android) avec des cibles (environ 30 photos : 3 rangées, plus le haut et le bas), prise automatique et alerte si le téléphone s'est déplacé de plus de 1 à 2 cm ; assemblage sur le VPS (Hugin / OpenCV). Module natif : nouveau build iOS et Android. Un téléphone ne mesure pas un déplacement au millimètre : 1 cm environ est la limite de la réalité augmentée.
- **Portefeuille** : en **Nkorouna seulement** (registre interne déjà codé, `NKOROUNA.md`), sans reconversion en FCFA. Séquestre, réservation, confirmation ou annulation, 50 % à la commande et 50 % à la livraison, frais de quelques francs : tout en jetons.
- **Annonces** : **1 annonce gratuite par mois** (toutes catégories), puis **500 FCFA l'unité**, réglable dans la console (jamais de prix en dur).
- **Organisation** : tout dans une seule session, lot par lot.

## Lots (ordre de travail)
| Lot | Contenu | Remarques |
|---|---|---|
| L1 | **Annonces de tous types** sur le modèle du logement : automobile (achat, location, vente, équipements, pièces détachées), équipement / petites annonces (hi-fi, électroménager, téléphones…), emploi, services à domicile (courses, baby-sitter, plombier, électricien, santé…). Catalogue de champs par catégorie, formulaire en étapes, médias, emplacement, filtres tirés du catalogue. Quota 1 gratuite + 500 F. Affichage **liste / grille / carte** dans la barre du haut, **filtre de distance sur la carte**, recherche, alertes de nouvelles annonces, « repositionner » une annonce. | Carte : OpenStreetMap dans la WebView (déjà présente), sans module natif |
| L2 | **Annuaire et comptes de services** : comptes commerçant / prestataire, géolocalisation du commerce, services principaux et annexes (ex. bouteilles de gaz + Mobile Money), options par type (motel : chambres, prix, climatisation ; salon : coupes, tresses…), horaires ; **catalogue complet des métiers de l'informel** (cordonnier, garagiste, couturier, vulcanisateur, soudeur, tôlier, menuisier, réparateur de téléphones…) ; sorties (boîtes de nuit, restaurants, snack-bars) ; pharmacies, cliniques, hôpitaux, stations-service, factures (SEEG, internet, TV). | Modération des comptes de services |
| L3 | **Taxi et voyages** : taxi (adresse de départ et d'arrivée, prix fixé par le client, réponse des chauffeurs) ; voyages (avion national et international, train, bateau, navettes et pirogues sur l'Ogooué, bus) : horaires publiés par des comptes de transporteurs, réservation, paiement en Nkorouna. | Horaires réels : transporteurs à recruter |
| L4 | **Portefeuille Nkorouna** : dépôt (achat de jetons existant), réservation d'un bien avec séquestre, confirmation ou annulation à la remise, 50/50, frais. | Cadre légal : `NKOROUNA.md` |
| L5 | **Photo 360° en réalité augmentée** : module natif (Expo Modules API) ARKit / ARCore, écran caméra avec cibles, prise automatique, contrôle du déplacement ; assemblage Hugin sur le VPS (file de travaux), visionneuse sphérique. | Nouveau build ; installation de Hugin sur le VPS (accord de Capp) |
| L6 | **Recherche par photo et guidage GPS** : photographier l'objet cherché et retrouver les annonces proches (embeddings d'images) ; itinéraire dans l'application. | Recherche par photo : modèle d'images sur le serveur |
| L7 | **Services administratifs** (taxes municipales, état civil, contraventions) | **Seulement après accord officiel** (décision déjà prise, N8) : écrans « Bientôt » et modèle de données |

## Ce qui existe déjà (à réutiliser)
Annonces de logement complètes (`apps/nkala/src/logement/`, `packages/noyau/src/logement.ts`, `server/api/src/annoncesLogement.ts`) ; annuaire, carte schématique, pharmacies de garde, taxi au prix du client, services (`Village.tsx`) ; Nkorouna (`server/api/src/nkorouna*.ts`) ; achats Mobile Money et magasins (`achats.ts`) ; régie publicitaire.
