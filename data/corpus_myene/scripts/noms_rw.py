# -*- coding: utf-8 -*-
# Noms tirés du Dictionnaire mpongwé-français (Raponda-Walker 1995) via le JSON 07_donnees.
# Genre et catégorie sont fixés par le mot-tête français de la glose (liste ci-dessous).
import json, re, collections
from wordfreq import zipf_frequency as ZF
exec(open('/home/claude/w/modern.py').read())

K = """
poisson/m/poisson sardine/f/poisson silure/m/poisson carpe/f/poisson mulet/m/poisson thon/m/poisson raie/f/poisson requin/m/poisson
capitaine/m/poisson anguille/f/poisson brochet/m/poisson crevette/f/poisson crabe/m/poisson huître/f/poisson langouste/f/poisson
tortue/f/animal coquillage/m/poisson mâchoiron/m/poisson barbeau/m/poisson
antilope/f/animal gazelle/f/animal singe/m/animal chimpanzé/m/animal gorille/m/animal éléphant/m/animal hippopotame/m/animal
buffle/m/animal panthère/f/animal léopard/m/animal porc-épic/m/animal rat/m/animal sanglier/m/animal lézard/m/animal
serpent/m/animal python/m/animal vipère/f/animal crocodile/m/animal grenouille/f/animal crapaud/m/animal oiseau/m/oiseau perroquet/m/oiseau
poule/f/animal coq/m/animal canard/m/oiseau pigeon/m/oiseau aigle/m/oiseau vautour/m/oiseau hibou/m/oiseau épervier/m/oiseau
chèvre/f/animal cabri/m/animal mouton/m/animal brebis/f/animal bœuf/m/animal vache/f/animal chien/m/animal chat/m/animal
chauve-souris/f/animal écureuil/m/animal pangolin/m/animal lamantin/m/animal chenille/f/animal fourmi/f/animal abeille/f/animal
mouche/f/animal moustique/m/animal papillon/m/animal araignée/f/animal termite/m/animal ver/m/animal escargot/m/animal
guêpe/f/animal criquet/m/animal sauterelle/f/animal mille-pattes/m/animal scorpion/m/animal civette/f/animal genette/f/animal
banane/f/aliment manioc/m/aliment igname/f/aliment taro/m/aliment arachide/f/aliment maïs/m/aliment riz/m/aliment pain/m/aliment
viande/f/aliment sel/m/aliment sucre/m/aliment huile/f/aliment miel/m/aliment fruit/m/aliment orange/f/aliment citron/m/aliment
mangue/f/aliment papaye/f/aliment ananas/m/aliment noix/f/aliment sauce/f/aliment piment/m/aliment tomate/f/aliment
aubergine/f/aliment oignon/m/aliment haricot/m/aliment pois/m/aliment œuf/m/aliment farine/f/aliment galette/f/aliment
tubercule/m/aliment patate/f/aliment champignon/m/aliment avocat/m/aliment graine/f/aliment gâteau/m/aliment canne/f/aliment
eau/f/boisson vin/m/boisson alcool/m/boisson bière/f/boisson lait/m/boisson
couteau/m/objet marmite/f/objet cuillère/f/objet assiette/f/objet panier/m/objet corbeille/f/objet sac/m/objet malle/f/objet
caisse/f/objet boîte/f/objet bouteille/f/objet verre/m/objet calebasse/f/objet pot/m/objet cruche/f/objet natte/f/objet
lit/m/objet chaise/f/objet banc/m/objet table/f/objet lampe/f/objet torche/f/objet bâton/m/objet corde/f/objet filet/m/objet
hameçon/m/objet pagaie/f/objet pirogue/f/objet canot/m/objet voile/f/objet hache/f/objet machette/f/objet sagaie/f/objet
lance/f/objet fusil/m/objet arc/m/objet flèche/f/objet tambour/m/objet harpe/f/objet miroir/m/objet peigne/m/objet balai/m/objet
clé/f/objet aiguille/f/objet fil/m/objet savon/m/objet pipe/f/objet tabouret/m/objet coffre/m/objet cuvette/f/objet seau/m/objet
écuelle/f/objet mortier/m/objet pilon/m/objet tamis/m/objet nasse/f/objet piège/m/objet hotte/f/objet livre/m/objet lettre/f/objet
papier/m/objet crayon/m/objet jouet/m/objet balle/f/objet cloche/f/objet marteau/m/objet clou/m/objet planche/f/objet ancre/f/objet
gouvernail/m/objet mât/m/objet épervier/m/objet harpon/m/objet couvercle/m/objet éventail/m/objet hamac/m/objet armoire/f/objet
pagne/m/vetement chapeau/m/vetement habit/m/vetement vêtement/m/vetement robe/f/vetement chemise/f/vetement pantalon/m/vetement
ceinture/f/vetement collier/m/vetement bracelet/m/vetement bague/f/vetement perle/f/vetement soulier/m/vetement sandale/f/vetement
bonnet/m/vetement couverture/f/vetement drap/m/vetement étoffe/f/vetement tissu/m/vetement manteau/m/vetement
arbre/m/plante herbe/f/plante liane/f/plante palmier/m/plante fleur/f/plante racine/f/plante écorce/f/plante branche/f/plante
roseau/m/plante papyrus/m/plante bambou/m/plante plante/f/plante arbuste/m/plante feuille/f/plante
village/m/lieu case/f/lieu maison/f/lieu cour/f/lieu forêt/f/lieu plage/f/lieu rivière/f/lieu lac/m/lieu mer/f/lieu île/f/lieu
route/f/lieu chemin/m/lieu champ/m/lieu plantation/f/lieu marché/m/lieu jardin/m/lieu savane/f/lieu colline/f/lieu marais/m/lieu
pluie/f/nature soleil/m/nature lune/f/nature étoile/f/nature vent/m/nature nuage/m/nature ciel/m/nature orage/m/nature
foudre/f/nature tonnerre/m/nature sable/m/nature pierre/f/nature rocher/m/nature argile/f/nature boue/f/nature fumée/f/nature
cendre/f/nature marée/f/nature vague/f/nature brouillard/m/nature rosée/f/nature charbon/m/nature tison/m/objet
hirondelle/f/oiseau moineau/m/oiseau chouette/f/oiseau grive/f/oiseau tourterelle/f/oiseau effraie/f/oiseau cardinal/m/oiseau
punaise/f/animal taon/m/animal rainette/f/animal guépard/m/animal protoptère/m/poisson bucarde/f/poisson
pieu/m/objet poutre/f/objet poêle/f/objet fourreau/m/objet racloir/m/objet radeau/m/objet ficelle/f/objet rabot/m/objet
toile/f/objet louche/f/objet chiffon/m/objet burette/f/objet rideau/m/objet barrière/f/objet boule/f/objet paquet/m/objet
barre/f/objet rouleau/m/objet parapluie/m/objet goélette/f/objet cloison/f/objet
chaussette/f/vetement fève/f/aliment oseille/f/aliment chou/m/aliment colocase/f/aliment chou-palmiste/m/aliment
eau-de-vie/f/boisson hydromel/m/boisson buisson/m/plante amarante/f/plante acacia/m/plante
cimetière/m/lieu débarcadère/m/lieu falaise/f/lieu golfe/m/lieu océan/m/lieu vallon/m/lieu pont/m/lieu nid/m/objet coquille/f/objet
"""
KW = {}
for t in K.split():
    w, g, c = t.split('/'); KW[w] = (g, c)
