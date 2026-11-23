-- Mémoire par utilisateur (Kak'Igonjo connaît chaque apprenant)
CREATE TABLE IF NOT EXISTS ia_memoire_utilisateur (
  utilisateur_id  text PRIMARY KEY,
  resume          text NOT NULL DEFAULT '',
  progression     jsonb NOT NULL DEFAULT '{}',
  style           jsonb NOT NULL DEFAULT '{}',
  mise_a_jour     timestamptz NOT NULL DEFAULT clock_timestamp()
);

-- Corrections validées : alimentent un document rang 0 dans le RAG, permettent l'apprentissage par l'expérience
CREATE TABLE IF NOT EXISTS ia_corrections (
  id          bigserial PRIMARY KEY,
  type        text NOT NULL CHECK (type IN ('erreur','regle','lexique')),
  question    text,
  reponse_erronee text,
  reponse_correcte text NOT NULL,
  section     text,
  note        text,
  par         text,
  valide      boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX IF NOT EXISTS ia_corrections_valide_idx ON ia_corrections (valide, created_at DESC);

-- Journal de réinitialisation de progression (audit)
CREATE TABLE IF NOT EXISTS ia_reset_progression (
  id              bigserial PRIMARY KEY,
  utilisateur_id  text,
  par             text NOT NULL,
  portee          text NOT NULL DEFAULT 'tout',
  jeux_ids        text[],
  created_at      timestamptz NOT NULL DEFAULT clock_timestamp()
);
