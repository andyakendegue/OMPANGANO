-- Socle myènè de Kak'Igonjo (15 nov. 2026) : grammaire et lexique ajoutés au prompt à chaque question (≈ 4 000 jetons).
-- Ils sont comptés dans jetons_entree (coût réel, supervision, reversements) mais pas dans les quotas ni le contexte des utilisateurs :
-- consommation() retire jetons_socle. Colonne ajoutée, aucune donnée modifiée.
ALTER TABLE ia_usage ADD COLUMN IF NOT EXISTS jetons_socle integer NOT NULL DEFAULT 0;
