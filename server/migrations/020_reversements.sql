-- Vidéos en streaming, masterclass et reversements (décision de Capp du 15 nov. 2026 ; audit Apprendre §18).
-- Aucun taux ici : les taux, coefficients et pondérations sont des paramètres versionnés (table reversements_parametres),
-- réglés dans la console. La méthode de calcul est appliquée par noyau/reversements.ts (pur) et api/src/reversements.ts.

-- 1. Minutes regardées : un passage = une licence de lecture ; le lecteur envoie un battement, le serveur compte (plafonné).
CREATE TABLE IF NOT EXISTS lecture_passages (
  id          text PRIMARY KEY,                       -- lp_<hex>, rendu avec la licence
  user_id     text NOT NULL,
  collection  text NOT NULL,                          -- cours_artisans | chapitres
  contenu_id  text NOT NULL,
  cours_id    text NOT NULL,                          -- la vidéo (cours_artisans) à laquelle on rattache les minutes
  igolani     boolean NOT NULL DEFAULT false,         -- abonné à une formule qui ouvre Igolani au début du passage
  plans       text[] NOT NULL DEFAULT '{}',           -- formules actives au début du passage
  debut       timestamptz NOT NULL DEFAULT clock_timestamp(),
  dernier     timestamptz NOT NULL DEFAULT clock_timestamp(),
  secondes    integer NOT NULL DEFAULT 0 CHECK (secondes >= 0)
);
CREATE INDEX IF NOT EXISTS lecture_passages_debut_idx ON lecture_passages (debut);
CREATE INDEX IF NOT EXISTS lecture_passages_user_idx ON lecture_passages (user_id, cours_id);

-- 2. Temps d'utilisation par module et par jour (répartition d'une formule qui ouvre plusieurs modules).
CREATE TABLE IF NOT EXISTS temps_modules (
  user_id   text NOT NULL,
  module    text NOT NULL,                            -- onenji | igolani | azeva | ontci | nkala | ompangano | kakigonjo
  jour      date NOT NULL,
  secondes  integer NOT NULL DEFAULT 0 CHECK (secondes >= 0),
  dernier   timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (user_id, module, jour)
);
CREATE INDEX IF NOT EXISTS temps_modules_jour_idx ON temps_modules (jour);

-- 3. Paiements : ce qui a été réellement encaissé et ce qui se déduit (revenus nets = encaissé − frais − commission − taxe − remboursé).
ALTER TABLE paiements ADD COLUMN IF NOT EXISTS encaisse_fcfa   integer;               -- NULL = montant_fcfa
ALTER TABLE paiements ADD COLUMN IF NOT EXISTS frais_fcfa      integer NOT NULL DEFAULT 0;
ALTER TABLE paiements ADD COLUMN IF NOT EXISTS commission_fcfa integer NOT NULL DEFAULT 0;
ALTER TABLE paiements ADD COLUMN IF NOT EXISTS taxe_fcfa       integer NOT NULL DEFAULT 0;
ALTER TABLE paiements ADD COLUMN IF NOT EXISTS rembourse_fcfa  integer NOT NULL DEFAULT 0;
ALTER TABLE achats_recus ADD COLUMN IF NOT EXISTS encaisse_fcfa   integer;
ALTER TABLE achats_recus ADD COLUMN IF NOT EXISTS commission_fcfa integer NOT NULL DEFAULT 0;
ALTER TABLE achats_recus ADD COLUMN IF NOT EXISTS taxe_fcfa       integer NOT NULL DEFAULT 0;
ALTER TABLE achats_recus ADD COLUMN IF NOT EXISTS rembourse_fcfa  integer NOT NULL DEFAULT 0;

-- 4. Masterclass : statut du cours (une annulation garde la trace pour les remboursements et les reversements).
ALTER TABLE cours_planifies ADD COLUMN IF NOT EXISTS statut text NOT NULL DEFAULT 'prevu';   -- prevu | annule
ALTER TABLE cours_planifies ADD COLUMN IF NOT EXISTS annule_le timestamptz;
ALTER TABLE cours_planifies ADD COLUMN IF NOT EXISTS prix_choisi boolean NOT NULL DEFAULT false;  -- prix choisi par le professeur dans la fourchette

