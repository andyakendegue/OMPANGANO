# Chaîne Nkorouna : une blockchain indépendante pour l'Afrique

Vision de Capp (14 nov. 2026) : une blockchain indépendante, utilisable en Afrique par les magasins et les institutions, pour certifier des documents, sécuriser des transactions et payer en cryptomonnaie. Nkala en est le premier utilisateur.

Ce document propose une architecture et un ordre de construction. Rien n'est codé ici en dehors du registre de Nkala (`NKOROUNA.md`).

## 1. Recommandation

**Ne pas écrire une blockchain de zéro.** Un consensus maison met des années à devenir sûr, et une faille y coûte tout. Il faut partir d'un moteur éprouvé, garder la souveraineté (nos nœuds, nos règles, nos validateurs africains) et construire au-dessus ce qui fait la différence : certification, identité des institutions, paiements locaux.

**Moteur conseillé : Hyperledger Besu (compatible Ethereum) avec le consensus QBFT.**

| Critère | Besu + QBFT | Cosmos SDK + CometBFT | Écrire la nôtre |
|---|---|---|---|
| Indépendance | Réseau propre, nos validateurs | Réseau propre, nos validateurs | Totale |
| Finalité | Immédiate (1 bloc, ~2 s) | Immédiate (~5 s) | À prouver |
| Outils, portefeuilles, contrats | Tout l'écosystème Ethereum (Solidity, MetaMask, explorateurs) | Go, moins d'outils prêts | Rien |
| Validateurs autorisés (institutions) | Intégré (permissioning) | Possible | À écrire |
| Frais | Peut fonctionner sans frais pour les usagers | Configurable | À écrire |
| Délai jusqu'à un réseau pilote | Semaines | Mois | Années |

Besu est la voie la plus courte vers un réseau d'institutions (banques, ministères, universités, chambres de commerce) qui font chacune tourner un nœud validateur. Cosmos reste une bonne option si l'on veut plus tard relier d'autres chaînes (protocole IBC) ; on peut migrer les preuves, pas l'inverse.

## 2. Architecture en couches

1. **Réseau** : 4 validateurs au départ (QBFT tolère 1 nœud défaillant sur 4 ; 7 validateurs en tolèrent 2), hébergés chez des partenaires distincts, dans des pays distincts. Nœuds de lecture publics pour que n'importe qui vérifie.
2. **Identité des institutions** : registre on-chain des émetteurs agréés (une université, un ministère, un notaire, un magasin) avec leur clé publique. C'est ce qui donne de la valeur à un certificat : on sait *qui* l'a signé.
3. **Certification de documents** (contrat `Registre`) : une institution publie l'empreinte SHA-256 d'un document (diplôme, acte, facture, titre foncier), jamais le document lui-même. Vérification : on recalcule l'empreinte du fichier reçu et on interroge la chaîne. Révocation possible par l'émetteur.
4. **Ancrage** : toute application (Nkala d'abord) envoie périodiquement une racine de Merkle de son registre. Le relais prévu dans `NKOROUNA.md` §3 vise cette chaîne au lieu de Polygon.
5. **Paiements** : deux jetons distincts, à ne pas confondre :
   - **NKR, jeton d'usage** : crédits pour des services (Nkala, partenaires), non remboursable. Peu de contraintes réglementaires.
   - **Jeton adossé au FCFA (1 jeton = 1 FCFA)** : pour payer en magasin. Chaque jeton doit être couvert par des FCFA déposés dans une banque ; c'est de la monnaie électronique, donc **émis par un partenaire agréé** (banque ou établissement de monnaie électronique), pas par nous.
6. **Applications** : portefeuille mobile (fonctionnant en USSD / SMS pour les téléphones simples), terminal de paiement marchand (QR code), portail de vérification des documents, explorateur public.

## 3. Ordre de construction

| Phase | Contenu | Pourquoi dans cet ordre |
|---|---|---|
| 0 (fait) | Registre NKR de Nkala, empreintes chaînées, racines de Merkle | Sert dès maintenant, prêt à être ancré |
| 1 (prototype fait le 14/11, voir `chaine/README.md`) | Réseau pilote Besu (4 nœuds), contrat `Registre`, relais d'ancrage de Nkala, page de vérification ; reste : lancer les vrais nœuds Besu, explorateur | Prouve que la chaîne tourne, sans argent en jeu |
| 2 | **Certification de documents** : certificats d'Onenji, puis une université ou une administration partenaire, portail de vérification | Peu réglementé, forte valeur pour les institutions, c'est la porte d'entrée commerciale |
| 3 | Identité des émetteurs, validateurs hébergés par les partenaires | La chaîne devient réellement indépendante de nous |
| 4 | Paiements en magasin avec le jeton adossé au FCFA, **avec un partenaire agréé** | Seulement après l'avis du régulateur |

## 4. Le cadre réglementaire (à faire valider par un juriste)

Je ne suis pas juriste ; ce qui suit sert à préparer les rendez-vous.

- En zone CEMAC, le franc CFA est la seule monnaie ayant cours légal. La BEAC a réagi en 2022 à la loi centrafricaine qui faisait du Bitcoin une monnaie légale, en rappelant ce monopole. Un paiement en magasin avec un jeton relève donc de la réglementation des services de paiement (COBAC / BEAC) : il faut soit un agrément, soit un partenaire agréé.
- Les crypto-actifs échangeables relèvent aussi du régulateur des marchés de la CEMAC (COSUMAF).
- La certification de documents et l'horodatage ne touchent pas à la monnaie : c'est l'usage le plus simple à lancer.
- Démarche conseillée : présenter le projet à la BEAC, dans le cadre de ses dispositifs d'innovation s'ils existent au moment voulu (bac à sable réglementaire), avant la phase 4.
- Hors CEMAC (UEMOA, Nigeria, Kenya…), chaque zone a ses propres règles : le choix d'un réseau à validateurs autorisés facilite le respect des règles locales pays par pays.

## 5. Ce qu'il ne faut jamais mettre sur la chaîne

Noms, numéros, documents eux-mêmes, données de santé ou d'état civil : seulement des empreintes. Une blockchain ne s'efface pas, et la loi gabonaise n° 001/2011 sur les données personnelles impose de pouvoir effacer.

## 6. Prochaine étape concrète

Phase 1 dans un dépôt séparé (`nkorouna-chaine`) : 4 nœuds Besu QBFT en Docker, contrat `Registre` (publier, vérifier, révoquer une empreinte) avec ses tests, relais d'ancrage appelé par l'API de Nkala, page de vérification.
