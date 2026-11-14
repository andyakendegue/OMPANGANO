# Nkorouna (NKR) — le jeton de Nkala

État au 14 nov. 2026 : **base codée côté serveur, testée, non déployée, non commitée.** Pas encore d'écran dans l'app.

## 1. Le principe

- On **paie en FCFA** (Airtel Money, Moov Money, ou achat intégré Apple / Google) un **pack de Nkorouna** ; le serveur crédite les jetons sur le compte de l'utilisateur.
- On **dépense les Nkorouna** dans l'application : livres, leçons, paliers de jeux, tout produit qui a un `prix_nkr`.
- 1 NKR = une unité entière (pas de fraction). Le taux FCFA → NKR se règle pack par pack dans la collection `produits` (ex. 1 000 F = 500 NKR) ; rien n'est fixé dans le code.
- Les **envois entre utilisateurs** existent mais sont **fermés** (`NKOROUNA_TRANSFERTS` absent). On ne peut **pas reconvertir** des NKR en FCFA. Voir §4 : c'est ce qui garde le Nkorouna hors des règles de la monnaie électronique et des crypto-actifs.

## 2. Ce qui est codé

| Fichier | Rôle |
|---|---|
| `server/migrations/013_nkorouna.sql` | Comptes, mouvements, tête de chaîne, ancrages ; déclencheur qui interdit de modifier ou supprimer un mouvement |
| `server/api/src/nkorounaRegistre.ts` | Registre : partie double, chaîne SHA-256, idempotence, Merkle, vérification complète |
| `server/api/src/nkorouna.ts` | Routes de l'API |
| `server/api/src/achats.ts` | Un produit de type `nkorouna` payé (Mobile Money ou magasin) crédite les jetons |
| `packages/noyau/src/contenu/schemas.ts` | Collection `produits` : type `nkorouna`, colonnes `nkorouna` et `prix_nkr` |
| `server/api/test/nkorouna.test.ts` | 6 tests |

### Le registre (pourquoi il est sûr)

