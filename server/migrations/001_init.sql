-- OMPANGANO : schéma initial (PostgreSQL 16+)
-- Toutes les tables ont : id texte, created_at, updated_at (trigger), deleted_at (suppression logique,
-- propagée aux appareils hors-ligne par /v1/sync).

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = clock_timestamp();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------- users
-- Les champs protégés (rôle, statut, XP, badges, compteurs) ont leurs propres colonnes :
-- seul le serveur les écrit. Le reste du profil est dans data.
CREATE TABLE users (
  id                  text PRIMARY KEY,
  email               text,
  role                text NOT NULL DEFAULT 'user' CHECK (role IN ('user','validator','admin')),
  status              text NOT NULL DEFAULT 'active' CHECK (status IN ('active','flagged','suspended')),
  suspicion_score     integer NOT NULL DEFAULT 0,
  xp                  integer NOT NULL DEFAULT 0,
  level               text NOT NULL DEFAULT 'Initié Curieux',
  level_index         integer NOT NULL DEFAULT 1,
  badges              jsonb NOT NULL DEFAULT '[]',
  contributions_count integer NOT NULL DEFAULT 0,
  recordings_count    integer NOT NULL DEFAULT 0,
  validations_count   integer NOT NULL DEFAULT 0,
  weekly_progress     jsonb NOT NULL DEFAULT '{}',
  completed_challenges jsonb NOT NULL DEFAULT '[]',
  last_contribution_date text,
  data                jsonb NOT NULL DEFAULT '{}',
  created_at          timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at          timestamptz NOT NULL DEFAULT clock_timestamp(),
  deleted_at          timestamptz
);
CREATE INDEX users_updated_at_idx ON users (updated_at);
CREATE INDEX users_email_idx ON users (lower(email));

-- ---------------------------------------------------------------- admins
CREATE TABLE admins (
  id          text PRIMARY KEY,
  data        jsonb NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at  timestamptz NOT NULL DEFAULT clock_timestamp(),
  deleted_at  timestamptz
);
CREATE INDEX admins_updated_at_idx ON admins (updated_at);

-- ---------------------------------------------------------------- items (phrases du catalogue)
CREATE TABLE items (
  id          text PRIMARY KEY,
  source_ref  text,
  dialect     text,
  category    text,
  status      text NOT NULL DEFAULT 'active',
  data        jsonb NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at  timestamptz NOT NULL DEFAULT clock_timestamp(),
  deleted_at  timestamptz
);
CREATE INDEX items_updated_at_idx ON items (updated_at);
CREATE UNIQUE INDEX items_source_ref_uniq ON items (source_ref) WHERE source_ref IS NOT NULL;

-- ---------------------------------------------------------------- contributions
CREATE TABLE contributions (
  id                      text PRIMARY KEY,
  item_id                 text,
  user_id                 text NOT NULL,
  status                  text NOT NULL DEFAULT 'pending',
  rewarded_xp             integer NOT NULL DEFAULT 0,
  rewarded_contribution   smallint NOT NULL DEFAULT 0,
  rewarded_recording      smallint NOT NULL DEFAULT 0,
  counted_challenge_ids   jsonb NOT NULL DEFAULT '[]',
  audio_storage_path      text,
  audio_mime_type         text,
  validator_id            text,
  data                    jsonb NOT NULL DEFAULT '{}',
  created_at              timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at              timestamptz NOT NULL DEFAULT clock_timestamp(),
  deleted_at              timestamptz
);
CREATE INDEX contributions_updated_at_idx ON contributions (updated_at);
CREATE INDEX contributions_user_id_idx ON contributions (user_id);
CREATE INDEX contributions_status_idx ON contributions (status);
CREATE INDEX contributions_item_id_idx ON contributions (item_id);

-- ---------------------------------------------------------------- catalogues simples
CREATE TABLE clans      (id text PRIMARY KEY, data jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT clock_timestamp(), updated_at timestamptz NOT NULL DEFAULT clock_timestamp(), deleted_at timestamptz);
CREATE TABLE villages   (id text PRIMARY KEY, data jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT clock_timestamp(), updated_at timestamptz NOT NULL DEFAULT clock_timestamp(), deleted_at timestamptz);
CREATE TABLE themes     (id text PRIMARY KEY, data jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT clock_timestamp(), updated_at timestamptz NOT NULL DEFAULT clock_timestamp(), deleted_at timestamptz);
CREATE TABLE badges     (id text PRIMARY KEY, data jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT clock_timestamp(), updated_at timestamptz NOT NULL DEFAULT clock_timestamp(), deleted_at timestamptz);
CREATE TABLE challenges (id text PRIMARY KEY, data jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT clock_timestamp(), updated_at timestamptz NOT NULL DEFAULT clock_timestamp(), deleted_at timestamptz);
CREATE TABLE metrics    (id text PRIMARY KEY, data jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT clock_timestamp(), updated_at timestamptz NOT NULL DEFAULT clock_timestamp(), deleted_at timestamptz);
CREATE INDEX clans_updated_at_idx      ON clans (updated_at);
CREATE INDEX villages_updated_at_idx   ON villages (updated_at);
CREATE INDEX themes_updated_at_idx     ON themes (updated_at);
CREATE INDEX badges_updated_at_idx     ON badges (updated_at);
CREATE INDEX challenges_updated_at_idx ON challenges (updated_at);
CREATE INDEX metrics_updated_at_idx    ON metrics (updated_at);

-- ---------------------------------------------------------------- triggers updated_at
CREATE TRIGGER users_touch         BEFORE UPDATE ON users         FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER admins_touch        BEFORE UPDATE ON admins        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER items_touch         BEFORE UPDATE ON items         FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER contributions_touch BEFORE UPDATE ON contributions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER clans_touch         BEFORE UPDATE ON clans         FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER villages_touch      BEFORE UPDATE ON villages      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER themes_touch        BEFORE UPDATE ON themes        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER badges_touch        BEFORE UPDATE ON badges        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER challenges_touch    BEFORE UPDATE ON challenges    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER metrics_touch       BEFORE UPDATE ON metrics       FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------- classement public
-- Uniquement ce qui peut être montré à tous (loi gabonaise n° 001/2011).
CREATE VIEW leaderboard AS
SELECT
  id,
  COALESCE(data->>'displayName', '')                         AS display_name,
  COALESCE(data->>'fullName', data->>'displayName', '')      AS full_name,
  COALESCE(data->>'photoURL', '')                            AS photo_url,
  COALESCE(data->>'tribe', '')                               AS tribe,
  COALESCE(data->>'villageOfOrigin', '')                     AS village_of_origin,
  xp, level, level_index, contributions_count, recordings_count, validations_count,
  jsonb_array_length(badges)                                 AS badges_count,
  updated_at
FROM users
WHERE deleted_at IS NULL AND status <> 'suspended';
