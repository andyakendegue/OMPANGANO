#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Restructuration du cursus Onenji (décision de Capp, 21 nov. 2026).

Audit : 14_programme_et_jeux/04_audit_cursus_Onenji_Nkala.md. Mêmes étapes de la vie, autre méthode :
  - Ntina en trois paliers (écouter et montrer ; nommer et dire ; jouer avec les sons), sans dictée avant le palier 3 ;
  - la phonétique (Ntina-u3, Ntina-u4) passe dans Ogèndo, fusionnée avec Ogèndo-u1 ;
  - Ogèndo reçoit une colonne grammaticale (pronoms, présent, passé, futur, questions) faite des seules formes validées ;
  - Ikôkô reçoit une entrée pour l'adulte qui débute ;
  - deux corrections de Capp du 21 nov. (nombres) sont appliquées.

Rien n'est supprimé : les leçons et exercices existants gardent leur identifiant (la progression des comptes reste valable) ;
ils changent seulement d'unité ou de leçon. L'unité vidée (ogendo-u1) passe en brouillon (publie = false).

Usage : python3 server/scripts/restructurer_cursus_onenji.py  (depuis OMPANGANO/ ; refuse de tourner deux fois)
"""
import importlib.util, json, os, sys, unicodedata

ICI = os.path.dirname(os.path.abspath(__file__))
RACINE = os.path.normpath(os.path.join(ICI, '..', '..'))
CONTENU = os.path.join(RACINE, 'packages', 'noyau', 'contenu')
REGLES = os.path.normpath(os.path.join(RACINE, '..', '_contexte', 'controle_regles_myene.py'))

_s = importlib.util.spec_from_file_location('regles', REGLES)
_r = importlib.util.module_from_spec(_s); _s.loader.exec_module(_r)
JOURNAL_GRAPHIE = []


def myene(t):
    """Graphie DONDO normalisée (règles v2.0 figées) ; la forme d'origine est notée dans le journal."""
    n = unicodedata.normalize('NFC', _r.normaliser(t, 'lecons')[0])
    if n != t:
        JOURNAL_GRAPHIE.append((t, n))
    return n


def lire(nom):
    return json.load(open(os.path.join(CONTENU, nom), encoding='utf8'))


