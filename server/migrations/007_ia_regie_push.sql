-- IA (prompts versionnés, documents du RAG, morceaux avec vecteurs), régie publicitaire, notifications poussées.

CREATE TABLE ia_prompts (
  id         bigserial PRIMARY KEY,
  nom        text NOT NULL,
  contenu    text NOT NULL,
  actif      boolean NOT NULL DEFAULT false,
  par        text,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE UNIQUE INDEX ia_prompts_actif_idx ON ia_prompts (actif) WHERE actif;

CREATE TABLE ia_documents (
  id         text PRIMARY KEY,
  titre      text NOT NULL,
  source     text,
  texte      text NOT NULL,
  actif      boolean NOT NULL DEFAULT true,
  nb_chunks  integer NOT NULL DEFAULT 0,
  modele     text,
  par        text,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

-- Vecteurs en jsonb (pas d'extension nécessaire) ; la similarité est calculée par l'API. pgvector pourra remplacer sans changer les routes.
CREATE TABLE ia_chunks (
  id          bigserial PRIMARY KEY,
  document_id text NOT NULL REFERENCES ia_documents(id) ON DELETE CASCADE,
  ordre       integer NOT NULL,
  texte       text NOT NULL,
  embedding   jsonb NOT NULL
);
CREATE INDEX ia_chunks_doc_idx ON ia_chunks (document_id, ordre);

CREATE TABLE push_jetons (
  jeton      text PRIMARY KEY,
  user_id    text NOT NULL,
  plateforme text,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX push_jetons_user_idx ON push_jetons (user_id);

CREATE TABLE push_envois (
  id      bigserial PRIMARY KEY,
  titre   text NOT NULL,
  corps   text NOT NULL,
  cible   jsonb NOT NULL DEFAULT '{}',
  nb      integer NOT NULL DEFAULT 0,
  ok      integer NOT NULL DEFAULT 0,
  simule  boolean NOT NULL DEFAULT false,
  par     text,
  at      timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE regie_annonceurs (
  id         text PRIMARY KEY,
  nom        text NOT NULL,
  contact    text,
  statut     text NOT NULL DEFAULT 'actif',
  revive_id  text,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE regie_campagnes (
  id           text PRIMARY KEY,
  annonceur_id text NOT NULL REFERENCES regie_annonceurs(id),
  nom          text NOT NULL,
  debut        date,
  fin          date,
  budget_fcfa  integer NOT NULL DEFAULT 0,
  plafond_jour integer NOT NULL DEFAULT 0,
  statut       text NOT NULL DEFAULT 'brouillon',   -- brouillon | active | pause | terminee
  revive_id    text,
  created_at   timestamptz NOT NULL DEFAULT clock_timestamp()
);

-- Achats : reçus des magasins déjà traités (évite de créditer deux fois le même reçu)
CREATE TABLE achats_recus (
  reference  text PRIMARY KEY,
  user_id    text NOT NULL,
  produit_id text NOT NULL,
  magasin    text NOT NULL,
  at         timestamptz NOT NULL DEFAULT clock_timestamp()
);
