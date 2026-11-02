-- Protection du corpus contre les écrasements par d'anciennes données.
--  * rejected_phrases : phrases écartées (jamais acceptées par une écriture ou un import).
--  * item_audit : journal des modifications de fiches (qui, quand, d'où, ancien et nouveau texte) et des écritures refusées.

CREATE TABLE rejected_phrases (
  key        text PRIMARY KEY,                 -- texte myènè normalisé (voir normalizePhraseComparisonKey)
  myene_text text NOT NULL,
  reason     text NOT NULL DEFAULT '',
  created_by text,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE item_audit (
  id                bigserial PRIMARY KEY,
  at                timestamptz NOT NULL DEFAULT clock_timestamp(),
  item_id           text NOT NULL,
  action            text NOT NULL,             -- cree | modifie | corrige_seed | rejete_ancien | rejete_refusee
  actor             text,                      -- uid Firebase de l'administrateur (null = serveur)
  source            text,                      -- put | batch | import | serveur
  old_myene         text,
  new_myene         text,
  old_french        text,
  new_french        text,
  client_updated_at text,                      -- date portée par l'écriture reçue
  server_updated_at timestamptz,               -- date de la version enregistrée sur le serveur
  detail            text
);
CREATE INDEX item_audit_item_idx ON item_audit (item_id, at DESC);
CREATE INDEX item_audit_action_idx ON item_audit (action, at DESC);
