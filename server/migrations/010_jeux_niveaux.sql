-- Azeva : niveau de difficulté joué et XP accordée, par partie (le plafond quotidien d'XP se calcule sur la colonne xp).
ALTER TABLE scores ADD COLUMN niveau integer NOT NULL DEFAULT 1;
ALTER TABLE scores ADD COLUMN xp integer;
CREATE INDEX scores_jeu_niveau_idx ON scores (jeu_id, niveau, score DESC);
