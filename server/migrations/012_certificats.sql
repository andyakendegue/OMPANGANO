-- Certificats d'Onenji : un par parcours terminé (toutes les unités validées), numéroté NKL-AAAA-000123, vérifiable publiquement.
CREATE TABLE IF NOT EXISTS certificats (
  rang         bigserial PRIMARY KEY,
  numero       text NOT NULL UNIQUE,
  user_id      text NOT NULL,
  parcours_id  text NOT NULL,
  nom          text NOT NULL,
  titre        text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (user_id, parcours_id)
);
CREATE INDEX IF NOT EXISTS certificats_user_idx ON certificats (user_id, created_at DESC);