-- 5. Bénéficiaires des reversements.
CREATE TABLE IF NOT EXISTS beneficiaires (
  id               text PRIMARY KEY,                  -- ben_<hex>
  type             text NOT NULL CHECK (type IN ('contributeur_special', 'createur', 'professeur', 'association')),
  nom              text NOT NULL,
  user_id          text,                              -- compte Nkala (pour voir ses relevés) ; professeur : l'hôte des masterclass
  contrat          text,                              -- référence du contrat signé
  date_signature   date,
  date_pv          date,                              -- contributeur spécial : procès-verbal de validation complète
  coordonnees      jsonb NOT NULL DEFAULT '{}',       -- Mobile Money, virement
  seuil_fcfa       integer NOT NULL DEFAULT 0,        -- sous ce montant, report au trimestre suivant
  retenue_pct      numeric NOT NULL DEFAULT 0,        -- retenue à la source si la loi l'impose
  options          jsonb NOT NULL DEFAULT '{}',       -- options du contrat (ex. part publicitaire des créateurs)
  actif            boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX IF NOT EXISTS beneficiaires_user_idx ON beneficiaires (user_id);

-- Membres des associations (leurs contributions validées comptent pour l'enveloppe de l'association).
CREATE TABLE IF NOT EXISTS association_membres (
  association_id  text NOT NULL REFERENCES beneficiaires (id),
  user_id         text NOT NULL,
  depuis          date NOT NULL DEFAULT current_date,
  PRIMARY KEY (association_id, user_id)
);

-- Part des unités de contribution de chaque contributeur dans le jeu d'entraînement de chaque modèle.
CREATE TABLE IF NOT EXISTS modele_entrainement (
  modele   text NOT NULL,
  user_id  text NOT NULL,
  uc       numeric NOT NULL CHECK (uc >= 0),
  PRIMARY KEY (modele, user_id)
);

-- 6. Paramètres versionnés (taux, coefficients des zones, pondérations des unités de contribution, clés de répartition).
CREATE TABLE IF NOT EXISTS reversements_parametres (
  version     serial PRIMARY KEY,
  date_effet  date NOT NULL,
  valeurs     jsonb NOT NULL,
  par         text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT clock_timestamp()
);

-- 7. Recettes publicitaires par zone et par jour (régie, forfaits, CPM).
CREATE TABLE IF NOT EXISTS recettes_pub (
  jour          date NOT NULL,
  zone          text NOT NULL,
  montant_fcfa  integer NOT NULL CHECK (montant_fcfa >= 0),
  source        text NOT NULL DEFAULT 'console',
  par           text,
  PRIMARY KEY (jour, zone, source)
);

-- 8. Opérations exceptionnelles (définition étroite du contrat du contributeur spécial).
CREATE TABLE IF NOT EXISTS operations_exceptionnelles (
  id              text PRIMARY KEY,
  jour            date NOT NULL,
  contrepartie    text NOT NULL,
  objet           text NOT NULL,
  montant_fcfa    bigint NOT NULL CHECK (montant_fcfa >= 0),
  couts_directs   bigint NOT NULL DEFAULT 0 CHECK (couts_directs >= 0),
  part_apport     numeric,                            -- 0 à 1 ; NULL = part par défaut des paramètres
  piece           text,
  par             text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT clock_timestamp()
);

-- 9. Calculs trimestriels et relevés : un calcul validé est scellé (chaîne d'empreintes) ; on corrige par un calcul rectificatif.
CREATE TABLE IF NOT EXISTS reversements_calculs (
  id                text PRIMARY KEY,                 -- rc_<hex>
  trimestre         text NOT NULL,                    -- 2026-T4
  version_params    integer NOT NULL REFERENCES reversements_parametres (version),
  statut            text NOT NULL DEFAULT 'calcule' CHECK (statut IN ('calcule', 'valide', 'remplace')),
  rectifie          text,                             -- calcul validé qu'il corrige
  entrees           jsonb NOT NULL,                   -- données d'entrée agrégées (pour refaire le calcul à l'identique)
  totaux            jsonb NOT NULL,
  par               text NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT clock_timestamp(),
  valide_par        text,
  valide_le         timestamptz,
  hash_precedent    text,
  hash              text UNIQUE
);
CREATE INDEX IF NOT EXISTS reversements_calculs_trim_idx ON reversements_calculs (trimestre, statut);

CREATE TABLE IF NOT EXISTS releves (
  id               text PRIMARY KEY,                  -- rel_<hex>
  calcul_id        text NOT NULL REFERENCES reversements_calculs (id),
  beneficiaire_id  text NOT NULL REFERENCES beneficiaires (id),
  trimestre        text NOT NULL,
  detail           jsonb NOT NULL,                    -- chaque part : assiette, taux, montant
  brut_fcfa        bigint NOT NULL,
  report_entrant   bigint NOT NULL DEFAULT 0,
  retenue_fcfa     bigint NOT NULL DEFAULT 0,
  a_payer_fcfa     bigint NOT NULL,
  report_sortant   bigint NOT NULL DEFAULT 0,
  statut           text NOT NULL DEFAULT 'calcule' CHECK (statut IN ('calcule', 'valide', 'paye', 'remplace')),
  reference_versement text,
  paye_le          timestamptz
);
CREATE INDEX IF NOT EXISTS releves_benef_idx ON releves (beneficiaire_id, trimestre);
