-- Nkorouna (NKR) : jeton de Nkala, acheté en francs CFA (Mobile Money, magasins) et dépensé dans l'application.
-- Registre en partie double : chaque mouvement débite un compte et en crédite un autre du même montant,
-- donc la somme de tous les soldes vaut toujours 0. Les mouvements ne sont jamais modifiés ni supprimés
-- (une erreur se corrige par une contre-écriture) et chacun porte l'empreinte du précédent (chaîne SHA-256) :
-- toute retouche directe en base casse la chaîne et se voit à la vérification. Les racines de Merkle
-- (table nkr_ancrages) peuvent être publiées sur une blockchain publique pour prouver que rien n'a été réécrit.

-- Comptes : un par utilisateur (u:<uid>) et des comptes du système.
--   sys:emission : contrepartie des achats en FCFA (son solde négatif = jetons en circulation payés en FCFA)
--   sys:bonus    : contrepartie des jetons offerts (cadeaux, concours, corrections)
--   sys:recettes : reçoit les jetons dépensés dans l'application
CREATE TABLE nkr_comptes (
  id          text PRIMARY KEY,
  user_id     text UNIQUE,
  type        text NOT NULL CHECK (type IN ('utilisateur', 'systeme')),
  solde       bigint NOT NULL DEFAULT 0,
  gele        boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT nkr_solde_utilisateur_positif CHECK (type = 'systeme' OR solde >= 0)
);
INSERT INTO nkr_comptes (id, type) VALUES ('sys:emission', 'systeme'), ('sys:bonus', 'systeme'), ('sys:recettes', 'systeme');

CREATE TABLE nkr_mouvements (
  rang             bigint PRIMARY KEY,                -- 1, 2, 3… sans trou (attribué sous verrou)
  id               text NOT NULL UNIQUE,              -- nkr_<hex>
  nature           text NOT NULL CHECK (nature IN ('achat', 'depense', 'transfert', 'bonus', 'correction', 'annulation')),
  debit            text NOT NULL REFERENCES nkr_comptes (id),
  credit           text NOT NULL REFERENCES nkr_comptes (id),
  montant          bigint NOT NULL CHECK (montant > 0),
  reference        text NOT NULL UNIQUE,              -- clé d'idempotence : un paiement, un reçu, une dépense ne passent qu'une fois
  meta             jsonb NOT NULL DEFAULT '{}',
  par              text NOT NULL,                     -- qui a provoqué le mouvement (uid, 'mobile_money', 'webhook'…)
  created_at       timestamptz NOT NULL,
  hash_precedent   text NOT NULL,
  hash             text NOT NULL UNIQUE,
  CHECK (debit <> credit)
);
CREATE INDEX nkr_mouvements_debit_idx ON nkr_mouvements (debit, rang DESC);
CREATE INDEX nkr_mouvements_credit_idx ON nkr_mouvements (credit, rang DESC);

-- Tête de la chaîne (une seule ligne) : verrouillée pendant chaque écriture pour garder l'ordre.
CREATE TABLE nkr_chaine (
  id           boolean PRIMARY KEY DEFAULT true CHECK (id),
  dernier_rang bigint NOT NULL DEFAULT 0,
  dernier_hash text NOT NULL
);
INSERT INTO nkr_chaine (dernier_hash) VALUES ('0000000000000000000000000000000000000000000000000000000000000000');

-- Ancrages : racine de Merkle des empreintes des mouvements (de_rang à jusqu_au_rang), publiée ou non sur une blockchain.
CREATE TABLE nkr_ancrages (
  id             bigserial PRIMARY KEY,
  de_rang        bigint NOT NULL,
  jusqu_au_rang  bigint NOT NULL,
  racine         text NOT NULL,
  reseau         text NOT NULL DEFAULT 'aucun',      -- aucun | polygon | base | … (où la racine a été publiée)
  transaction    text,                               -- identifiant de la transaction sur la blockchain
  created_at     timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK (jusqu_au_rang >= de_rang)
);

-- Interdit toute modification ou suppression des mouvements, même par erreur dans un script.
CREATE FUNCTION nkr_interdire_retouche() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Les mouvements Nkorouna ne se modifient pas : passer une contre-écriture.';
END $$;
CREATE TRIGGER nkr_mouvements_immuables BEFORE UPDATE OR DELETE ON nkr_mouvements FOR EACH ROW EXECUTE FUNCTION nkr_interdire_retouche();