NON_COMPTABLE = set("sel sucre huile miel riz pain viande farine eau vin alcool bière lait sable argile boue fumée cendre manioc maïs".split())
BAD = re.compile(r"\b(sorte|espèce|genre|variété|nom|terme|partie|action|manière|état|qualité|faire|qui|que|dont|celui|indigènes?|européens?|blancs?|pl|sg|syn|voy|cf)\b", re.I)
ADJ_OK = re.compile(r"^[a-zàâçéèêëîïôûùü-]+$")

def gloss(d):
    for _ in range(3):
        d = re.sub(r'^\s*(?:(?:[Cc][li1]|u|U|pl|Pl)\.?\s*)?(?:[IVXL]+|[1lI]V|V[1lI]+)?\s*\.?\s*(?=\S)', '', d, count=1)
        d = re.sub(r'^\s*(?:[IVXL]+)\s*\.\s*', '', d)
    d = re.sub(r'^\s*\((?:[^)]*)\)\.?\s*', '', d)
    return re.split(r'[.,;:(]', d)[0].strip()

E = json.load(open('/mnt/user-data/uploads/DONDO/07_donnees/dictionnaire_mpongwe_francais.json'))['entries']
rows = []; seen = set()
for x in E:
    if x['grammar_tag'] not in ('s. cl.', 's.', 's. adj. cl.'):
        continue
    d = x['definition_raw']
    if re.search(r'\bSg\.', d[:250]):
        continue
    g = gloss(d).lower()
    g = re.sub(r"^(un|une|le|la|les|l')\s*", "", g)
    if not g or BAD.search(g) or len(g.split()) > 3 or re.search(r"\d", g):
        continue
    if re.search(r"\b(du|de|des|d'|à|au)$", g) or g.startswith('plante du'): continue
    head = g.split()[0]
    if head not in KW:
        continue
    rest = g.split()[1:]
    if rest and (rest[0] not in ('de', "d'", 'à', 'en') and any(ZF(w, 'fr') < 2.5 for w in rest)):
        continue
    # pluriel français dans la glose -> on écarte
    if re.search(r"(s|x)$", head) and head not in KW:
        continue
    hw = fix_my(x['headword'])
    if re.search(r"[^a-zA-Zàâèéêóòôûîïȼṉɓ'-]", hw) or len(hw) < 2:
        continue
    my = modern(hw).lower()
    if my in seen:
        continue
    seen.add(my)
    gen, cat = KW[head]
    rows.append(dict(my=my, fr=g, g=gen, cat=cat, comptable=0 if head in NON_COMPTABLE else 1,
                     page=x['page'], id=x['id'], hw=x['headword']))
print(len(rows), collections.Counter(r['cat'] for r in rows))
json.dump(rows, open('/home/claude/w/noms_raponda.json', 'w'), ensure_ascii=False, indent=0)
