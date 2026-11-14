-- Recherche hybride du RAG (14 nov. 2026) : index plein texte des morceaux, en minuscules et sans accents, pour compléter la recherche
-- par vecteurs (mots rares, noms propres, mots myènè que les embeddings rapprochent mal). Même expression que dans ia.ts (texteRecherche).
CREATE INDEX IF NOT EXISTS ia_chunks_texte_idx ON ia_chunks USING gin (
  to_tsvector('simple'::regconfig, translate(lower(texte), 'àâäáãåçéèêëíìîïñóòôöõúùûüýÿœæɛɔŋ', 'aaaaaaceeeeiiiinooooouuuuyyoaeon'))
);
