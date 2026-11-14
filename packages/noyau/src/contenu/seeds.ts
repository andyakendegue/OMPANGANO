/**
 * Contenu de démonstration livré avec l'application : il sert tant que le serveur ne fournit aucun contenu publié
 * pour une collection (premier lancement hors ligne, développement). Les fichiers sont dans packages/noyau/contenu/*.json ;
 * ils reprennent uniquement des mots du lexique sourcé (lexique.ts). Les fiches « exemple » sont à remplacer par des imports.
 * Azeva n'a AUCUN contenu ici (salles, jeux, niveaux, mots, questions, plateau, défis, succès, avatars) : sans le serveur,
 * la salle de jeux est une coquille vide. Les exemples d'Azeva vivent côté serveur seulement (contenu/exemples/).
 */
import actualites from '../../contenu/actualites.json';
import albums from '../../contenu/albums.json';
import artistes from '../../contenu/artistes.json';
import bibliotheque from '../../contenu/bibliotheque.json';
import categories_annonces from '../../contenu/categories_annonces.json';
import categories_lieux from '../../contenu/categories_lieux.json';
import chaines_tv from '../../contenu/chaines_tv.json';
import chapitres from '../../contenu/chapitres.json';
import cours_artisans from '../../contenu/cours_artisans.json';
import exercices from '../../contenu/exercices.json';
import gardes from '../../contenu/gardes.json';
import genres from '../../contenu/genres.json';
import grammaire from '../../contenu/grammaire.json';
import lecons from '../../contenu/lecons.json';
import livre_chapitres from '../../contenu/livre_chapitres.json';
import lieux from '../../contenu/lieux.json';
import magazine from '../../contenu/magazine.json';
import messages from '../../contenu/messages.json';
import opportunites from '../../contenu/opportunites.json';
import parcours from '../../contenu/parcours.json';
import playlists from '../../contenu/playlists.json';
import produits from '../../contenu/produits.json';
import pub_creations from '../../contenu/pub_creations.json';
import radios from '../../contenu/radios.json';
import services from '../../contenu/services.json';
import sondages from '../../contenu/sondages.json';
import titres from '../../contenu/titres.json';
import unites from '../../contenu/unites.json';

export const SEEDS: Record<string, Record<string, unknown>[]> = {
  grammaire: grammaire,
  actualites: actualites,
  albums: albums,
  artistes: artistes,
  bibliotheque: bibliotheque,
  categories_annonces: categories_annonces,
  categories_lieux: categories_lieux,
  chaines_tv: chaines_tv,
  chapitres: chapitres,
  cours_artisans: cours_artisans,
  exercices: exercices,
  gardes: gardes,
  genres: genres,
  lecons: lecons,
  lieux: lieux,
  livre_chapitres: livre_chapitres,
  magazine: magazine,
  messages: messages,
  opportunites: opportunites,
  parcours: parcours,
  playlists: playlists,
  produits: produits,
  pub_creations: pub_creations,
  radios: radios,
  services: services,
  sondages: sondages,
  titres: titres,
  unites: unites
} as unknown as Record<string, Record<string, unknown>[]>;

export const graine = (collection: string) => SEEDS[collection] ?? [];
