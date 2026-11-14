-- Sécurité et données personnelles (ISO 27001 A.5.34, A.8.10 ; SECURITE_ISO27001.md)
-- Comptes supprimés : seule une empreinte SHA-256 de l'identifiant est gardée, pour refuser les jetons émis avant la suppression.
CREATE TABLE IF NOT EXISTS comptes_supprimes (
  empreinte  text PRIMARY KEY,
  at         timestamptz NOT NULL DEFAULT clock_timestamp()
);

-- Dernière purge des données arrivées au terme de leur durée de conservation
CREATE TABLE IF NOT EXISTS purges (
  id      bigserial PRIMARY KEY,
  at      timestamptz NOT NULL DEFAULT clock_timestamp(),
  detail  jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS visit_sessions_started_idx ON visit_sessions (started_at);
CREATE INDEX IF NOT EXISTS app_errors_at_idx ON app_errors (at);
CREATE INDEX IF NOT EXISTS sms_essais_at_idx ON sms_essais (at);
CREATE INDEX IF NOT EXISTS pub_evenements_at_idx ON pub_evenements (at);
