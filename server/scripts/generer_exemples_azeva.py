#!/usr/bin/env python3
"""
Génère les contenus d'exemple d'Azeva côté serveur : contenu/exemples/{salles,jeux,jeux_niveaux,jeux_items,mots_jeux,plans,produits}.json.
Ces fichiers ne sont PAS livrés avec l'application : ils s'importent dans la base (console > Contenus d'exemple).
Tous les mots myènè viennent des leçons omyènè (01_sources_myene/03_lecons_omyene) et des corrections de Capp du 31 oct. 2026 ;
chaque ligne porte sa source. Lancer : python3 server/scripts/generer_exemples_azeva.py (depuis OMPANGANO/).
"""
import json, os, re, unicodedata

ICI = os.path.dirname(os.path.abspath(__file__))
DEST = os.path.join(ICI, '..', '..', 'contenu', 'exemples')

def cle(t):
    t = unicodedata.normalize('NFD', t.lower())
    return re.sub(r'[^a-z0-9]+', '-', ''.join(c for c in t if not unicodedata.combining(c))).strip('-')

CORPS = '[LEC] Le Corps humain'
NATURE = '[LEC] La Nature'
ANIMAUX = '[LEC] Animaux du Gabon'
ALIMENTS = '[LEC] LES ALIMENTS'
COMPTONS = '[LEC] Comptons'
FAMILLE = '[LEC] La famille'
CAPP = 'Corrections de Capp, 31 oct. 2026 (00_CORRECTIONS_Capp_2026-10-31.md)'

MOTS = {
    'corps': (CORPS, [('Ewondjo', 'La tête'), ('Itwé', 'Les cheveux'), ('Intcho', "L'œil"), ('Aroyi', 'Les oreilles'), ('Ompélé', 'Le cou'), ('Ompombo', 'Le nez'),
                      ('Ino', 'La dent'), ('Onèmè', 'La langue'), ('Onumbu', 'La lèvre'), ('Elèlu', 'La barbe'), ('Ntono', 'La poitrine'), ('Ogô', 'Le bras'),
                      ('Ikaka', 'La main'), ('Oméno', 'Le doigt'), ('Orôrô', 'Le nombril'), ('Ompéndé', 'La jambe'), ('Ivuva', 'Le genou'), ('Ogholo', 'Le pied'),
                      ('Ntumbu', 'Le talon'), ('Imwa', 'Les poils'), ('Nkôgôzô', 'Le coude'), ('Ndjègèlu', 'Le menton')]),
    'maison': (NATURE, [('Nago', 'La maison'), ('Tavulu', 'La table'), ('Ebongo', 'Le banc'), ('Kisini', 'La cuisine'), ('Puka', 'Le sac'), ('Ogoni', 'Le feu'),
                        ('Windè', 'La fenêtre'), ('Odo', 'Le lit'), ('Elinga', 'La robe'), ('Owaro', 'La pirogue'), ('Epokolo', 'Le chapeau'), ('Elasi', 'Le verre'),
                        ('Ezômbôlô', 'Le balai'), ('Ogôli', 'La corde')]),
    'nature': (NATURE, [('Iga', 'La forêt'), ('Ntsuwa', 'La mer'), ('Okili', 'La route'), ('Ogwèli', 'La lune'), ('Ningo', 'La pluie'), ('Idyavi', 'Les feuilles'),
                        ('Ntché', 'La terre'), ('Omwèyi', 'Le soleil')]),
    'animaux': (ANIMAUX, [('Embongo', 'Le lion'), ('Ndjègô', 'La panthère'), ('Mbwa', 'Le chien'), ('Pusi', 'Le chat'), ('Nkambi', "L'antilope"), ('Mboni', 'Le cabri'),
                          ('Ngowa', 'Le sanglier'), ('Homba', 'Le porc-épic'), ('Manga', 'Le lamantin'), ('Ipi', 'Le pangolin'), ('Nguwu', "L'hippopotame"),
                          ('Ndjôgu', "L'éléphant"), ('Ndjina', 'Le gorille'), ('Kèma', 'Le singe'), ('Ntchigo', 'Le chimpanzé')]),
    'aliments': (ALIMENTS, [('Ntogôlo', 'Le piment'), ('Ilasa', "L'orange"), ('Onêmbè', 'Le miel'), ('Itôtô', 'La banane douce'), ('Ikôndô', 'La banane plantain'),
                            ('Olôlô', 'La papaye'), ('Mbenda', "L'arachide"), ('Ewèrè', 'Le poisson'), ('Iké', "L'œuf")]),
    'nombres': (COMPTONS, [('Môri', 'Un'), ('Mbani', 'Deux'), ('Nayi', 'Quatre'), ('Otani', 'Cinq'), ('Orowa', 'Six'), ('Enanayi', 'Huit'), ('Enogomi', 'Neuf'), ('Igomi', 'Dix')]),
    'famille': (FAMILLE, [('Rérè', 'Papa'), ('Ngwè', 'Maman'), ('Ombalo', "L'oncle"), ('Irônda', "L'ami, l'amie"), ('Ogôyi', 'Le beau-frère')]),
}
SOURCES_PARTICULIERES = {'Omwèyi': NATURE + ' ; soleil chez les Ôrungu : ' + CAPP, 'Nkambi': ANIMAUX + ' ; ' + CAPP}

