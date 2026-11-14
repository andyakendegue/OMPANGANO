-- Planning des cours à distance d'Onenji : un cours prévu a un code (celui de la salle), une heure, une durée et au plus 4 inscrits (hôte compris).
CREATE TABLE IF NOT EXISTS cours_planifies (
  code        text PRIMARY KEY,
  hote_id     text NOT NULL,
  titre       text NOT NULL,
  debut       timestamptz NOT NULL,
  duree_min   integer NOT NULL CHECK (duree_min BETWEEN 15 AND 180),
  inscrits    text[] NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX IF NOT EXISTS cours_planifies_debut_idx ON cours_planifies (debut);
