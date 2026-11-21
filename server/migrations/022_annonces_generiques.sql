-- Annonces de tous types (décision de Capp du 18/11/2026) : 1 annonce gratuite par mois, toutes catégories, puis 500 FCFA
-- l'unité (réglable dans la console : paramètre « annonces » et produit « annonce-supplementaire ») ; alertes de nouvelles
-- annonces enregistrées par l'utilisateur ; « repositionner » une annonce (remontée en tête de liste).

-- Crédits d'annonce achetés (Mobile Money, magasins ou Nkorouna) : un crédit = une annonce au-delà du quota gratuit.
CREATE TABLE IF NOT EXISTS annonces_credits (
  id          bigserial PRIMARY KEY,
  user_id     text NOT NULL,
  source      text NOT NULL,
  reference   text NOT NULL,
  utilise_par text,
  utilise_le  timestamptz,
  at          timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX IF NOT EXISTS annonces_credits_libres_idx ON annonces_credits (user_id) WHERE utilise_par IS NULL;

-- Alertes : « prévenez-moi quand une annonce correspond à cette recherche » (notification à la publication).
CREATE TABLE IF NOT EXISTS annonces_alertes (
  id             bigserial PRIMARY KEY,
  user_id        text NOT NULL,
  nom            text NOT NULL,
  filtres        jsonb NOT NULL,
  actif          boolean NOT NULL DEFAULT true,
  derniere_notif timestamptz,
  created_at     timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX IF NOT EXISTS annonces_alertes_user_idx ON annonces_alertes (user_id);
CREATE INDEX IF NOT EXISTS annonces_alertes_actives_idx ON annonces_alertes ((filtres->>'categorie')) WHERE actif;

-- Réglage par défaut (modifiable dans la console ; jamais écrasé s'il existe déjà).
INSERT INTO parametres (cle, valeur, par) VALUES ('annonces', '{"gratuites_mois": 1, "produit": "annonce-supplementaire", "repositionner_jours": 7, "alertes_max": 10}', 'migration-022')
ON CONFLICT (cle) DO NOTHING;

-- Produit « Annonce supplémentaire » : 500 FCFA (décision de Capp) ; prix en Nkorouna à régler dans la console (prix_nkr).
INSERT INTO contenus (collection, id, data, publie, statut)
VALUES ('produits', 'annonce-supplementaire', '{"id": "annonce-supplementaire", "titre": "Annonce supplémentaire", "type": "credit_annonce", "quantite": 1, "prix_fcfa": 500, "periode": "unique", "publie": true}', true, 'publie')
ON CONFLICT (collection, id) DO NOTHING;

-- Catégorie « Équipement » (petites annonces : hi-fi, électroménager, téléphones…) ajoutée à la liste du Village.
INSERT INTO contenus (collection, id, data, publie, statut)
VALUES ('categories_annonces', 'equipement', '{"id": "equipement", "titre": "Équipement", "icone": "tv", "couleur": "#7C3AED", "quota_gratuit": 1, "ordre": 3, "publie": true}', true, 'publie')
ON CONFLICT (collection, id) DO NOTHING;