1. **Partie double** : chaque mouvement débite un compte et en crédite un autre du même montant. Comptes du système : `sys:emission` (contrepartie des achats en FCFA), `sys:bonus` (jetons offerts), `sys:recettes` (jetons dépensés). La somme de tous les soldes vaut toujours 0 : un jeton ne peut pas apparaître de nulle part.
2. **Solde jamais négatif** pour un utilisateur (contrainte en base + contrôle sous verrou).
3. **Idempotence** : chaque mouvement a une référence unique (paiement `NK-…`, reçu, clé d'achat envoyée par l'app). Un double clic, un webhook rejoué ou une coupure réseau ne débitent ou créditent qu'une fois.
4. **Immuabilité** : un mouvement ne se modifie ni ne se supprime (déclencheur Postgres). Une erreur se corrige par une contre-écriture (annulation, ajustement), qui reste visible.
5. **Chaîne d'empreintes** : empreinte(n) = SHA-256(empreinte(n-1) | mouvement n). Si quelqu'un retouche une ligne directement en base (même avec les droits d'administrateur Postgres), toute la suite ne correspond plus.
6. **Vérification complète** (`GET /v1/admin/nkorouna`) : rangs sans trou, chaîne, soldes recalculés depuis les mouvements, somme nulle, racines des ancrages.
7. **Ancrage** : la racine de Merkle des nouveaux mouvements est calculée et publiée (`/pub/nkorouna`). Une fois cette racine écrite sur une blockchain publique, même nous ne pouvons plus réécrire le passé sans que ça se voie (§3).

### Routes

| Route | Qui | Rôle |
|---|---|---|
| `GET /pub/nkorouna` | tous | Jetons en circulation, émis contre FCFA, offerts, dépensés ; tête de chaîne ; derniers ancrages |
| `GET /pub/nkorouna/preuve/:id` | tous | Preuve de Merkle qu'un mouvement fait partie d'une racine ancrée (empreintes seulement) |
| `GET /v1/nkorouna` | connecté | Solde, gel, 50 derniers mouvements |
| `POST /v1/nkorouna/depenser` | connecté | `{ produitId, cle }` : paie en NKR et accorde le produit |
| `POST /v1/nkorouna/transferer` | connecté | `{ vers, montant, cle }` ; 403 tant que `NKOROUNA_TRANSFERTS=oui` n'est pas mis ; plafond par jour |
| `GET /v1/admin/nkorouna` | admin | Vérification du registre, comptes, 100 derniers mouvements |
| `POST /v1/admin/nkorouna/ajuster` | admin | `{ userId, montant (±), motif, cle }` : jetons offerts ou retirés, inscrit au journal |
| `POST /v1/admin/nkorouna/annuler/:id` | admin | Contre-écriture (paiement remboursé, erreur) ; le droit accordé par une dépense est à retirer à part |
| `POST /v1/admin/nkorouna/geler` | admin | `{ userId, gele }` : bloque les dépenses d'un compte (fraude) |
| `POST /v1/admin/nkorouna/ancrer` | admin | Calcule la racine des nouveaux mouvements et la publie par le relais s'il est configuré |

### Mettre un pack en vente

Dans la console, collection **Produits payants** :

```
id,titre,type,prix_fcfa,nkorouna,prix_nkr,publie
pack-nkr-500,500 Nkorouna,nkorouna,1000,500,,oui
livre-conte-pirogue,Le conte de la pirogue,achat,1500,,300,oui
```

Le premier se paie en FCFA par le parcours Mobile Money déjà en place ; le second se paie en FCFA **ou** en NKR.

## 3. La blockchain : à quoi elle sert vraiment ici

**Ce que la blockchain ne fait pas** : elle ne protège pas l'application contre le piratage (comptes volés, serveur attaqué, fraude au paiement). Ça, ce sont la connexion (Google + SMS), le HTTPS, le pare-feu, les webhooks signés et la validation des paiements, déjà en place. Il ne faut **jamais** mettre de donnée personnelle sur une blockchain (nom, numéro, e-mail) : elle est publique et ineffaçable.

**Ce qu'elle apporte** : une **preuve publique, horodatée et impossible à réécrire**. Quatre usages adaptés à Nkala, du plus utile au moins urgent :

1. **Ancrer le registre Nkorouna** (prévu dans le code). Une fois par jour, la racine de Merkle des mouvements du jour est écrite dans une transaction sur un réseau public peu coûteux (Polygon PoS, Base ou autre réseau EVM : une transaction coûte une fraction de franc). N'importe qui peut alors vérifier que l'historique n'a pas été réécrit, et chaque utilisateur peut prouver qu'un de ses mouvements existait (`/pub/nkorouna/preuve/:id`). C'est la confiance d'une blockchain sans en avoir les contraintes (frais par opération, portefeuilles, clés perdues).
   *Reste à faire* : un **relais d'ancrage**, petit service séparé de l'API qui seul détient la clé du portefeuille et écrit la racine ; l'API l'appelle (`NKOROUNA_ANCRAGE_URL`, `NKOROUNA_ANCRAGE_SECRET`, corps signé HMAC) ; et une tâche cron quotidienne qui appelle `POST /v1/admin/nkorouna/ancrer`.
2. **Certificats d'Onenji vérifiables** : les certificats NKL-AAAA-000123 existent déjà (migration 012). Ancrer leur empreinte de la même façon permet à un employeur ou une école de vérifier un certificat même si Nkala disparaît.
3. **Preuve d'antériorité des contributions** : les enregistrements, proverbes et textes déposés par les contributeurs (Ikamba) peuvent recevoir une empreinte ancrée à la date de dépôt. C'est une preuve d'auteur pour le patrimoine myènè, sans publier le contenu.
4. **Jeton sur une blockchain publique (ERC-20)** : **pas maintenant.** Un Nkorouna échangeable hors de l'app deviendrait un crypto-actif au sens réglementaire (§4), demanderait la vérification d'identité des acheteurs, la garde des clés, la gestion des frais de réseau, et ouvrirait la spéculation. Si un jour c'est voulu, le registre actuel reste la source de vérité et la chaîne publique n'en est que le miroir (dépôt et retrait vers un portefeuille).

## 4. Cadre légal et magasins (à valider avant l'ouverture)

Je ne suis pas juriste : ce qui suit sert à préparer la question pour un avocat ou pour la BEAC, pas à trancher.

- **Monnaie électronique (CEMAC)** : émettre une valeur stockée, payée d'avance, **remboursable** ou **utilisable chez d'autres** relève de la réglementation des services de paiement de la CEMAC (COBAC / BEAC) et demande un agrément. Un crédit **utilisable seulement dans Nkala, non remboursable et non transférable** est en général traité comme un bon d'achat ou une monnaie de jeu. Le code est réglé dans ce sens : transferts fermés, aucune reconversion en FCFA.
- **Crypto-actifs** : un jeton échangeable sur une blockchain publique relève du régulateur du marché financier de la CEMAC (COSUMAF) et de la position de la BEAC sur les crypto-actifs. À vérifier avant tout jeton public (§3.4).
- **Ouvrir les transferts entre personnes** rapproche le Nkorouna d'un moyen de paiement : décision à prendre avec un conseil juridique, avec plafond et vérification d'identité.
- **Apple et Google** : une monnaie virtuelle utilisée dans l'app doit être vendue par l'achat intégré du magasin (règle 3.1.1 d'Apple ; facturation Google Play pour les biens numériques). Mobile Money reste possible sur le site web et selon les règles en vigueur au Gabon : à vérifier au moment de la soumission. Le code accepte les deux (`/v1/achats/recu` et `/v1/paiements`).
- **Comptabilité** : les FCFA encaissés pour des NKR non encore dépensés sont une dette envers les utilisateurs jusqu'à la dépense ; `GET /pub/nkorouna` donne le chiffre (`enCirculation`).
- **Données personnelles** : rien de personnel n'est publié (les ancrages et preuves ne contiennent que des empreintes).

## 5. Suite

1. Écrans de l'app : solde dans Réglages / Boutique, achat de pack, bouton « payer en NKR » sur les produits, historique.
2. Onglet Nkorouna dans la console d'administration (vérification, ajustements, gel, ancrage).
3. Relais d'ancrage + cron quotidien (§3.1).
4. Déploiement : migration 013 + fichiers serveur (avec l'accord de Capp, après comparaison de la production au dépôt).
5. Avis juridique avant d'ouvrir les transferts ou un jeton public.
