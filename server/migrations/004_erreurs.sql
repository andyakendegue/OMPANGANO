-- Journal des erreurs (serveur et navigateurs) : lu toutes les 5 minutes par backup/alertes.py, qui envoie un résumé par e-mail.
CREATE TABLE app_errors (
  id          bigserial PRIMARY KEY,
  at          timestamptz NOT NULL DEFAULT clock_timestamp(),
  source      text NOT NULL,              -- serveur | navigateur
  fingerprint text NOT NULL,              -- empreinte du message + de la première ligne de pile (regroupement)
  message     text NOT NULL,
  stack       text,
  url         text,                       -- route appelée (serveur) ou page (navigateur)
  user_id     text,
  ip          text,
  user_agent  text,
  ctx         jsonb NOT NULL DEFAULT '{}'
);
CREATE INDEX app_errors_at_idx ON app_errors (at DESC);
CREATE INDEX app_errors_fp_idx ON app_errors (fingerprint, at DESC);
