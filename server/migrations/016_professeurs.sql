-- Professeurs des cours à distance (14 nov. 2026) : nommés par un administrateur ; seuls eux et les administrateurs créent des salles.
-- Rôle à part (une table) : il s'ajoute au rôle du compte (contributeur, validateur) sans le remplacer, et le site web n'en dépend pas.
CREATE TABLE IF NOT EXISTS professeurs (
  user_id     text PRIMARY KEY,
  nomme_par   text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT clock_timestamp()
);
-- Prix de la séance fixé à la création d'après le tarif générique des administrateurs (le professeur ne le choisit pas).
ALTER TABLE cours_planifies ADD COLUMN IF NOT EXISTS prix_fcfa integer NOT NULL DEFAULT 0;
ALTER TABLE cours_planifies ADD COLUMN IF NOT EXISTS cree_par text;
