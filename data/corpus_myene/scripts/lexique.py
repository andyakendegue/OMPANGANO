# -*- coding: utf-8 -*-
# Lexique de base pour la composition de phrases — tiré des leçons omyènè (DONDO/01_sources_myene/03_lecons_omyene)
# Format : (myene, francais, genre m/f, categorie, comptable True/False)
LECONS_NOMS = [
# 01_vocabulaire/Animaux du Gabon.docx
("embongo","lion","m","animal",1),("ndjègô","panthère","f","animal",1),("mbindji","chacal","m","animal",1),
("okumbi","chat sauvage","m","animal",1),("pusi","chat","m","animal",1),("owata","chat-tigre","m","animal",1),
("mbwa","chien","m","animal",1),("évanga-mbwa","hyène","f","animal",1),("mbongo","grande antilope","f","animal",1),
("nkambi","antilope","f","animal",1),("tchéri","gazelle","f","animal",1),("mboni","cabri","m","animal",1),
("ngowa","sanglier","m","animal",1),("homba","porc-épic","m","animal",1),("manga","lamantin","m","animal",1),
("ipi","pangolin","m","animal",1),("nguwu","hippopotame","m","animal",1),("ndjôgu","éléphant","m","animal",1),
("ndjina","gorille","m","animal",1),("kèma","singe","m","animal",1),("ntchigo","chimpanzé","m","animal",1),
("ndjôgôni","poule","f","animal",1),("nkola","escargot","m","animal",1),
# Les oiseaux du littoral et des lagunes.docx
("iruwani","pélican gris","m","oiseau",1),("ntyôwu","anhinga","m","oiseau",1),("tchôwu","cormoran","m","oiseau",1),
("odombo","jabiru","m","oiseau",1),("isômbô","martin-pêcheur","m","oiseau",1),("oyangayanga","ibis hagedash","m","oiseau",1),
# Poissons d'eau douce / de mer / noms des poissons
("ndumi","silure","m","poisson",1),("nkèmbè","mâchoiron","m","poisson",1),("oyara","barbu","m","poisson",1),
("ilômba","carpe","f","poisson",1),("omwenguè","brochet","m","poisson",1),("nkéné","petite anguille","f","poisson",1),
("mpuna","mormyre","m","poisson",1),("osèndjèlè","sardine des lacs","f","poisson",1),("nkawa","thon","m","poisson",1),
("tchivo","poisson rouge de mer","m","poisson",1),("iguwintchongo","mérou noir","m","poisson",1),("môno","mulet","m","poisson",1),
("ondjombiè","bar","m","poisson",1),("tchèna","capitaine","m","poisson",1),("ompôyi","bécune","f","poisson",1),
("oyôndôyôndô","tarpon","m","poisson",1),("mbèrè","sardine","f","poisson",1),("nkové","carangue","f","poisson",1),
("nkwèrè","daurade","f","poisson",1),("nkodjè","requin","m","poisson",1),("ewèrè","poisson","m","poisson",1),
# LES ALIMENTS.docx
("ntogôlo","piment","m","aliment",1),("mbuma","tomate","f","aliment",1),("ilasa","orange","f","aliment",1),
("omangatanga","noix de coco","f","aliment",1),("asègû","atanga","m","aliment",1),("ikôkô","ananas","m","aliment",1),
("nyaré","viande","f","aliment",0),("ilôsi","citron","m","aliment",1),("onêmbè","miel","m","aliment",0),
("itôtô","banane douce","f","aliment",1),("ikôndô","banane plantain","f","aliment",1),("ilôti","tubercule","m","aliment",1),
("ogouma","manioc","m","aliment",0),("kwa","taro","m","aliment",1),("môngô","patate","f","aliment",1),
("olôlô","papaye","f","aliment",1),("nwondô","concombre","m","aliment",1),("mbenda","arachide","f","aliment",0),
("oronga","champignon","m","aliment",1),("gnondô","oignon","m","aliment",1),("ambôlôgô","aubergine","f","aliment",1),
("ewèrè z'azanga","poisson salé","m","aliment",0),("ewèrè ézômô","poisson fumé","m","aliment",0),("iké","œuf","m","aliment",1),
("pemba","pain","m","aliment",0),("ipôrô","feuilles de manioc pilées","fp","aliment",0),("nyembouè","sauce de noix de palme","f","aliment",0),
("épomba zi mbenda","pâte d'arachide","f","aliment",0),("orési","riz","m","aliment",0),("ézanga","sel","m","aliment",0),
("agali","huile","f","aliment",0),("nyama","viande","f","aliment",0),
("aningo","eau","f","boisson",0),
# La Nature.docx (maison, objets, nature)
("nago","maison","f","lieu",1),("épwé z'atanga","chaise","f","objet",1),("tavulu","table","f","objet",1),
("ébongo","banc","m","objet",1),("kisini","cuisine","f","lieu",1),("swaka","couteau","m","objet",1),
("kôbôti y'ozira","placard","m","objet",1),("inyéla","poubelle","f","objet",1),("puka","sac","m","objet",1),
("ogoni","feu","m","nature",0),("windè","fenêtre","f","objet",1),("odo","lit","m","objet",1),("siti","drap","m","vetement",1),
("obati","short","m","vetement",1),("ngôyi","haut","m","vetement",1),("élinga","robe","f","vetement",1),("panga","chaînette","f","vetement",1),
("nôntché","chambre","f","lieu",1),("nag'ombo","moustiquaire","f","objet",1),("loto","voiture","f","objet",1),
("owaro","pirogue","f","objet",1),("ézômbôlô","balai","m","objet",1),("épokolo","chapeau","m","vetement",1),
("élasi","verre","m","objet",1),("ozangé","lumière","f","nature",0),("éréré","arbre","m","plante",1),
("iga","forêt","f","lieu",1),("ntchuwa","mer","f","lieu",1),("okili","route","f","lieu",1),("omwèyi","soleil","m","nature",1),
("ogwèli","lune","f","nature",1),("ningo","pluie","f","nature",0),("sika","argent","m","objet",0),("ombuwutu","poussière","f","nature",0),
("nkala","village","m","lieu",1),("ogôli","corde","f","objet",1),("okasa","fouet","m","objet",1),("ogoula","tempête","f","nature",1),
# Les arbres de notre pays.docx
("ororo","arbre à beurre","m","plante",1),("oyingo","bois corail","m","plante",1),("ogula","noisetier","m","plante",1),
("kombo-gombo","parasolier","m","plante",1),("itanda","palétuvier","m","plante",1),("oba","manguier","m","plante",1),("oguma","fromager","m","plante",1),
# Corps humain (pour phrases de soin)
("éwondjo","tête","f","corps",1),("intcho","œil","m","corps",1),("ompélé","cou","m","corps",1),("ompombo","nez","m","corps",1),
("ogô","bras","m","corps",1),("ikaka","main","f","corps",1),("ogholo","pied","m","corps",1),("ompéndé","jambe","f","corps",1),
("nyuma","dos","m","corps",1),("ivuva","genou","m","corps",1),
]
# Personnes — sujets (singulier, pluriel attesté dans les leçons)
LECONS_PERS = [
("onomé","l'homme","m"),("omwanto","la femme","f"),("omwana","l'enfant","m"),("onèrô","l'ancien","m"),
("olôwisi","le pêcheur","m"),("ombèna","le chasseur","m"),("onambisi","la cuisinière","f"),("oganga","le guérisseur","m"),
("onèndji","le professeur","m"),("owégisi","le bûcheron","m"),("ombalo","l'oncle","m"),("ngwè","la mère","f"),("rérè","le père","m"),
("ezombi","la sœur","f"),("omwant'iwami","ma femme","f"),
]
LECONS_PERS_PL = [("awana","les enfants"),("anèrô","les anciens"),("anaga","les gens"),("awan'iwami","mes enfants")]
# Lieux après « go » (leçons ; « g' » devant voyelle)
LIEUX = [("nkala","au village"),("nago","à la maison"),("kisini","dans la cuisine"),("iga","dans la forêt"),
         ("ntchuwa","à la mer"),("okili","sur la route"),("owaro","dans la pirogue"),("nôntché","dans la chambre")]
LIEUX_EAU = [("ntchuwa","dans la mer")]
