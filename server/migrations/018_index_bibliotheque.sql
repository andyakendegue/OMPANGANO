-- Bibliothèque servie par morceaux (14 nov. 2026) : retrouver vite les chapitres d'un livre parmi ~150 000.
CREATE INDEX IF NOT EXISTS contenus_chapitres_livre_idx ON contenus ((data->>'livre_id')) WHERE collection = 'livre_chapitres' AND deleted_at IS NULL;
