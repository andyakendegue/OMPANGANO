-- Statistiques de fréquentation : une ligne par session de visite, une ligne par onglet consulté.
-- L'adresse IP est conservée telle quelle (demande du propriétaire) ; le pays est déduit de l'IP sur le serveur.
CREATE TABLE visit_sessions (
  id           text PRIMARY KEY,                -- identifiant aléatoire de session (navigateur)
  visitor_id   text NOT NULL,                   -- identifiant aléatoire du navigateur (visiteurs uniques)
  started_at   timestamptz NOT NULL DEFAULT clock_timestamp(),
  last_seen_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  ip           text,
  country      text,                            -- code pays ISO 3166-1 alpha-2, null si inconnu
  device_type  text,                            -- mobile | tablette | ordinateur
  os           text,
  browser      text,
  screen       text,
  lang         text,
  referrer     text,
  user_id      text,                            -- renseigné quand la personne est connectée
  duration_s   integer NOT NULL DEFAULT 0       -- temps actif cumulé de la session
);
CREATE INDEX visit_sessions_started_idx ON visit_sessions (started_at DESC);
CREATE INDEX visit_sessions_visitor_idx ON visit_sessions (visitor_id);

CREATE TABLE visit_tab_views (
  id         bigserial PRIMARY KEY,
  session_id text NOT NULL REFERENCES visit_sessions(id) ON DELETE CASCADE,
  tab        text NOT NULL,
  at         timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX visit_tab_views_at_idx ON visit_tab_views (at DESC);
CREATE INDEX visit_tab_views_session_idx ON visit_tab_views (session_id);
