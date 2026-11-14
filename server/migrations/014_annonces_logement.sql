-- Annonces de logement (Village) : fiche structurée dans contenus.data->'logement', position publique en colonnes
-- pour filtrer par distance, position réelle masquée à part (data_privee, jamais renvoyée par une route publique),
-- suivi des URL d'envoi demandées (limite quotidienne) et des médias à effacer.
-- Les colonnes lat/lng sont écrites par l'API (pas de colonne générée : plus simple à tester sous PGlite).

ALTER TABLE contenus ADD COLUMN IF NOT EXISTS lat double precision;
ALTER TABLE contenus ADD COLUMN IF NOT EXISTS lng double precision;
ALTER TABLE contenus ADD COLUMN IF NOT EXISTS data_privee jsonb;

CREATE INDEX IF NOT EXISTS contenus_annonces_geo_idx ON contenus (lat, lng) WHERE collection = 'annonces' AND publie AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS contenus_annonces_cat_idx ON contenus ((data->>'categorie_id'), created_at DESC) WHERE collection = 'annonces';

-- URL d'envoi demandées pour les médias d'annonce (60 par jour et par compte au plus).
CREATE TABLE IF NOT EXISTS medias_annonces_envois (
  id       bigserial PRIMARY KEY,
  user_id  text NOT NULL,
  chemin   text NOT NULL,
  octets   bigint NOT NULL,
  at       timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX IF NOT EXISTS medias_annonces_envois_user_idx ON medias_annonces_envois (user_id, at DESC);

-- Médias d'annonces refusées ou supprimées : effacés du stockage après 30 jours (scripts/purger_medias_annonces.ts).
CREATE TABLE IF NOT EXISTS medias_annonces_a_effacer (
  chemin     text PRIMARY KEY,
  annonce_id text NOT NULL,
  raison     text NOT NULL,
  at         timestamptz NOT NULL DEFAULT clock_timestamp(),
  efface_le  timestamptz
);
