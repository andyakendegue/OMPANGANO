-- Nkala : contenus pilotés par fichiers, paramètres, progression, scores, IA, publicité, droits, journal d'administration.

-- Contenus (JSON/CSV importés par l'administration, ou créés par les utilisateurs : annonces, signalements, idées…)
CREATE TABLE contenus (
  collection  text NOT NULL,
  id          text NOT NULL,
  data        jsonb NOT NULL DEFAULT '{}',
  publie      boolean NOT NULL DEFAULT false,
  statut      text NOT NULL DEFAULT 'publie',      -- publie | brouillon | en_attente | refuse
  owner_id    text,                                 -- auteur pour les contenus d'utilisateurs
  created_at  timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at  timestamptz NOT NULL DEFAULT clock_timestamp(),
  deleted_at  timestamptz,
  PRIMARY KEY (collection, id)
);
CREATE INDEX contenus_pub_idx ON contenus (collection, publie, updated_at);
CREATE INDEX contenus_owner_idx ON contenus (owner_id, collection) WHERE owner_id IS NOT NULL;

CREATE TABLE contenus_imports (
  id         bigserial PRIMARY KEY,
  collection text NOT NULL,
  par        text NOT NULL,
  format     text NOT NULL,
  mode       text NOT NULL,
  total      integer NOT NULL,
  valides    integer NOT NULL,
  erreurs    integer NOT NULL,
  at         timestamptz NOT NULL DEFAULT clock_timestamp()
);

-- Interrupteurs et réglages modifiables depuis la console (modules, fonctions, quotas IA, plafonds)
CREATE TABLE parametres (
  cle        text PRIMARY KEY,
  valeur     jsonb NOT NULL,
  par        text,
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

-- Progression de l'apprenant et du joueur (un profil, un XP pour tous les modules)
CREATE TABLE progression (
  user_id    text PRIMARY KEY,
  data       jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

-- Parties jouées : le score est recalculé par le serveur
CREATE TABLE scores (
  id         bigserial PRIMARY KEY,
  user_id    text NOT NULL,
  jeu_id     text NOT NULL,
  score      integer NOT NULL,
  bonnes     integer NOT NULL DEFAULT 0,
  erreurs    integer NOT NULL DEFAULT 0,
  jour       date NOT NULL DEFAULT current_date,
  at         timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX scores_user_idx ON scores (user_id, at DESC);
CREATE INDEX scores_jeu_idx ON scores (jeu_id, score DESC);
CREATE INDEX scores_jour_idx ON scores (jour);

-- Journal de l'assistant IA (comptage des jetons)
CREATE TABLE ia_usage (
  id              bigserial PRIMARY KEY,
  user_id         text NOT NULL,
  conversation_id text NOT NULL,
  modele          text NOT NULL,
  jetons_entree   integer NOT NULL DEFAULT 0,
  jetons_sortie   integer NOT NULL DEFAULT 0,
  jetons_cache    integer NOT NULL DEFAULT 0,
  simule          boolean NOT NULL DEFAULT false,
  at              timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX ia_usage_user_idx ON ia_usage (user_id, at DESC);

-- Abonnements et achats (reçus validés par l'étape E2 ; accordés à la main par l'administration en attendant)
CREATE TABLE droits (
  id         bigserial PRIMARY KEY,
  user_id    text NOT NULL,
  produit_id text NOT NULL,
  type       text NOT NULL,                  -- abonnement | achat | essai | location
  contenu_id text,                           -- pour achat, essai, location
  debut      timestamptz NOT NULL DEFAULT clock_timestamp(),
  fin        timestamptz,
  source     text NOT NULL DEFAULT 'admin',  -- admin | apple | google | mobile_money
  reference  text,
  statut     text NOT NULL DEFAULT 'actif'   -- actif | rembourse | annule
);
CREATE INDEX droits_user_idx ON droits (user_id, statut);

-- Publicité : événements (aucune donnée personnelle côté régie ; l'identifiant sert seulement aux plafonds)
CREATE TABLE pub_evenements (
  id          bigserial PRIMARY KEY,
  type        text NOT NULL,                 -- affichage | clic | recompense
  zone        text NOT NULL,
  creation_id text,
  user_id     text,
  jour        date NOT NULL DEFAULT current_date,
  at          timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX pub_ev_jour_idx ON pub_evenements (jour, type);
CREATE INDEX pub_ev_user_idx ON pub_evenements (user_id, jour, type);

-- Essais de connexion par SMS (limitation des envois et des tentatives)
CREATE TABLE sms_essais (
  id    bigserial PRIMARY KEY,
  genre text NOT NULL,                       -- envoi | verif
  cle   text NOT NULL,                       -- empreinte du numéro ou adresse IP
  ok    boolean NOT NULL DEFAULT true,
  at    timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX sms_essais_idx ON sms_essais (genre, cle, at DESC);

-- Votes aux sondages (un vote par compte)
CREATE TABLE votes (
  sondage_id text NOT NULL,
  user_id    text NOT NULL,
  choix      text NOT NULL,
  at         timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (sondage_id, user_id)
);

-- Journal des actions d'administration
CREATE TABLE journal_admin (
  id     bigserial PRIMARY KEY,
  par    text NOT NULL,
  action text NOT NULL,
  cible  text,
  detail jsonb NOT NULL DEFAULT '{}',
  at     timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX journal_admin_idx ON journal_admin (at DESC);
