-- Paiements Mobile Money (système propre à Nkala) : un paiement = une demande, une référence, un statut ; la confirmation accorde le droit.
CREATE TABLE paiements (
  id                   text PRIMARY KEY,
  reference            text NOT NULL UNIQUE,           -- référence à indiquer lors du paiement (NK-XXXXXX)
  user_id              text NOT NULL,
  produit_id           text NOT NULL,
  montant_fcfa         integer NOT NULL,
  operateur            text NOT NULL,                  -- airtel | moov
  telephone            text NOT NULL,                  -- numéro qui paie (E.164)
  mode                 text NOT NULL,                  -- simulation | manuel | api
  statut               text NOT NULL DEFAULT 'en_attente', -- en_attente | declare | confirme | echoue | refuse | expire
  transaction_operateur text,                          -- identifiant de transaction donné par l'opérateur
  reference_externe    text,                           -- identifiant côté agrégateur (mode api)
  instructions         jsonb NOT NULL DEFAULT '{}',
  note                 text,
  created_at           timestamptz NOT NULL DEFAULT clock_timestamp(),
  expire_at            timestamptz NOT NULL,
  confirme_at          timestamptz,
  confirme_par         text
);
CREATE INDEX paiements_user_idx ON paiements (user_id, created_at DESC);
CREATE INDEX paiements_statut_idx ON paiements (statut, created_at DESC);
CREATE UNIQUE INDEX paiements_transaction_uniq ON paiements (operateur, transaction_operateur) WHERE transaction_operateur IS NOT NULL AND statut IN ('declare','confirme');
