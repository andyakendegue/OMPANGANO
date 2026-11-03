-- Courriels envoyés aux utilisateurs (bienvenue, rappel de filiation) : évite tout double envoi et borne les rappels.
CREATE TABLE user_mails (
  id       bigserial PRIMARY KEY,
  user_id  text NOT NULL,
  kind     text NOT NULL,                 -- bienvenue | filiation
  to_email text NOT NULL,
  sent_at  timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX user_mails_user_kind_idx ON user_mails (user_id, kind, sent_at DESC);