def ecrire(nom, data):
    with open(os.path.join(CONTENU, nom), 'w', encoding='utf8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write('\n')


P, U, L, X = lire('parcours.json'), lire('unites.json'), lire('lecons.json'), lire('exercices.json')
if any(u['id'] == 'ntina-u6' for u in U):
    sys.exit('Déjà restructuré (ntina-u6 existe) : rien à faire.')

par_id = lambda liste, i: next(x for x in liste if x['id'] == i)

# ------------------------------------------------------------------ sources
S_CORPS = '[LEC] Le Corps humain'
S_FAM = '[LEC] La famille'
S_ANI = '[LEC] Animaux du Gabon'
S_ALI = '[LEC] LES ALIMENTS'
S_NAT = '[LEC] La Nature'
S_BJR = '[LEC] Bonjour'
S_INC = '[LEC] Les incontournables'
S_POL = '[LEC] Formules de politesse'
S_ECR = "[LEC] Comment écrire l'Omyènè"
S_PRON = '[LEC] Les pronoms et la conjugaison'
S_JM = '[LEC] Je mange'
S_DEV = '[LEC] LES DEVINETTES EN OMYENE'
S_CAPP = 'Capp, 21 nov. 2026 (claude/CONJUGAISON_MYENE_2026-11-21.md, § 2)'
S_CAPP12 = 'Capp, 12 nov. 2026 (RÈGLES v2.1, § 14.1)'
S_PRESENT = '[LEC] Dans la partie historique de notre peuple ; [LEC] Les poètes dragueurs'

# ------------------------------------------------------------------ fabrique d'exercices
class Lecon:
    def __init__(self, lid):
        self.lid, self.n, self.ex = lid, 0, []

    def _add(self, typ, **kw):
        self.n += 1
        e = {'id': f'{self.lid}-{self.n:02d}', 'lecon_id': self.lid, 'type': typ}
        e.update({k: v for k, v in kw.items() if v is not None})
        e['ordre'] = self.n
        self.ex.append(e)
        return e

    def cours(self, mot, fr, texte, src, conseil=None, ill=None):
        return self._add('cours', consigne='Regarde et écoute avant de jouer.', mot_myene=myene(mot) if mot else None,
                         mot_francais=fr, texte=texte, conseil=conseil, illustration=ill, source=src)

    def ecouter(self, mot, fr, src, ill=None, consigne='Écoute et répète.'):
        return self._add('ecouter', consigne=consigne, mot_myene=myene(mot), mot_francais=fr, illustration=ill, source=src)

    def dire(self, mot, fr, src, ill=None):
        m = myene(mot)
        return self._add('dire', consigne=f'Dis « {m} » à voix haute.', mot_myene=m, mot_francais=fr, illustration=ill, source=src)

    def associer(self, mot, bonne, autres, src, ill=None, indice=None):
        m = myene(mot)
        return self._add('associer', consigne=f'Que veut dire « {m} » ?', mot_myene=m, options=[bonne] + autres,
                         reponse=bonne, illustration=ill, indice=indice, source=src)

    def choix(self, fr, bonne, autres, src, ill=None, consigne=None, indice=None):
        b = myene(bonne)
        return self._add('choix', consigne=consigne or f'Comment dit-on « {fr} » ?', options=[b] + [myene(a) for a in autres],
                         reponse=b, illustration=ill, indice=indice, source=src)

    def choix_fr(self, consigne, bonne, autres, src, ill=None, indice=None, mot=None):
        """Question à choix dont les réponses ne sont pas du myènè (nombre de syllabes, sens d'une devinette…)."""
        return self._add('choix', consigne=consigne, mot_myene=myene(mot) if mot else None, options=[bonne] + autres,
                         reponse=bonne, illustration=ill, indice=indice, source=src)

    def ordre(self, phrase, fr, src):
        p = myene(phrase)
        return self._add('ordre', consigne=f'Remets la phrase dans l\'ordre : « {fr} ».', options=p.split(' '), reponse=p, source=src)

    def trou(self, phrase, bonne, autres, fr, src):
        return self._add('trou', consigne=f'Complète : « {fr} ».', mot_myene=myene(phrase), mot_francais=fr,
                         options=[myene(bonne)] + [myene(a) for a in autres], reponse=myene(bonne), source=src)

    def culture(self, mot, fr, texte, src):
        return self._add('culture', consigne='Bon à savoir', mot_myene=myene(mot) if mot else None, mot_francais=fr, texte=texte, source=src)

    def proverbe(self, mot, fr, texte, src):
        return self._add('proverbe', consigne='Un proverbe', mot_myene=myene(mot), mot_francais=fr, texte=texte, source=src)

    def jouer(self, jeu, titre, consigne='Joue avec les mots de la leçon (gratuit).'):
        return self._add('jouer', consigne=consigne, mot_francais=titre, jeu_id=jeu)

    def reprendre(self, e):
        """Rattache un exercice existant à cette leçon (même identifiant)."""
        self.n += 1
        e['lecon_id'], e['ordre'] = self.lid, self.n
        return e

    def copier(self, e, suffixe):
        """Copie d'un exercice existant (nouvel identifiant), quand l'original reste à sa place."""
        self.n += 1
        c = dict(e); c['id'] = f'{self.lid}-{suffixe}'; c['lecon_id'] = self.lid; c['ordre'] = self.n
        self.ex.append(c)
        return c


NOUVELLES_LECONS, NOUVEAUX_EX = [], []


def lecon(lid, unite, ordre, titre, duree=5, xp=15, mode='tous'):
    NOUVELLES_LECONS.append({'id': lid, 'unite_id': unite, 'titre': titre, 'duree_min': duree, 'xp': xp, 'mode': mode,
                             'niveau_acces': 'libre', 'ordre': ordre, 'publie': True})
    return Lecon(lid)


def fin(lc):
    NOUVEAUX_EX.extend(lc.ex)


ex_par_id = {e['id']: e for e in X}

# ================================================================== NTINA, PALIER 1 : écouter et montrer (3-4 ans)
# Saluer et Être poli restent ; leurs dictées vont au palier 3, la phrase à remettre en ordre et le dialogue à lire
# vont à l'entrée adulte (un enfant de 3-4 ans ne lit pas).

# Compléments : ces unités gardent au moins cinq questions de contrôle sans écrit.
lc = Lecon('ntina-l1'); lc.n = 100
lc.associer('Mbolo', 'Bonjour (à une personne)', ['Merci', 'Au revoir', "S'il te plaît"], '[LEC] Bonjour ; [RW] p. 284')
lc.choix('Merci', 'Akéwa', ['Mbolo', 'Kôkôlô'], "[LEC] Formules de politesse ; [RW] « finiz'akewa »")
NOUVEAUX_EX.extend(lc.ex)
lc = Lecon('ntina-l2'); lc.n = 100
lc.cours('Ibanga wé. Ka mènè !', 'Au revoir', 'Quand on part, on dit « Ibanga wé. Ka mènè ! ».', S_BJR, ill='👋')
lc.associer('Ibanga wé. Ka mènè !', 'Au revoir', ['Bonjour (à une personne)', 'Merci', "S'il te plaît"], S_BJR, '👋')
lc.choix('Au revoir', 'Ibanga wé. Ka mènè !', ['Mbolo', 'Akéwa'], S_BJR, '👋')
lc.dire('Ibanga wé. Ka mènè !', 'Au revoir', S_BJR, '👋')
lc.jouer('salutations-memoire', 'Mémoire des salutations')
NOUVEAUX_EX.extend(lc.ex)
lc = Lecon('ntina-l3'); lc.n = 100
lc.associer('Kôkôlô', "S'il te plaît", ['Merci', 'Excuse-moi', 'Viens !'], S_POL)
lc.choix('Excuse-moi', 'Nyéza myè', ['Kôkôlô', 'Yaga'], S_POL + ' ; [EQ]')
lc.associer('Yaga', 'Viens !', ["S'il te plaît", 'Merci', 'Excuse-moi'], S_POL)
lc.dire('Kôkôlô', "S'il te plaît", S_POL)
lc.jouer('salue-comme-il-faut', 'Salue comme il faut')
NOUVEAUX_EX.extend(lc.ex)
S_NB = '[LEC] Comptons ; Leçon 13 ; Corrections de Capp, 31 oct. 2026'
lc = lecon('ntina-l36', 'ntina-u5', 2, 'Jouer avec les nombres')
lc.associer('mbani', 'deux', ['un', 'quatre', 'cinq'], S_NB, '2️⃣')
lc.associer('otani', 'cinq', ['trois', 'deux', 'un'], S_NB, '5️⃣')
lc.choix('un', 'môri', ['nayi', 'mbani'], S_NB, '1️⃣')
lc.choix('quatre', 'nayi', ['otani', 'ntcharo'], S_NB, '4️⃣')
lc.dire('ntcharo', 'trois', S_NB, '3️⃣')
lc.proverbe('Nkula môri môri, é dyonyiz\'otondo.', 'Noisette par noisette, le panier finit par se remplir.',
            'On compte une noisette, puis une autre : petit à petit, on arrive au bout.',
            '[LEC] Proverbes O.docx ; [LEC] Mbya y.docx (recueil proverbes_DONDO)')
lc.jouer('panier-de-noisettes', 'Le panier de noisettes')
fin(lc)

# --- Mon corps
lc = lecon('ntina-l18', 'ntina-u6', 1, 'La tête et le visage')
lc.cours('Ewondjo', 'la tête', 'Touche ta tête et dis « ewondjo ». On apprend le corps en le montrant.', S_CORPS, ill='🙂')
for m, f, i in [('Ewondjo', 'la tête', '🙂'), ('Intcho', "l'œil", '👁️'), ('Aroyi', 'les oreilles', '👂'), ('Ompombo', 'le nez', '👃'),
                ('Ano', 'les dents', '🦷'), ('Onèmè', 'la langue', '👅')]:
    lc.ecouter(m, f, S_CORPS, i, consigne='Écoute, montre-le sur toi et répète.')
lc.associer('Intcho', "l'œil", ['le nez', 'la tête', 'la langue'], S_CORPS, '👁️')
lc.associer('Ompombo', 'le nez', ["l'œil", 'les oreilles', 'les dents'], S_CORPS, '👃')
lc.choix('la tête', 'Ewondjo', ['Aroyi', 'Ano'], S_CORPS, '🙂')
lc.dire('Ewondjo', 'la tête', S_CORPS, '🙂')
lc.jouer('touche-ta-tete', 'Touche ta tête')
fin(lc)

lc = lecon('ntina-l19', 'ntina-u6', 2, 'Les bras et les jambes')
lc.cours('Ikaka', 'la main', 'Lève la main : « ikaka ». Montre ton pied : « ogholo ».', S_CORPS, ill='✋')
for m, f, i in [('Ogô', 'le bras', '💪'), ('Ikaka', 'la main', '✋'), ('Oméno', 'le doigt', '☝️'), ('Ompéndé', 'la jambe', '🦵'),
                ('Ivuva', 'le genou', None), ('Ogholo', 'le pied', '🦶')]:
    lc.ecouter(m, f, S_CORPS, i, consigne='Écoute, montre-le sur toi et répète.')
lc.associer('Ikaka', 'la main', ['le pied', 'le bras', 'le genou'], S_CORPS, '✋')
lc.associer('Ogholo', 'le pied', ['la main', 'le doigt', 'la jambe'], S_CORPS, '🦶')
lc.choix('le bras', 'Ogô', ['Ompéndé', 'Oméno'], S_CORPS, '💪')
lc.dire('Ikaka', 'la main', S_CORPS, '✋')
lc.jouer('jacques-a-dit', 'Jacques a dit')
fin(lc)

# --- Ma famille
lc = lecon('ntina-l20', 'ntina-u7', 1, 'Papa, maman et les enfants')
lc.cours('Rérè', 'papa', 'Dans la famille : « rérè » (papa), « ngwè » (maman), « omwana » (un enfant), « awana » (des enfants).', S_FAM, ill='👨')
for m, f, i, s in [('Rérè', 'papa', '👨', S_FAM), ('Ngwè', 'maman', '👩', S_FAM), ('Omwana', 'un enfant', '🧒', 'Teisserès-Dubois 1957, voc. 1 (ômwana) ; Ambouroue 2007'),
                   ('Awana', 'des enfants', '👧', S_ECR), ('Ézombi', 'la sœur', None, S_FAM + ' (Ezombi) ; Capp (ézombi), RÈGLES v2.1 § 9'),
                   ('Omu-ngwè', 'le frère', None, S_FAM)]:
    lc.ecouter(m, f, s, i)
lc.associer('Ngwè', 'maman', ['papa', 'un enfant', 'la sœur'], S_FAM, '👩')
lc.associer('Rérè', 'papa', ['maman', 'le frère', 'des enfants'], S_FAM, '👨')
lc.choix('un enfant', 'Omwana', ['Rérè', 'Ngwè'], 'Teisserès-Dubois 1957, voc. 1 ; Ambouroue 2007', '🧒')
lc.dire('Ngwè', 'maman', S_FAM, '👩')
lc.jouer('famille-memoire', 'Mémoire de la famille')
fin(lc)

lc = lecon('ntina-l21', 'ntina-u7', 2, 'Les grands-parents et l\'oncle')
for m, f, i in [('Tata poyo', 'le grand-père', '👴'), ('Mama poyo', 'la grand-mère', '👵'), ('Ombalo', "l'oncle (frère de maman)", None), ('Irônda', "l'ami, l'amie", None)]:
    lc.ecouter(m, f, S_FAM, i)
lc.culture('Ombalo', "l'oncle maternel", "Chez les Orungu, l'oncle maternel, frère de maman, compte beaucoup : l'enfant appartient au lignage de sa mère (ozombi).",
           S_FAM + ' ; Teisserès-Dubois 1957, voc. 1 (ômbalô, oncle maternel) ; programme de formation, cycle 3 (ozombi)')
lc.associer('Tata poyo', 'le grand-père', ['la grand-mère', "l'oncle", 'papa'], S_FAM, '👴')
lc.associer('Mama poyo', 'la grand-mère', ['le grand-père', 'maman', "l'ami"], S_FAM, '👵')
lc.choix("l'ami", 'Irônda', ['Ombalo', 'Tata poyo'], S_FAM)
lc.choix("l'oncle (frère de maman)", 'Ombalo', ['Irônda', 'Mama poyo'], S_FAM)
lc.dire('Mama poyo', 'la grand-mère', S_FAM, '👵')
lc.jouer('famille-ogoni', 'Ogoni de la famille')
fin(lc)

# ================================================================== NTINA, PALIER 2 : nommer et dire (4-5 ans)
lc = lecon('ntina-l22', 'ntina-u8', 1, 'Les animaux de la maison')
for m, f, i, s in [('Mbwa', 'le chien', '🐕', S_ANI), ('Pusi', 'le chat', '🐈', S_ANI), ('Mboni', 'le cabri', '🐐', S_ANI),
                   ('Djôgôni', 'la poule', '🐔', S_ECR), ('Nyaré', 'le bœuf, la vache', '🐄', 'Corrections de Capp, 31 oct. 2026 (nyaré = bœuf)')]:
    lc.ecouter(m, f, s, i)
lc.associer('Mbwa', 'le chien', ['le chat', 'la poule', 'le cabri'], S_ANI, '🐕')
lc.associer('Djôgôni', 'la poule', ['le chien', 'le bœuf', 'le chat'], S_ECR, '🐔')
lc.choix('le chat', 'Pusi', ['Mbwa', 'Mboni'], S_ANI, '🐈')
lc.dire('Mboni', 'le cabri', S_ANI, '🐐')
lc.jouer('cri-des-animaux', 'Le cri des animaux')
fin(lc)

lc = lecon('ntina-l23', 'ntina-u8', 2, 'Les animaux de la forêt')
for m, f, i, s in [('Ndjôgu', "l'éléphant", '🐘', S_ANI), ('Ndjègô', 'la panthère', '🐆', S_ANI), ('Ndjina', 'le gorille', '🦍', S_ANI),
                   ('Kèma', 'le singe', '🐒', S_ANI), ('Nkambi', "l'antilope", '🦌', S_ANI + ' ; Corrections de Capp, 31 oct. 2026'),
                   ('Homba', 'le porc-épic', '🦔', S_ANI)]:
    lc.ecouter(m, f, s, i)
lc.associer('Ndjôgu', "l'éléphant", ['le gorille', 'le singe', "l'antilope"], S_ANI, '🐘')
lc.associer('Kèma', 'le singe', ["l'éléphant", 'la panthère', 'le porc-épic'], S_ANI, '🐒')
lc.choix('la panthère', 'Ndjègô', ['Ndjina', 'Nkambi'], S_ANI, '🐆')
lc.dire('Ndjôgu', "l'éléphant", S_ANI, '🐘')
lc.jouer('animaux-memoire', 'Mémoire des animaux')
fin(lc)

lc = lecon('ntina-l24', 'ntina-u9', 1, 'Au marché')
for m, f, i, s in [('Ikôndô', 'la banane plantain', '🍌', S_ALI), ('Ewèrè', 'le poisson', '🐟', S_ALI), ('Nyama', 'la viande', '🍖', S_NAT + ' ; Corrections de Capp, 31 oct. 2026'),
                   ('Iké', "l'œuf", '🥚', S_ALI), ('Mbenda', "l'arachide", '🥜', S_ALI), ('Ilasa', "l'orange", '🍊', S_ALI), ('Orési', 'le riz', '🍚', S_NAT)]:
    lc.ecouter(m, f, s, i)
lc.associer('Ewèrè', 'le poisson', ['la viande', "l'œuf", 'le riz'], S_ALI, '🐟')
lc.associer('Ilasa', "l'orange", ["l'arachide", 'la banane plantain', 'le poisson'], S_ALI, '🍊')
lc.choix("l'œuf", 'Iké', ['Mbenda', 'Nyama'], S_ALI, '🥚')
lc.dire('Ikôndô', 'la banane plantain', S_ALI, '🍌')
lc.jouer('aliments-memoire', 'Mémoire du marché')
fin(lc)

lc = lecon('ntina-l25', 'ntina-u9', 2, 'À table !')
for m, f, i, s in [('Yaga go nya', 'Viens manger', '🍽️', S_INC), ('Oghaso mbia', 'Bon appétit', '🍲', S_POL),
                   ('Zé nya ndé ?', 'On mange quoi ?', '🥄', S_INC), ('Va myè aningo', "Donne-moi de l'eau", '💧', S_INC)]:
    lc.ecouter(m, f, s, i)
lc.associer('Oghaso mbia', 'Bon appétit', ['Viens manger', 'On mange quoi ?', "Donne-moi de l'eau"], S_POL, '🍲')
lc.associer('Yaga go nya', 'Viens manger', ['Bon appétit', "Donne-moi de l'eau", 'Va dormir'], S_INC, '🍽️')
lc.choix("Donne-moi de l'eau", 'Va myè aningo', ['Zé nya ndé ?', 'Oghaso mbia'], S_INC, '💧')
lc.dire('Oghaso mbia', 'Bon appétit', S_POL, '🍲')
lc.jouer('la-cuisine', 'La cuisine')
fin(lc)

lc = lecon('ntina-l26', 'ntina-u10', 1, 'Ma maison')
for m, f, i in [('Nago', 'la maison', '🏠'), ('Odo', 'le lit', '🛏️'), ('Tavulu', 'la table', None), ('Ebongo', 'le banc', '🪑'),
                ('Ogoni', 'le feu', '🔥'), ('Ezômbôlô', 'le balai', '🧹')]:
    lc.ecouter(m, f, S_NAT, i)
lc.associer('Nago', 'la maison', ['le lit', 'le feu', 'le balai'], S_NAT, '🏠')
lc.associer('Odo', 'le lit', ['la table', 'la maison', 'le banc'], S_NAT, '🛏️')
lc.choix('le feu', 'Ogoni', ['Ebongo', 'Tavulu'], S_NAT, '🔥')
lc.dire('Nago', 'la maison', S_NAT, '🏠')
lc.jouer('maison-memoire', 'La maison du village')
fin(lc)

lc = lecon('ntina-l27', 'ntina-u10', 2, 'Le soir, on va dormir')
for m, f, i, s in [('Elinga', 'la robe', '👗', S_NAT), ('Epokolo', 'le chapeau', '👒', S_NAT), ('Gènda go dèwa !', 'Va dormir !', '😴', S_INC),
                   ('Mi kènda go dèwa', 'Je vais dormir', '🛏️', S_INC)]:
    lc.ecouter(m, f, s, i)
lc.associer('Gènda go dèwa !', 'Va dormir !', ['Viens manger', 'Je vais dormir', 'Bon appétit'], S_INC, '😴')
lc.associer('Epokolo', 'le chapeau', ['la robe', 'le lit', 'le balai'], S_NAT, '👒')
lc.choix('la robe', 'Elinga', ['Epokolo', 'Odo'], S_NAT, '👗')
lc.dire('Mi kènda go dèwa', 'Je vais dormir', S_INC, '🛏️')
lc.jouer('habille-toi', 'Habille-toi')
fin(lc)

lc = lecon('ntina-l28', 'ntina-u11', 1, 'Le ciel et la terre')
for m, f, i, s in [('Omwèyi', 'le soleil', '☀️', S_NAT + ' ; Corrections de Capp, 31 oct. 2026'), ('Ogwèli', 'la lune', '🌙', S_NAT), ('Ningo', 'la pluie', '🌧️', S_NAT),
                   ('Ntsuwa', 'la mer', '🌊', S_NAT), ('Iga', 'la forêt', '🌳', S_NAT), ('Éréré', "l'arbre", '🌳', S_ECR)]:
    lc.ecouter(m, f, s, i)
lc.associer('Omwèyi', 'le soleil', ['la lune', 'la pluie', 'la mer'], S_NAT, '☀️')
lc.associer('Ningo', 'la pluie', ['le soleil', 'la forêt', "l'arbre"], S_NAT, '🌧️')
lc.choix('la lune', 'Ogwèli', ['Omwèyi', 'Iga'], S_NAT, '🌙')
lc.dire('Omwèyi', 'le soleil', S_NAT, '☀️')
lc.jouer('lire-le-ciel', 'Lire le ciel')
fin(lc)

lc = lecon('ntina-l29', 'ntina-u11', 2, 'La veillée')
lc.cours('Wulinya myè', 'formule pour ouvrir un conte',
         "Le soir, au clair de lune, les anciens racontent des contes autour du feu. Pour commencer, on dit « Wulinya myè ».",
         "Capp (formule d'ouverture du conte, série Wulinya myè) ; programme de formation, cycle 1", ill='🔥')
lc.ecouter('Wulinya myè', 'formule pour ouvrir un conte', "Capp (formule d'ouverture du conte)", '📖')
lc.ecouter('Ogoni', 'le feu', S_NAT, '🔥')
lc.ecouter('Ogwèli', 'la lune', S_NAT, '🌙')
lc.choix_fr('Quand l\'ancien dit « Wulinya myè », que commence-t-il ?', 'Un conte', ['Un repas', 'Une chanson'],
            "Capp (formule d'ouverture du conte)", '📖', mot='Wulinya myè')
lc.choix('le feu', 'Ogoni', ['Ogwèli', 'Nago'], S_NAT, '🔥')
lc.jouer('la-veillee', 'La veillée')
fin(lc)

# Compter jusqu'à cinq : la leçon 1-5 reste (ses dictées partent au palier 3) ; « Jouer avec les nombres » la suit.

# ================================================================== NTINA, PALIER 3 : jouer avec les sons (5-7 ans)
REGLE_SYLL = 'RÈGLES DONDO v2.1, § 2.2 (on ne coupe jamais entre la nasale et la consonne)'
lc = lecon('ntina-l30', 'ntina-u12', 1, 'Taper les syllabes')
lc.cours('Nago', 'la maison', 'Tape dans tes mains à chaque morceau du mot : « na » (clap) « go » (clap). Nago a deux morceaux.', REGLE_SYLL, ill='👏')
for mot, fr, n, ill in [('Nago', 'la maison', '2', '🏠'), ('Awana', 'des enfants', '3', '🧒'), ('Mbwa', 'le chien', '1', '🐕'),
                        ('Ikaka', 'la main', '3', '✋'), ('Kèma', 'le singe', '2', '🐒'), ('Ewondjo', 'la tête', '3', '🙂')]:
    autres = [x for x in ['1', '2', '3'] if x != n]
    lc.choix_fr(f'Tape les syllabes de « {myene(mot)} » ({fr}). Combien en entends-tu ?', n, autres, REGLE_SYLL, ill, mot=mot,
                indice='Une syllabe pour chaque clap. « mb », « ndj », « ng » ne se coupent jamais.')
lc.jouer('syllabes', 'Syllabes')
fin(lc)

lc = lecon('ntina-l31', 'ntina-u12', 2, 'Les voyelles en images')
lc.cours(None, None, "Écoute bien la fin du mot : chaque voyelle a son son. Il y en a sept : a, é, è, i, o, ô, u.", S_ECR + ' ; Ambouroue 2007, p. 12', ill='🔤')
for i in ('qs-v-1', 'qs-v-2', 'qs-v-3', 'qs-v-4'):
    lc.copier(ex_par_id[i], i)
lc.ecouter('Kisini', 'la cuisine', S_ECR, '🍳', consigne='Écoute le « i » et répète.')
lc.ecouter('Épokolo', 'le chapeau', S_ECR, '👒', consigne='Écoute le « o » fermé et répète.')
lc.ecouter('Ékuru', 'le hibou', S_ECR, '🦉', consigne='Écoute le « u » (« ou ») et répète.')
lc.jouer('imagier-sonore', 'Imagier sonore')
fin(lc)

lc = lecon('ntina-l32', 'ntina-u12', 3, 'La musique des mots')
lc.cours(None, None, "En orungu, la voix monte et descend : c'est le ton. Suis la ligne avec ton doigt et chante le mot.", 'Ambouroue 2007, p. 52-57', ill='🎵')
for i, ill in [('nl13-mot-06', '🍊'), ('nl13-mot-05', '🔪'), ('nl13-mot-04', '🐍'), ('nl13-mot-11', '👑'), ('nl13-mot-12', '👑')]:
    c = lc.copier(ex_par_id[i], i); c['illustration'] = ill
lc.jouer('le-rythme', 'Le rythme')
fin(lc)

lc = lecon('ntina-l33', 'ntina-u14', 1, "J'écris mes premiers mots", duree=6)
lc.cours(None, None, 'Trace la lettre avec ton doigt, puis écris les mots que tu connais déjà.', 'RÈGLES DONDO v2.0, § 3', ill='✏️')
for i in ('tr-v-1', 'tr-v-2'):
    lc.copier(ex_par_id[i], i)
for i in ('e11', 'e16', 'nl15-dictee-1', 'nl15-dictee-2'):
    lc.reprendre(ex_par_id[i])
lc._add('dictee', consigne='Écris en myènè le mot qui veut dire « la maison ».', mot_francais='la maison', reponse='nago',
        indice='Il commence par « na… ».', source=S_NAT)
lc._add('dictee', consigne='Écris en myènè le mot qui veut dire « le chien ».', mot_francais='le chien', reponse='mbwa',
        indice='Il commence par « mb… ».', source=S_ANI)
lc.jouer('dictee', 'Dictée sonore')
fin(lc)

lc = lecon('ntina-l34', 'ntina-u15', 1, 'Tô, tôngè !')
lc.cours('Tô tôngè, reviza ni myè', 'formule de la devinette',
         "Celui qui pose la devinette dit « Tô ! ». Les autres répondent « Tôngè ! ». Puis il dit « Reviza ni myè » et pose sa devinette.", S_DEV, ill='❓')
lc.ecouter('Tô tôngè, reviza ni myè', 'formule de la devinette', S_DEV, '❓')
lc.choix_fr('On te dit « Tô ! ». Que réponds-tu ?', myene('Tôngè'), [myene('Akéwa'), myene('Kôkôlô')], S_DEV, '❓')
lc.choix_fr('Deux enfants de la même mère qui ne se voient jamais. Qui sont-ils ?', myene('Aroyi') + ' (les oreilles)',
            [myene('Intcho') + " (l'œil)", myene('Ano') + ' (les dents)'], S_DEV + ' (réponse : aroyi)', '👂', mot="Anaga ngwè mo, w'ayènana ?")
lc.choix_fr('Une maison sans portes. Qu\'est-ce que c\'est ?', myene('Iké') + " (l'œuf)", [myene('Nago') + ' (la maison)', myene('Owaro') + ' (la pirogue)'],
            S_DEV + ' (réponse : iké)', '🥚', mot='Nago nogo-pa, ompombana fô !')
lc.jouer('devinettes', 'Tô, tôngè')
fin(lc)

lc = lecon('ntina-l35', 'ntina-u15', 2, 'Devine qui je suis')
lc.cours(None, None, 'Écoute la devinette, puis trouve le mot. Tu les connais tous !', 'Mots des unités précédentes', ill='🔎')
for q, b, a, s, ill in [("J'ai une trompe et de grandes oreilles.", 'Ndjôgu', ['Kèma', 'Pusi'], S_ANI, '🐘'),
                        ('Je brille le jour dans le ciel.', 'Omwèyi', ['Ogwèli', 'Ningo'], S_NAT, '☀️'),
                        ('On dort dessus.', 'Odo', ['Tavulu', 'Ogoni'], S_NAT, '🛏️'),
                        ('Je vis dans l\'eau et on me mange.', 'Ewèrè', ['Iké', 'Mbenda'], S_ALI, '🐟'),
                        ('Je chante le matin dans le village.', 'Djôgôni', ['Mbwa', 'Mboni'], S_ECR, '🐔')]:
    lc.choix(None, b, a, s, ill, consigne=q)
lc.jouer('devinettes', 'Tô, tôngè')
fin(lc)

# ================================================================== OGÈNDO : la grammaire (formes validées seulement)
G = 'ogendo-u6'
lc = lecon('ogendo-l13', G, 1, 'Qui parle ? Les pronoms', duree=8, xp=20)
lc.cours(None, None, "Pour dire qui fait l'action, on met un petit mot devant le verbe : mi (je), wé (tu), e (il, elle), zé (nous), né (vous), wé (ils, elles). "
         "Le verbe perd son « go » : go nya (manger) → mi nya (je mange).", S_PRON + ' ; ' + S_JM + ' ; RÈGLES v2.1, § 6.1', ill='🗣️')
for m, f in [('Mi nya', 'je mange'), ('Wé nya', 'tu manges'), ('E nya', 'il mange, elle mange'), ('Zé nya', 'nous mangeons'), ('Né nya', 'vous mangez')]:
    lc.ecouter(m, f, S_JM + (' ; ' + S_PRON + ' (Mi nya) ; ' + S_CAPP if m == 'Mi nya' else ''))
lc.culture('Myé nya · Mi nya', 'je mange', "On entend aussi « Myé nya » pour « je mange ». Les deux se disent.", S_JM + ' (Myé nya) ; ' + S_PRON + ' ; ' + S_CAPP + ' (Mi nya)')
lc.associer('Zé nya', 'nous mangeons', ['je mange', 'tu manges', 'vous mangez'], S_JM)
lc.associer('Né nya', 'vous mangez', ['nous mangeons', 'il mange', 'je mange'], S_JM)
lc.choix('je mange', 'Mi nya', ['Wé nya', 'Zé nya'], S_PRON + ' ; ' + S_CAPP)
lc.trou('___ nya', 'Wé', ['Mi', 'Zé'], 'tu manges', S_JM)
lc.dire('Mi nya', 'je mange', S_CAPP)
lc.jouer('course-des-verbes', 'La course des verbes')
fin(lc)

lc = lecon('ogendo-l14', G, 2, 'Maintenant : le présent', duree=8, xp=20)
lc.cours(None, None, "Le présent dit ce qu'on fait maintenant, et aussi ce qui est toujours vrai. On le forme avec le sujet et le verbe sans « go ».",
         S_CAPP + ' ; ' + S_PRON, conseil="« Orungu wi ny'éwèrè » : les Orungu mangent du poisson (c'est toujours vrai).", ill='⏱️')
for m, f in [('Mi dura', 'je tire'), ('Wé pôla', 'tu cours'), ('E dyina', 'il danse'), ('E déna', 'elle pleure'), ('Zé séva', 'nous jouons'), ('Né djèna', 'vous voyez')]:
    lc.ecouter(m, f, S_PRON)
lc.ecouter("Orungu wi ny'éwèrè", 'Les Orungu mangent du poisson', S_CAPP)
lc.associer('E dyina', 'il danse', ['elle pleure', 'nous jouons', 'tu cours'], S_PRON)
lc.associer('Zé séva', 'nous jouons', ['vous voyez', 'il danse', 'je tire'], S_PRON)
lc.choix('elle pleure', 'E déna', ['E dyina', 'Zé séva'], S_PRON)
lc.trou('Zé ___', 'séva', ['déna', 'dyina'], 'nous jouons', S_PRON)
lc.ordre("Orungu wi ny'éwèrè", 'Les Orungu mangent du poisson', S_CAPP)
lc.jouer('course-des-verbes', 'La course des verbes')
fin(lc)

lc = lecon('ogendo-l15', G, 3, 'Hier : le passé', duree=8, xp=20)
lc.cours(None, None, "Pour une action finie, on met « a » après le sujet et le verbe se termine en « -i » : mi nya → ma nyéni (j'ai mangé). "
         "Attention : certains verbes changent davantage. « Aller » donne « a gendi », « venir » donne « a wyeni », « naître » donne « a yano ».",
         S_CAPP + ' ; claude/CONJUGAISON_MYENE_2026-11-21.md, § 3.3-3.4', ill='⏮️')
for m, f, s in [('Ma nyéni', "j'ai mangé", S_CAPP), ('A gendi', 'il est allé', 'Capp, 21 nov. 2026 (CONJUGAISON § 3.3)'),
                ('A wyeni', 'il est venu', 'Capp, 21 nov. 2026 (CONJUGAISON § 3.3)'), ('A woli myè', "elle m'a tapé", S_PRON + ' (go bola)'),
                ('Ma luwo mé nya', "j'étais en train de manger", S_CAPP)]:
    lc.ecouter(m, f, s)
lc.culture('Za lénigi', 'nous pleurions', "Pour ce qu'on faisait souvent autrefois, la fin devient « -igi » et la première consonne s'adoucit : go déna → za lénigi.", S_PRON)
lc.associer('Ma nyéni', "j'ai mangé", ['je mange', 'je vais manger', "j'étais en train de manger"], S_CAPP)
lc.associer('A wyeni', 'il est venu', ['il est allé', "elle m'a tapé", 'il danse'], 'Capp, 21 nov. 2026 (CONJUGAISON § 3.3)')
lc.choix('il est allé', 'A gendi', ['A wyeni', 'E dyina'], 'Capp, 21 nov. 2026 (CONJUGAISON § 3.3)')
lc.choix_fr('Laquelle de ces phrases parle du passé ?', myene('Ma nyéni'), [myene('Mi nya'), myene('Mi bé nya')], S_CAPP)
lc.choix_fr('« Il est né à Mandji. » Quelle forme du verbe naître ?', 'a yano', ['a dyani', 'a dyana'],
            'Capp, 21 nov. 2026 (CONJUGAISON § 3.4 : a dyani est faux)', indice='Naître ne suit pas la règle en « -i » : on dit « a yano ».')
fin(lc)

lc = lecon('ogendo-l16', G, 4, 'Demain : le futur', duree=8, xp=20)
lc.cours(None, None, "Pour le futur, on place « bé » entre le sujet et le verbe : mi nya → mi bé nya (je vais manger). "
         "Pour dire « à ce moment-là », on ajoute le moment devant : « Mènè midi, mi bé nya ».", S_CAPP + ' ; ' + S_PRON, ill='⏭️')
for m, f, s in [('Mi bé nya', 'je vais manger', S_CAPP), ('Wé bé djèna', 'tu verras', S_PRON), ('Mènè midi, mi bé nya', 'demain à midi, je serai en train de manger', S_CAPP)]:
    lc.ecouter(m, f, s)
lc.choix('je vais manger', 'Mi bé nya', ['Ma nyéni', 'Mi nya'], S_CAPP)
lc.associer('Wé bé djèna', 'tu verras', ['tu cours', 'tu manges', 'vous voyez'], S_PRON)
lc.trou('Mi ___ nya', 'bé', ['a', 'go'], 'je vais manger', S_CAPP)
lc.choix('demain à midi, je serai en train de manger', 'Mènè midi, mi bé nya', ['Ma luwo mé nya', 'Ma nyéni'], S_CAPP,
         indice='On ne dit jamais « Mi bé luwo mé nya ».')
lc.ordre('Mènè midi, mi bé nya', 'demain à midi, je serai en train de manger', S_CAPP)
lc.dire('Mi bé nya', 'je vais manger', S_CAPP)
fin(lc)

lc = lecon('ogendo-l17', G, 5, 'Poser une question', duree=8, xp=20)
lc.cours(None, None, "En orungu, on ne construit pas la question comme en français : sujet, verbe, complément, et le mot de la question à la fin (ndé, sè, gwé).",
         S_CAPP12, conseil="On dit « Wé bel'intchango ndé ? », jamais « Intchango ndé wé bele ? ».", ill='❓')
for m, f, s in [('Intchango sè ?', 'Quelles nouvelles ?', 'Capp (RÈGLES v2.1, § 9, formules)'), ("Wé bel'intchango ndé ?", 'Quelles nouvelles veux-tu ?', S_CAPP12),
                ('Eré na gwé ?', 'Il est où ?', S_INC), ('Zé nya ndé ?', 'On mange quoi ?', S_INC), ('Wé bulia sè ?', 'Tu dis quoi ?', S_INC)]:
    lc.ecouter(m, f, s)
lc.ordre("Wé bel'intchango ndé ?", 'Quelles nouvelles veux-tu ?', S_CAPP12)
lc.choix_fr('Quelle phrase est juste ?', myene("Wé bel'intchango ndé ?"), [myene('Intchango ndé wé bele ?')], S_CAPP12,
            indice='Le mot de la question va à la fin.')
lc.associer('Eré na gwé ?', 'Il est où ?', ['On mange quoi ?', 'Tu dis quoi ?', 'Quelles nouvelles ?'], S_INC)
lc.choix('On mange quoi ?', 'Zé nya ndé ?', ['Wé bulia sè ?', 'Eré na gwé ?'], S_INC)
lc.associer('Wé bulia sè ?', 'Tu dis quoi ?', ['Il est où ?', 'On mange quoi ?', 'Quelles nouvelles veux-tu ?'], S_INC)
lc.jouer('dialogues', 'Dialogues à compléter')
fin(lc)

# ================================================================== IKÔKÔ : entrée de l'adulte qui débute
A = 'ikoko-u1'
lc = lecon('ikoko-l1', A, 1, 'Saluer et prendre des nouvelles', duree=8, xp=20, mode='adulte')
lc.cours('Mbôluani', 'Bonjour (à plusieurs)', "On salue en entrant : « Mbôluani » à plusieurs, « Salé ! » pour souhaiter la bienvenue. Puis on demande les nouvelles.",
         'Capp (RÈGLES v2.1, § 9, formules validées) ; ' + S_BJR, ill='👋')
for m, f, s in [('Mbôluani', 'Bonjour (à plusieurs)', 'Capp (RÈGLES v2.1, § 9)'), ('Salé !', 'Bienvenue', 'Capp (RÈGLES v2.1, § 9) ; ' + S_BJR),
                ('Intchango sè ?', 'Quelles nouvelles ?', 'Capp (RÈGLES v2.1, § 9)'), ('Nkolo mbia', 'Bonsoir', S_BJR)]:
    lc.ecouter(m, f, s)
lc.proverbe('Ndégho é bandamino ni ntchango', "L'amitié s'entretient avec des nouvelles.", "Prendre des nouvelles, c'est entretenir le lien.",
            '[LEC] Proverbes O.docx (recueil proverbes_DONDO)')
lc.associer('Mbôluani', 'Bonjour (à plusieurs)', ['Merci beaucoup', 'Bonsoir', 'Excuse-moi'], 'Capp (RÈGLES v2.1, § 9)')
lc.choix('Bonsoir', 'Nkolo mbia', ['Akéwa', 'Kôkôlô'], S_BJR)
lc.associer('Intchango sè ?', 'Quelles nouvelles ?', ['Tu dis quoi ?', 'Il est où ?', 'On mange quoi ?'], 'Capp (RÈGLES v2.1, § 9)')
for i in ('e7', 'e14'):
    lc.reprendre(ex_par_id[i])
fin(lc)

lc = lecon('ikoko-l2', A, 2, 'Se présenter', duree=8, xp=20, mode='adulte')
lc.cours(None, None, "Pour faire connaissance : demander le nom, d'où l'on vient, où l'on est né, et si l'on parle la langue.", S_PRESENT, ill='🤝')
for m, f in [('Wé koko nè sè ?', "Comment t'appelles-tu ?"), ('Mi koko nè…', "Je m'appelle…"), ('Wé pila na gwé ?', "D'où viens-tu ?"),
             ('Wa yano na gwé ?', 'Où es-tu né ?'), ("Wé kamb'inongô ?", 'Parles-tu la langue ?')]:
    lc.ecouter(m, f, '[LEC] Les poètes dragueurs' if m != "Wé kamb'inongô ?" else S_INC)
lc.associer('Wé koko nè sè ?', "Comment t'appelles-tu ?", ["D'où viens-tu ?", 'Où es-tu né ?', 'Parles-tu la langue ?'], '[LEC] Les poètes dragueurs')
lc.associer('Wé pila na gwé ?', "D'où viens-tu ?", ["Comment t'appelles-tu ?", 'Tu dis quoi ?', 'Il est où ?'], '[LEC] Les poètes dragueurs')
lc.choix('Où es-tu né ?', 'Wa yano na gwé ?', ['Wé pila na gwé ?', 'Wé koko nè sè ?'], '[LEC] Les poètes dragueurs ; Capp (a yano), CONJUGAISON § 3.4')
lc.choix('Parles-tu la langue ?', "Wé kamb'inongô ?", ['Wé bulia sè ?', 'Eré na gwé ?'], S_INC)
lc.ordre('Wé koko nè sè ?', "Comment t'appelles-tu ?", '[LEC] Les poètes dragueurs')
lc.dire('Mi koko nè…', "Je m'appelle…", '[LEC] Les poètes dragueurs')
fin(lc)

lc = lecon('ikoko-l3', A, 3, 'Politesse et vie courante', duree=8, xp=20, mode='adulte')
for m, f, s in [('Kôkôlô', "S'il te plaît", S_POL), ('Nyéza myè', 'Excuse-moi, pardon', S_POL + ' ; Capp'), ('Akéwa mpolo !', 'Merci beaucoup', 'Capp (RÈGLES v2.1, § 9)'),
                ('Oghaso mbia', 'Bon appétit', S_POL), ('Va myè aningo', "Donne-moi de l'eau", S_INC), ("M'iré dyasapa", 'Je suis fatigué', S_INC),
                ('Mi kènda go dèwa', 'Je vais dormir', S_INC)]:
    lc.ecouter(m, f, s)
lc.associer('Nyéza myè', 'Excuse-moi, pardon', ["S'il te plaît", 'Merci beaucoup', 'Bon appétit'], S_POL)
lc.associer("M'iré dyasapa", 'Je suis fatigué', ['Je vais dormir', "Donne-moi de l'eau", 'Excuse-moi'], S_INC)
lc.choix('Merci beaucoup', 'Akéwa mpolo !', ['Kôkôlô', 'Nyéza myè'], 'Capp (RÈGLES v2.1, § 9)')
lc.choix("Donne-moi de l'eau", 'Va myè aningo', ['Oghaso mbia', 'Mi kènda go dèwa'], S_INC)
lc.choix("S'il te plaît", 'Kôkôlô', ['Akéwa mpolo !', "M'iré dyasapa"], S_POL)
lc.jouer('dialogues', 'Dialogues à compléter')
fin(lc)

# ================================================================== unités
def unite(uid, parcours, ordre, titre, desc, palier=None, palier_titre=None, entree=None, suite=None):
    u = {'id': uid, 'parcours_id': parcours, 'titre': titre, 'description': desc, 'ordre': ordre, 'publie': True}
    if palier:
        u['palier'], u['palier_titre'] = palier, palier_titre
    if entree:
        u['entree'] = entree
    if suite:
        u['suite_id'] = suite
    return u

P1, P2, P3 = 'Palier 1 · Écouter et montrer (3-4 ans)', 'Palier 2 · Nommer et dire (4-5 ans)', 'Palier 3 · Jouer avec les sons (5-7 ans)'
U_NOUV = [
    unite('ntina-u6', 'ntina', 3, 'Mon corps', 'Montrer et nommer la tête, le visage, les bras et les jambes.', 1, P1),
    unite('ntina-u7', 'ntina', 4, 'Ma famille', 'Papa, maman, les enfants, les grands-parents, l\'oncle maternel.', 1, P1),
    unite('ntina-u8', 'ntina', 5, 'Les animaux', 'Les animaux de la maison, de la forêt et de la lagune.', 2, P2),
    unite('ntina-u9', 'ntina', 6, 'Manger', 'Le marché et les mots du repas.', 2, P2),
    unite('ntina-u10', 'ntina', 7, 'Ma maison', 'La maison, les habits, l\'heure d\'aller dormir.', 2, P2),
    unite('ntina-u11', 'ntina', 8, 'Le ciel et la veillée', 'Le soleil, la lune, la pluie ; écouter un conte au coin du feu.', 2, P2),
    unite('ntina-u12', 'ntina', 10, 'Les sons en jeux', 'Taper les syllabes, entendre les voyelles et la musique des mots.', 3, P3),
    unite('ntina-u13', 'ntina', 11, "Compter jusqu'à dix", 'De six à dix, et compter les choses.', 3, P3),
    unite('ntina-u14', 'ntina', 12, "J'écris", 'Tracer les lettres et écrire ses premiers mots.', 3, P3),
    unite('ntina-u15', 'ntina', 13, 'Devinettes', 'La devinette traditionnelle « Tô, tôngè » et des devinettes avec les mots appris.', 3, P3),
    unite('ogendo-u6', 'ogendo', 3, 'Faire des phrases', 'Qui parle, maintenant, hier, demain, et poser une question (formes validées par Capp).'),
    unite('ikoko-u1', 'ikoko', 1, 'Premiers échanges', "Pour l'adulte qui débute : saluer, se présenter, la politesse de tous les jours. Ensuite : les unités d'Ogèndo.",
          entree='adulte_debutant', suite='ntina-u3'),
]

MAJ_U = {
    'ntina-u1': dict(ordre=1, palier=1, palier_titre=P1),
    'ntina-u2': dict(ordre=2, palier=1, palier_titre=P1),
    'ntina-u5': dict(ordre=9, palier=2, palier_titre=P2, titre="Compter jusqu'à cinq", description='De un à cinq, avec un proverbe pour compter.'),
    'ntina-u3': dict(parcours_id='ogendo', ordre=1, titre='Lire et écrire les sons', description='Les sept voyelles et toutes les consonnes, puis les tons : lire et écrire.'),
    'ntina-u4': dict(parcours_id='ogendo', ordre=2),
    'ogendo-u1': dict(publie=False, description='Fusionnée dans « Lire et écrire les sons » (21 nov. 2026) ; gardée en brouillon.'),
    'ogendo-u2': dict(ordre=4), 'ogendo-u3': dict(ordre=5), 'ogendo-u4': dict(ordre=6), 'ogendo-u5': dict(ordre=7),
}
for uid, champs in MAJ_U.items():
    par_id(U, uid).update(champs)
U.extend(U_NOUV)

# ------------------------------------------------------------------ leçons déplacées
MAJ_L = {
    'ntina-l5': dict(unite_id='ntina-u8', ordre=3),
    'ntina-l4': dict(ordre=1), 'ntina-l6': dict(ordre=2), 'ntina-l7': dict(ordre=3), 'ntina-l8': dict(ordre=4),
    'ogendo-l1': dict(unite_id='ntina-u3', ordre=5, titre="Révision : les consonnes de l'orungu"),
    'ogendo-l2': dict(unite_id='ntina-u3', ordre=6),
    'ntina-l16': dict(unite_id='ntina-u13', ordre=1), 'ntina-l17': dict(unite_id='ntina-u13', ordre=2),
}
for lid, champs in MAJ_L.items():
    par_id(L, lid).update(champs)
L.extend(NOUVELLES_LECONS)

# ------------------------------------------------------------------ corrections de Capp (21 nov. 2026)
e = ex_par_id['nl17-phrase-01']
e['mot_myene'] = myene("Mi tang'igomi gn'itondo ambani.")
e['source'] = "Capp, 21 nov. 2026 (CONJUGAISON § 4 : « agom'ambani m'itondo » remplacé par « igomi gn'itondo ambani ») ; forme source : gn'itondo"
e = ex_par_id['nl17-mot-02']
e['mot_myene'] = myene("igomi ny'imboni")
e['source'] += " ; Capp, 10 nov. 2026 (Igomi gni mboni → Igomi ny'imboni, RÈGLES v2.1 § 11)"
e = ex_par_id['nl17-cours']
e['texte'] = e['texte'].replace("Pour dix, on dit igomi gni devant le nom : igomi gni mboni, dix chèvres.",
                                "Pour dix, on dit igomi, puis ny' et le nom avec son i : igomi ny'imboni, dix chèvres.")
e = ex_par_id['nl17-choix-01']
e['options'] = [myene("igomi ny'imboni") if o == 'igomi gni mboni' else o for o in e['options']]

# ------------------------------------------------------------------ parcours
par_id(P, 'ntina')['description'] = ("Moins de 7 ans. Trois paliers, comme à la maternelle : écouter et montrer, nommer et dire, "
                                     "puis jouer avec les sons. Pas d'écrit avant le troisième palier.")
par_id(P, 'ogendo')['description'] = ("7 à 12 ans. Lire et écrire les sons, prononcer juste, faire des phrases (qui parle, maintenant, hier, demain, questions), "
                                      "puis dire le monde : la maison, l'espace, le temps, les nombres.")
par_id(P, 'ikoko')['description'] = ("21 ans et plus. L'adulte qui débute commence par « Premiers échanges », puis suit les unités d'Ogèndo. "
                                     "Le parcours des transmetteurs arrive ensuite.")

X.extend(NOUVEAUX_EX)
ids = [e['id'] for e in X]
assert len(ids) == len(set(ids)), 'identifiants d\'exercices en double'
assert len({l['id'] for l in L}) == len(L) and len({u['id'] for u in U}) == len(U)

ecrire('unites.json', U); ecrire('lecons.json', L); ecrire('exercices.json', X); ecrire('parcours.json', P)
print(f'{len(U_NOUV)} unités, {len(NOUVELLES_LECONS)} leçons, {len(NOUVEAUX_EX)} exercices ajoutés ; total {len(U)} unités, {len(L)} leçons, {len(X)} exercices.')
for a, b in sorted(set(JOURNAL_GRAPHIE)):
    print(f'graphie : {a} → {b}')
