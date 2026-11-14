-- Chats de l'assistant : plusieurs conversations par utilisateur, messages gardés côté serveur, contexte mesuré, coût et frais d'excès.
CREATE TABLE IF NOT EXISTS ia_chats (
  id              text PRIMARY KEY,
  user_id         text NOT NULL,
  titre           text NOT NULL DEFAULT 'Nouveau chat',
  -- Contexte du prochain envoi, en jetons (entrée + sortie du dernier appel, mesurées par le fournisseur)
  contexte_jetons integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at      timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX IF NOT EXISTS ia_chats_user_idx ON ia_chats (user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS ia_messages (
  id       bigserial PRIMARY KEY,
  chat_id  text NOT NULL REFERENCES ia_chats (id) ON DELETE CASCADE,
  role     text NOT NULL CHECK (role IN ('user', 'assistant')),
  contenu  text NOT NULL,
  at       timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX IF NOT EXISTS ia_messages_chat_idx ON ia_messages (chat_id, id);

-- Par appel : coût réel du modèle, part du contexte en excès et frais comptés à l'utilisateur
ALTER TABLE ia_usage ADD COLUMN IF NOT EXISTS cout numeric(14,4) NOT NULL DEFAULT 0;
ALTER TABLE ia_usage ADD COLUMN IF NOT EXISTS jetons_exces integer NOT NULL DEFAULT 0;
ALTER TABLE ia_usage ADD COLUMN IF NOT EXISTS frais numeric(14,4) NOT NULL DEFAULT 0;
ALTER TABLE ia_usage ADD COLUMN IF NOT EXISTS devise text;
CREATE INDEX IF NOT EXISTS ia_usage_conv_idx ON ia_usage (conversation_id);