def ecrire(nom, lignes):
    with open(os.path.join(DEST, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(lignes, f, ensure_ascii=False, indent=1)
    print(f'{nom}.json : {len(lignes)} lignes')

# ------------------------------------------------------------------ mots (les anciens mots d'exemple sont conservés)
anciens = json.load(open(os.path.join(DEST, 'mots_jeux.json'), encoding='utf-8'))
mots = [m for m in anciens if m['id'].startswith('m-') and m.get('theme') in ('salutations', 'ecole', 'village', 'qualites')]
vus = {m['id'] for m in mots}
for theme, (src, liste) in MOTS.items():
    for my, fr in liste:
        i = f'{theme}-{cle(my)}'
        if i in vus: continue
        vus.add(i)
        n = len(my.replace("'", ''))
        mots.append({'id': i, 'myene': my, 'francais': fr, 'theme': theme, 'niveau': 1 if n <= 5 else 2 if n <= 7 else 3, 'dialecte': '', 'source': SOURCES_PARTICULIERES.get(my, src), 'publie': True})
mots += [{'id': 'nombres-ntcharo', 'myene': 'Ntcharo', 'francais': 'Trois', 'theme': 'nombres', 'niveau': 2, 'dialecte': '', 'source': COMPTONS + ' (« Ntcaro ») ; forme ntcharo : ' + CAPP, 'publie': True},
         {'id': 'aliments-nyama', 'myene': 'Nyama', 'francais': 'La viande', 'theme': 'aliments', 'niveau': 1, 'dialecte': '', 'source': NATURE + ' ; ' + CAPP, 'publie': True}]
ecrire('mots_jeux', mots)

# ------------------------------------------------------------------ salles
JAUNE, BRIQUE, TERRE, VERT, AMBRE, BLEU, ROSE = '#FDE047', '#D9693F', '#C85A32', '#0D9488', '#F59E0B', '#38BDF8', '#F472B6'
ecrire('salles', [
    {'id': 'mots', 'titre': 'Salle des mots', 'description': 'Ogoni, anagrammes, grilles, mémoire, dictée…', 'couleur': JAUNE, 'icone': 'texte', 'ordre': 1, 'publie': True},
    {'id': 'corps', 'titre': 'Salle du corps', 'description': 'Le corps humain, de la tête aux pieds.', 'couleur': BRIQUE, 'icone': 'corps', 'ordre': 2, 'publie': True},
    {'id': 'maison', 'titre': 'Salle de la maison', 'description': 'Les objets de tous les jours.', 'couleur': TERRE, 'icone': 'maison', 'ordre': 3, 'publie': True},
    {'id': 'nature', 'titre': 'Salle de la nature', 'description': 'Animaux, forêt, mer et ciel.', 'couleur': VERT, 'icone': 'feuille', 'ordre': 4, 'publie': True},
    {'id': 'nombres', 'titre': 'Salle des nombres', 'description': 'Compter, mesurer, se repérer.', 'couleur': BLEU, 'icone': 'de', 'ordre': 5, 'publie': True},
    {'id': 'famille', 'titre': 'Famille et société', 'description': 'La famille, les salutations, les classes d\'âge.', 'couleur': ROSE, 'icone': 'profil', 'ordre': 6, 'publie': True},
    {'id': 'oralite', 'titre': 'Oralité et arts', 'description': 'Devinettes, proverbes, rythmes.', 'couleur': AMBRE, 'icone': 'micro', 'ordre': 7, 'publie': True},
    {'id': 'societe', 'titre': 'Le grand jeu', 'description': 'Le parcours de la vie, avec un dé.', 'couleur': AMBRE, 'icone': 'de', 'ordre': 8, 'publie': True},
])

# ------------------------------------------------------------------ jeux : tout le catalogue (14_programme_et_jeux/02_jeux_application_NKALA.md)
jeux = []
def jeu(id, salle, titre, moteur, description, publie=True, couleur=None, enfant=True, **k):
    jeux.append({'id': id, 'salle_id': salle, 'titre': titre, 'moteur': moteur, 'description': description, 'couleur': couleur, 'duree_s': k.pop('duree_s', 0),
                 'mode_enfant': enfant, 'ordre': len(jeux) + 1, 'publie': publie, **k})
P = False  # jeu développé, en attente de contenu validé : à publier quand ses lignes « jeux_items » sont importées

# Salle des mots
jeu('pendu', 'mots', 'Ogoni', 'ogoni', 'Trouve le mot avant que le feu de bois s\'éteigne.', couleur=JAUNE, corpus=True)
jeu('anagrammes', 'mots', 'Anagrammes', 'anagramme', 'Remets les lettres du cercle en ordre.', couleur=JAUNE, duree_s=60, corpus=True)
jeu('mots-meles', 'mots', 'Mots mêlés', 'mots_meles', 'Retrouve les mots cachés dans la grille.', couleur=JAUNE, enfant=False)
jeu('mots-croises', 'mots', 'Mots croisés', 'mots_croises', 'Remplis la grille à partir des définitions.', couleur=JAUNE, enfant=False)
jeu('mots-fleches', 'mots', 'Mots fléchés', 'mots_fleches', 'La définition est dans la case, le mot suit la flèche.', couleur=JAUNE, enfant=False)
jeu('memoire', 'mots', 'Mémoire', 'memoire', 'Retourne les cartes : un mot, son sens.', couleur=JAUNE)
jeu('dictee', 'mots', 'Dictée sonore', 'dictee', 'Écoute, puis écris le mot.', couleur=JAUNE, enfant=False)
jeu('quiz', 'mots', 'Quiz des mots', 'qcm', 'Choisis la bonne traduction.', couleur=JAUNE)
jeu('phrases', 'mots', 'Phrases en désordre', 'ordre', 'Remets les mots dans l\'ordre.', couleur=JAUNE, enfant=False)
jeu('singulier-pluriel', 'mots', 'Singulier, pluriel', 'quiz', 'Trouve le pluriel selon la classe du nom.', couleur=JAUNE, enfant=False, consigne='Quel est le pluriel ?')
jeu('syllabes', 'mots', 'Syllabes', 'syllabes', 'Assemble les syllabes pour former le mot.', P, couleur=JAUNE)
jeu('mot-image', 'mots', 'Mot-image', 'quiz', 'Relie chaque mot à son image.', P, couleur=JAUNE)
jeu('mots-jumeaux', 'mots', 'Mots jumeaux', 'quiz', 'Distingue les mots qui se ressemblent.', P, couleur=JAUNE, enfant=False)
jeu('familles-de-mots', 'mots', 'Familles de mots', 'relier', 'Relie un verbe à ses dérivés.', P, couleur=JAUNE, enfant=False)
jeu('case-vide', 'mots', 'La case vide', 'trous', 'Écris ou choisis le mot qui manque.', P, couleur=JAUNE, enfant=False)
# Salle du corps
jeu('touche-ta-tete', 'corps', 'Touche ta tête', 'zones', 'Lis le mot, touche la bonne partie du corps.', couleur=BRIQUE, scene='corps', consigne='Touche la partie du corps')
jeu('habille-le-squelette', 'corps', 'Les étiquettes du corps', 'relier', 'Relie chaque partie du corps à son nom.', couleur=BRIQUE, theme=['corps'])
jeu('puzzle-du-corps', 'corps', 'Mémoire du corps', 'memoire', 'Retrouve les paires : le mot, la partie du corps.', couleur=BRIQUE, theme=['corps'])
jeu('ogoni-corps', 'corps', 'Ogoni du corps', 'ogoni', 'Le feu de bois, avec les mots du corps.', couleur=BRIQUE, theme=['corps'])
jeu('corps-croises', 'corps', 'Mots croisés du corps', 'mots_croises', 'Une grille de mots du corps.', couleur=BRIQUE, theme=['corps'], enfant=False)
jeu('jacques-a-dit', 'corps', 'Jacques a dit', 'zones', 'Suis les consignes en omyènè.', P, couleur=BRIQUE, scene='corps')
jeu('corps-en-chanson', 'corps', 'Le corps en chanson', 'sequence', 'Remets la comptine du corps dans l\'ordre.', P, couleur=BRIQUE)
jeu('chez-le-guerisseur', 'corps', 'Chez le guérisseur', 'quiz', 'Dis où tu as mal.', P, couleur=BRIQUE)
# Salle de la maison
jeu('range-la-case', 'maison', 'Range la case', 'classer', 'Range chaque mot à sa place : le corps, la maison, la nourriture.', couleur=TERRE)
jeu('maison-memoire', 'maison', 'La maison du village', 'memoire', 'Retrouve les objets de la maison.', couleur=TERRE, theme=['maison'])
jeu('maison-meles', 'maison', 'Mots mêlés de la maison', 'mots_meles', 'Les objets de la maison cachés dans la grille.', couleur=TERRE, theme=['maison'])
jeu('maison-fleches', 'maison', 'Mots fléchés de la maison', 'mots_fleches', 'Les objets de la maison en mots fléchés.', couleur=TERRE, theme=['maison'], enfant=False)
jeu('le-marche', 'maison', 'Le marché', 'quiz', 'Achète les objets en les nommant.', P, couleur=TERRE)
jeu('qu-est-ce-qui-manque', 'maison', 'Qu\'est-ce qui manque ?', 'quiz', 'Un objet a disparu : nomme-le.', P, couleur=TERRE)
jeu('a-quoi-ca-sert', 'maison', 'À quoi ça sert ?', 'relier', 'Relie l\'objet à son usage.', P, couleur=TERRE)
jeu('hier-et-aujourdhui', 'maison', 'Hier et aujourd\'hui', 'relier', 'L\'objet d\'autrefois et celui d\'aujourd\'hui.', P, couleur=TERRE)
jeu('l-artisan', 'maison', 'L\'artisan', 'sequence', 'Fabrique un objet étape par étape.', P, couleur=TERRE, enfant=False)
# Salle de la nature
jeu('animaux-relier', 'nature', 'Les animaux', 'relier', 'Relie chaque animal à son nom.', couleur=VERT, theme=['animaux'])
jeu('animaux-memoire', 'nature', 'Mémoire des animaux', 'memoire', 'Retrouve les paires d\'animaux.', couleur=VERT, theme=['animaux'])
jeu('animaux-ogoni', 'nature', 'Ogoni des animaux', 'ogoni', 'Le feu de bois, avec les noms d\'animaux.', couleur=VERT, theme=['animaux'])
jeu('lire-le-ciel', 'nature', 'Lire le ciel', 'relier', 'Soleil, lune, pluie, forêt, mer.', couleur=VERT, theme=['nature'])
jeu('le-jardin', 'nature', 'Le jardin', 'mots_meles', 'Les fruits et les plantes cachés dans la grille.', couleur=VERT, theme=['aliments'])
jeu('cri-des-animaux', 'nature', 'Le cri des animaux', 'quiz', 'Écoute le cri, choisis l\'animal.', P, couleur=VERT)
jeu('chaine-de-la-mangrove', 'nature', 'La chaîne de la mangrove', 'relier', 'Qui mange qui ?', P, couleur=VERT)
jeu('la-peche', 'nature', 'La pêche', 'quiz', 'Attrape le poisson nommé.', P, couleur=VERT)
jeu('foret-et-savane', 'nature', 'La forêt et la savane', 'classer', 'Range animaux et arbres selon leur milieu.', P, couleur=VERT)
jeu('l-ile-qui-s-en-va', 'nature', 'L\'île qui s\'en va', 'sequence', 'Protège le rivage de Mandji.', P, couleur=VERT, enfant=False)
jeu('la-pharmacopee', 'nature', 'La pharmacopée', 'relier', 'La plante et son usage (savoir public seulement).', P, couleur=VERT, enfant=False)
# Salle des nombres
jeu('compte-avec-moi', 'nombres', 'Compte avec moi', 'compter', 'Compte les noisettes et choisis le nombre.', couleur=BLEU, consigne='Combien y en a-t-il ?')
jeu('suite-des-nombres', 'nombres', 'La suite des nombres', 'sequence', 'Remets les nombres dans l\'ordre.', couleur=BLEU)
jeu('marche-aux-nombres', 'nombres', 'Le marché aux nombres', 'trous', 'Accorde le nombre avec le nom.', couleur=BLEU, enfant=False, consigne='Complète')
jeu('les-suites', 'nombres', 'Les suites', 'suites', 'Complète la suite de formes.', couleur=BLEU, consigne='Quelle forme vient ensuite ?')
jeu('nombres-memoire', 'nombres', 'Mémoire des nombres', 'memoire', 'Le nombre et son nom.', couleur=BLEU, theme=['nombres'])
jeu('panier-de-noisettes', 'nombres', 'Le panier de noisettes', 'compter', 'Remplis le panier, noisette par noisette.', P, couleur=BLEU)
jeu('partage-du-poisson', 'nombres', 'Le partage du poisson', 'quiz', 'Partage la prise à parts égales.', P, couleur=BLEU)
jeu('plus-grand-plus-petit', 'nombres', 'Plus grand, plus petit', 'suites', 'Compare les tailles.', P, couleur=BLEU)
jeu('les-formes', 'nombres', 'Les formes', 'quiz', 'Reconnais les formes dans les objets du village.', P, couleur=BLEU)
jeu('quelle-heure', 'nombres', 'Quelle heure ?', 'quiz', 'Les moments du jour et de la nuit.', P, couleur=BLEU)
jeu('le-calendrier', 'nombres', 'Le calendrier', 'sequence', 'Jours, mois, saisons, lunes.', P, couleur=BLEU)
jeu('gauche-droite', 'nombres', 'Gauche, droite', 'chemin', 'Guide le personnage dans le village.', P, couleur=BLEU, consigne='Où va-t-il ?')
jeu('la-carte', 'nombres', 'La carte', 'zones', 'Situe les lieux de la côte myènè.', P, couleur=BLEU, enfant=False)
# Famille et société
jeu('la-famille', 'famille', 'La famille', 'relier', 'Relie chaque parent à son nom.', couleur=ROSE)
jeu('salue-comme-il-faut', 'famille', 'Salue comme il faut', 'quiz', 'Choisis la bonne formule.', couleur=ROSE, consigne='Que dis-tu ?')
jeu('classes-d-age', 'famille', 'Les classes d\'âge', 'sequence', 'Range les classes d\'âge ôrungu, du plus jeune au plus ancien.', couleur=ROSE, enfant=False)
jeu('arbre-du-clan', 'famille', 'L\'arbre du clan', 'relier', 'Place lignages et liens.', P, couleur=ROSE, enfant=False)
jeu('qui-fait-quoi', 'famille', 'Qui fait quoi au village ?', 'relier', 'Relie le personnage à sa fonction.', P, couleur=ROSE)
jeu('la-frise', 'famille', 'La frise', 'sequence', 'Remets les événements dans l\'ordre.', P, couleur=ROSE, enfant=False)
jeu('la-devise', 'famille', 'La devise', 'sequence', 'Reconstitue la devise ligne par ligne.', P, couleur=ROSE, enfant=False)
# Oralité et arts
jeu('devinettes', 'oralite', 'Tô, tôngè', 'quiz', 'Les devinettes traditionnelles.', couleur=AMBRE, consigne='Tô tôngè…')
jeu('complete-le-proverbe', 'oralite', 'Complète le proverbe', 'trous', 'Retrouve le mot qui manque.', couleur=AMBRE, enfant=False, consigne='Complète le proverbe')
jeu('le-rythme', 'oralite', 'Le rythme', 'rythme', 'Écoute et reproduis le rythme des tambours.', couleur=AMBRE, consigne='Reproduis le rythme')
jeu('le-sens-cache', 'oralite', 'Le sens caché', 'quiz', 'Choisis la bonne lecture d\'un proverbe.', P, couleur=AMBRE, enfant=False)
jeu('raconte-la-suite', 'oralite', 'Raconte la suite', 'sequence', 'Remets en ordre les moments d\'un conte.', P, couleur=AMBRE)
jeu('la-veillee', 'oralite', 'La veillée', 'quiz', 'Écoute un conte, puis réponds.', P, couleur=AMBRE)
jeu('dix-oiseaux', 'oralite', 'La chanson des dix oiseaux', 'sequence', 'Jeu traditionnel (accord de mandji.net requis).', P, couleur=AMBRE)
jeu('habille-toi', 'oralite', 'Habille-toi', 'classer', 'Okorouè, duku : chaque pièce à sa place.', P, couleur=AMBRE)
jeu('la-cuisine', 'oralite', 'La cuisine', 'sequence', 'Suis la recette, geste par geste.', P, couleur=AMBRE)
jeu('le-palabre', 'oralite', 'Le palabre', 'quiz', 'Jeu de rôle de justice.', P, couleur=AMBRE, enfant=False)
# Catalogue du programme de formation (14_programme_et_jeux/01_programme_formation_Orungu.md, « Catalogue des jeux » et jeux par cycle)
jeu('cartes-memoire', 'mots', 'Cartes mémoire', 'memoire', 'Tous les mots appris, en paires à retrouver.', couleur=JAUNE)
jeu('anagrammes-eclair', 'mots', 'Anagrammes éclair', 'anagramme', 'Les mêmes lettres, deux fois moins de temps.', couleur=JAUNE, duree_s=30, enfant=False)
jeu('grande-grille', 'mots', 'La grande grille', 'mots_meles', 'Des mots de tous les thèmes dans une seule grille.', couleur=JAUNE, enfant=False)
jeu('grands-croises', 'mots', 'Les grands croisés', 'mots_croises', 'Des mots de tous les thèmes à croiser.', couleur=JAUNE, enfant=False)
jeu('imagier-sonore', 'mots', 'Imagier sonore', 'quiz', 'Touche l\'image, entends le mot.', P, couleur=JAUNE)
jeu('montre-moi', 'mots', 'Montre-moi', 'quiz', 'Écoute le mot, touche la bonne image.', P, couleur=JAUNE)
jeu('ne-pas-confondre', 'mots', 'Ne pas confondre', 'quiz', 'Des paires de mots proches à distinguer.', P, couleur=JAUNE, enfant=False)
jeu('course-des-verbes', 'mots', 'La course des verbes', 'quiz', 'Conjugue vite et juste.', P, couleur=JAUNE, duree_s=45, enfant=False)
jeu('dialogues', 'mots', 'Dialogues à compléter', 'trous', 'Trouve la réplique qui manque.', P, couleur=JAUNE, enfant=False)
jeu('corps-anagrammes', 'corps', 'Anagrammes du corps', 'anagramme', 'Remets en ordre les mots du corps.', couleur=BRIQUE, theme=['corps'], duree_s=60)
jeu('corps-meles', 'corps', 'Mots mêlés du corps', 'mots_meles', 'Les mots du corps cachés dans la grille.', couleur=BRIQUE, theme=['corps'])
jeu('corps-pluriels', 'corps', 'Un bras, deux bras', 'quiz', 'Le pluriel des parties du corps.', couleur=BRIQUE, banque='singulier-pluriel', enfant=False, consigne='Quel est le pluriel ?')
jeu('maison-ogoni', 'maison', 'Ogoni de la maison', 'ogoni', 'Le feu de bois, avec les objets de la maison.', couleur=TERRE, theme=['maison'])
jeu('maison-relier', 'maison', 'Chaque objet, son nom', 'relier', 'Relie les objets de la maison à leur nom.', couleur=TERRE, theme=['maison'])
jeu('maison-croises', 'maison', 'Mots croisés de la maison', 'mots_croises', 'Les objets de la maison à croiser.', couleur=TERRE, theme=['maison'], enfant=False)
jeu('maison-anagrammes', 'maison', 'Anagrammes de la maison', 'anagramme', 'Remets en ordre les objets de la maison.', couleur=TERRE, theme=['maison'], duree_s=60)
jeu('animaux-croises', 'nature', 'Mots croisés des animaux', 'mots_croises', 'Les animaux du Gabon à croiser.', couleur=VERT, theme=['animaux'], enfant=False)
jeu('animaux-meles', 'nature', 'Mots mêlés des animaux', 'mots_meles', 'Les animaux cachés dans la grille.', couleur=VERT, theme=['animaux'])
jeu('animaux-anagrammes', 'nature', 'Anagrammes des animaux', 'anagramme', 'Remets en ordre les noms d\'animaux.', couleur=VERT, theme=['animaux'], duree_s=60)
jeu('animaux-fleches', 'nature', 'Mots fléchés des animaux', 'mots_fleches', 'Les animaux en mots fléchés.', couleur=VERT, theme=['animaux'], enfant=False)
jeu('les-fruits', 'nature', 'Les fruits et la cuisine', 'relier', 'Relie chaque aliment à son nom.', couleur=VERT, theme=['aliments'])
jeu('aliments-memoire', 'nature', 'Mémoire du marché', 'memoire', 'Retrouve les paires d\'aliments.', couleur=VERT, theme=['aliments'])
jeu('nature-memoire', 'nature', 'Mémoire de la nature', 'memoire', 'Forêt, mer, lune, pluie.', couleur=VERT, theme=['nature'])
jeu('oiseaux-du-littoral', 'nature', 'Les oiseaux du littoral', 'relier', 'Les oiseaux des lagunes et leur nom.', P, couleur=VERT)
jeu('poissons-de-mer', 'nature', 'Les poissons de mer', 'memoire', 'Les poissons et leur nom.', P, couleur=VERT)
jeu('arbres-du-pays', 'nature', 'Les arbres de notre pays', 'relier', 'Les arbres et leur nom.', P, couleur=VERT)
jeu('nombres-ogoni', 'nombres', 'Ogoni des nombres', 'ogoni', 'Le feu de bois, avec les nombres.', couleur=BLEU, theme=['nombres'])
jeu('nombres-relier', 'nombres', 'Le nombre et son nom', 'relier', 'Relie chaque nombre à son nom.', couleur=BLEU, theme=['nombres'])
jeu('nombres-anagrammes', 'nombres', 'Anagrammes des nombres', 'anagramme', 'Remets en ordre les nombres.', couleur=BLEU, theme=['nombres'], duree_s=60)
jeu('famille-memoire', 'famille', 'Mémoire de la famille', 'memoire', 'Retrouve les paires de la famille.', couleur=ROSE, theme=['famille'])
jeu('famille-ogoni', 'famille', 'Ogoni de la famille', 'ogoni', 'Le feu de bois, avec la famille.', couleur=ROSE, theme=['famille'])
jeu('le-village', 'famille', 'Le village', 'quiz', 'Jeu de rôle : Agnambyè, Akaga, Ngowe…', P, couleur=ROSE)
jeu('la-cote-myene', 'famille', 'La côte myènè', 'zones', 'Peuples, lieux, navires et dates sur la carte.', P, couleur=ROSE, enfant=False)
jeu('enigmes-des-proverbes', 'oralite', 'Énigmes des proverbes', 'quiz', 'Raisonne avec les proverbes.', P, couleur=AMBRE, enfant=False)
jeu('conte-de-nkonjo', 'oralite', 'Le conte', 'sequence', 'Remets un conte dans l\'ordre.', P, couleur=AMBRE)
jeu('salutations-memoire', 'oralite', 'Mémoire des salutations', 'memoire', 'Bonjour, merci, s\'il te plaît…', couleur=AMBRE, theme=['salutations'])
# Le grand jeu
jeu('grand-jeu', 'societe', 'Le grand jeu', 'plateau', 'Avance avec le dé, de l\'enfance à l\'âge adulte.', couleur=AMBRE, enfant=False)
ecrire('jeux', jeux)

# ------------------------------------------------------------------ contenu des jeux (privé)
items = []
def item(jeu_id, enonce, reponse, source, leurres=None, **k):
    items.append({'id': f'{jeu_id}-{len([i for i in items if i["jeu_id"] == jeu_id]) + 1:02d}', 'jeu_id': jeu_id, 'enonce': enonce, 'reponse': reponse, 'leurres': leurres or [],
                  'niveau': k.pop('niveau', 1), 'source': source, 'publie': True, **k})

for sg, pl, fr, src in [('Ogô', 'Agô', 'le bras', CORPS), ('Ino', 'Ano', 'la dent', CORPS), ('Onumbu', 'Inumbu', 'la lèvre', CORPS), ('Oméno', 'Iméno', 'le doigt', CORPS),
                        ('Ogholo', 'Agholo', 'le pied', CORPS), ('Ompéndé', 'Impéndé', 'la jambe', CORPS), ('Ntumbu', 'Intumbu', 'le talon', CORPS), ('Épa', 'Ipa', "l'os", CORPS),
                        ('Éréré', 'Iréré', "l'arbre", NATURE), ('Épaga', 'Ipaga', 'le mur', NATURE)]:
    item('singulier-pluriel', f'« {sg} » ({fr}) : au pluriel ?', pl, src, indice=f'{sg} → {pl}', niveau=1 if len(sg) <= 5 else 2)

for my, zone, fr in [('Ewondjo', 'tete', 'la tête'), ('Itwé', 'cheveux', 'les cheveux'), ('Intcho', 'oeil', "l'œil"), ('Aroyi', 'oreille', 'les oreilles'), ('Ompélé', 'cou', 'le cou'),
                     ('Ompombo', 'nez', 'le nez'), ('Ndjègèlu', 'menton', 'le menton'), ('Ntono', 'poitrine', 'la poitrine'), ('Ogô', 'bras', 'le bras'), ('Nkôgôzô', 'coude', 'le coude'),
                     ('Ikaka', 'main', 'la main'), ('Oméno', 'doigt', 'le doigt'), ('Orôrô', 'nombril', 'le nombril'), ('Ompéndé', 'jambe', 'la jambe'), ('Ivuva', 'genou', 'le genou'),
                     ('Ogholo', 'pied', 'le pied'), ('Ntumbu', 'talon', 'le talon')]:
    item('touche-ta-tete', my, zone, CORPS, indice=fr, niveau=1 if zone in ('tete', 'oeil', 'nez', 'bras', 'main', 'pied', 'jambe', 'cou') else 2)

for theme, cat in [('corps', 'Le corps'), ('maison', 'La maison'), ('aliments', 'La nourriture')]:
    for my, fr in MOTS[theme][1][:9]:
        item('range-la-case', my, cat, MOTS[theme][0], indice=fr)

NOMBRES = [(1, 'Môri'), (2, 'Mbani'), (3, 'Ntcharo'), (4, 'Nayi'), (5, 'Otani'), (6, 'Orowa'), (7, 'Erwagénomo'), (8, 'Enanayi'), (9, 'Enogomi'), (10, 'Igomi')]
for n, my in NOMBRES:
    item('compte-avec-moi', str(n), my, COMPTONS + (' ; forme ntcharo : ' + CAPP if n == 3 else ''), niveau=1 if n <= 5 else 2)
for n, my in NOMBRES:
    item('suite-des-nombres', my, str(n), COMPTONS, groupe='un-a-cinq' if n <= 5 else 'six-a-dix', ordre=n, indice='Compte de 1 à 5' if n <= 5 else 'Compte de 6 à 10', niveau=1 if n <= 5 else 2)
item('marche-aux-nombres', 'Nago ___ (trois maisons)', 'ntcharo', CAPP + ' §2', ['mbani', 'nayi', 'otani'], indice='Nago ntcharo : trois maisons')
item('marche-aux-nombres', 'Igomi gni ___ (dix chèvres)', 'mboni', CAPP + ' §2', ['nago', 'mbwa', 'pusi'], indice='Igomi gni mboni : dix chèvres')
item('marche-aux-nombres', '___ gni mboni (dix chèvres)', 'Igomi', CAPP + ' §2', ['Otani', 'Orowa', 'Môri'], indice='Igomi gni mboni : dix chèvres', niveau=2)

FORMES = 'Suite de formes (aucun mot myènè)'
for enonce, rep, faux, niv in [('rond|carre|rond|carre|?', 'carre', ['rond', 'triangle'], 1), ('triangle|triangle|rond|triangle|triangle|?', 'rond', ['triangle', 'carre'], 1),
                               ('rond:rouge|rond:jaune|rond:rouge|?', 'rond:jaune', ['rond:rouge', 'carre:jaune'], 1), ('carre|losange|etoile|carre|losange|?', 'etoile', ['carre', 'losange', 'rond'], 2),
                               ('rond:rouge:petit|rond:rouge:grand|carre:bleu:petit|?', 'carre:bleu:grand', ['carre:bleu:petit', 'rond:bleu:grand', 'carre:rouge:grand'], 3),
                               ('etoile|rond|rond|etoile|rond|rond|?', 'etoile', ['rond', 'croix'], 2), ('croix:vert|triangle:vert|croix:jaune|triangle:jaune|croix:rouge|?', 'triangle:rouge', ['croix:rouge', 'triangle:vert', 'triangle:jaune'], 3)]:
    item('les-suites', enonce, rep, FORMES, faux, niveau=niv)

for my, fr in [('Rérè', 'Papa'), ('Ngwè', 'Maman'), ('Ombalo', "L'oncle"), ('Tata poyo', 'Le grand-père'), ('Mama poyo', 'La grand-mère'), ('Irônda', "L'ami, l'amie"), ('Ogôyi', 'Le beau-frère'), ('Omu-ngwè', 'Le frère')]:
    item('la-famille', my, fr, FAMILLE)

LEX = 'Lexique sourcé (packages/noyau/src/lexique.ts)'
for situation, rep, faux, src in [('Tu salues une personne.', 'Mbolo', ['Mbôluani', 'Akéwa', 'Kôkôlô'], '[LEC] Bonjour ; [RW] p. 284'),
                                  ('Tu salues plusieurs personnes.', 'Mbôluani', ['Mbolo', 'Akéwa', 'Yaga'], '[EQ] ; cf. [RW] « Mboloani »'),
                                  ('Quelqu\'un arrive : tu lui souhaites la bienvenue.', 'Salé', ['Akéwa', 'Kôkôlô', 'Yaga'], '[LEC] Bonjour ; [EQ]'),
                                  ('Tu remercies.', 'Akéwa', ['Mbolo', 'Salé', 'Kôkôlô'], '[LEC] Formules de politesse'),
                                  ('Tu demandes quelque chose poliment.', 'Kôkôlô', ['Akéwa', 'Mbolo', 'Salé'], '[LEC] Formules de politesse'),
                                  ('Tu appelles quelqu\'un : « Viens ! »', 'Yaga', ['Salé', 'Akéwa', 'Mbôluani'], '[LEC] Formules de politesse'),
                                  ('Tu t\'excuses.', 'Nyéza myè', ['Akéwa', 'Yaga', 'Mbolo'], '[LEC] Formules de politesse ; [EQ]')]:
    item('salue-comme-il-faut', situation, rep, src + ' ; ' + LEX, faux)

RANGS = 'Classes d\'âge ôrungu (14_programme_et_jeux/01_programme_formation_Orungu.md ; ordre fixé par Capp le 10 nov. 2026)'
for n, nom in enumerate(['Ekèï-kèï', 'Omwana', 'Iwanjo', 'Olèngwani', 'Okengele', 'Onerwama', 'Onèró', 'Mbolo'], 1):
    item('classes-d-age', nom, str(n), RANGS, groupe='classes', ordre=n, indice='Du plus jeune au plus ancien')

DEV = '[LEC] LES DEVINETTES EN OMYENE'
item('devinettes', 'Nago nogo-pa, ompombana fô ! (Une maison sans portes ?)', 'Iké (l\'œuf)', DEV, ['Nago (la maison)', 'Owaro (la pirogue)', 'Puka (le sac)'])
item('devinettes', 'Anaga ngwè mo, w\'ayènana ? (Deux enfants de même mère qui ne se voient jamais ?)', 'Aroyi (les oreilles)', DEV, ['Intcho (l\'œil)', 'Agô (les bras)', 'Agholo (les pieds)'])
item('devinettes', 'Winô nè : « Mpyo ! » Winô nè : « Nkèyi ». (L\'un a chaud, l\'autre a froid ?)', 'Owaro (la pirogue)', DEV, ['Ogoni (le feu)', 'Nago (la maison)', 'Odo (le lit)'], niveau=2)

item('complete-le-proverbe', 'Nkula môri môri, é dyonyiz\'___', 'otondo', '14_programme_et_jeux/02_jeux_application_NKALA.md §9 (« Le panier de noisettes »), à valider par Capp', ['nago', 'ogoni', 'owaro'],
     indice='Noisette après noisette, le panier se remplit.')

RYTHME = 'Rythme d\'exemple (aucun mot myènè) : rythmes traditionnels à collecter'
for r, niv in [('G-D-G', 1), ('G-G-D', 1), ('D-G-D', 1), ('G-D-D-G', 1), ('G-G-D-G', 2), ('D-D-G-D-G', 2), ('G-D-G-G-D', 2), ('G-C-D-G-C-D', 3), ('G-G-D-C-G-D-D', 3), ('D-G-C-C-G-D-G', 3)]:
    item('le-rythme', f'Rythme de {len(r.split("-"))} frappes', r, RYTHME, niveau=niv)
ecrire('jeux_items', items)

# ------------------------------------------------------------------ paliers : exemple complet sur Ogoni (les autres jeux prennent les huit paliers par défaut, un par rang)
# Chaque jeu a 1000 niveaux à difficulté calculée ; un palier fixe la condition d'accès à partir d'un niveau.
def palier(n, debut, titre, description, rang=1, plans=None, produit=None, **k):
    return {'id': f'pendu-p{n}', 'jeu_id': 'pendu', 'niveau': debut, 'titre': titre, 'description': description, 'rang_min': rang, 'plans': plans or [], 'produit_id': produit, 'publie': True, **k}
ecrire('jeux_niveaux', [
    palier(1, 1, 'Petit feu', 'Niveaux 1 à 50 : ouverts à tous.'),
    palier(2, 51, 'Feu de veillée', 'Niveaux 51 à 150 : au rang Omwana.', rang=2),
    palier(3, 151, 'Grand feu', 'Niveaux 151 à 300 : au rang Iwanjo.', rang=3),
    palier(4, 301, 'Feu du village', 'Niveaux 301 à 500 : au rang Olèngwani.', rang=4),
    palier(5, 501, 'Feu des anciens', 'Niveaux 501 à 800 : au rang Okengele.', rang=5),
    palier(6, 801, 'Feu des maîtres', 'Niveaux 801 à 1000 : au rang Onerwama. Trois bûches seulement.', rang=6, erreurs_max=3),
])
# Tous les jeux sont gratuits (décision de Capp, 13 nov. 2026) : aucun palier ne cite de formule ni de produit ; seuls le rang et la progression ouvrent les niveaux.
# Les jeux vivent de la publicité (bannière de la salle de jeux, plein écran entre les parties) ; une formule peut la couper (colonne « sans_pub »).
ecrire('plans', [{'id': 'complet', 'titre': 'Formule complète', 'description': 'Exemple : tous les cours, sans publicité dans toute l\'application.', 'tout': True, 'rang_min': 1, 'sans_pub': ['tout'], 'ordre': 1, 'publie': True},
                 {'id': 'jeux-sans-pub', 'titre': 'Jeux sans publicité', 'description': 'Exemple : coupe la publicité des jeux seulement (les jeux restent gratuits pour tous).', 'tout': False, 'rang_min': 1, 'sans_pub': ['azeva'], 'ordre': 2, 'publie': False}])
