import re,json
import unicodedata
T=unicodedata.normalize('NFC',open('/mnt/user-data/uploads/DONDO/_selection_projet/1_prioritaire/Lecons_omyene_compilation.md',encoding='utf-8').read()).replace('\xa0',' ')
pairs=[]
# proverbes : ligne myènè puis « traduction »
sec=T[T.index('# Tradition orale'):T.index('# Histoire clans')]
lines=[l.strip() for l in sec.split('\n')]
for i,l in enumerate(lines[:-1]):
    n=lines[i+1]
    if l and not l.startswith(('«','#','_','(')) and n.startswith('«'):
        fr=n.strip('«» “”').split('»')[0].strip()
        pairs.append((l.rstrip('.'),fr,'proverbe','04_tradition_orale (Proverbes O.docx / Mbya y.docx)'))
# proverbes avec traduction sur la ligne suivante sans « » (fin de Proverbes O)
blk=sec[sec.index('Mpéravérano'):sec.index('## myarondi')] if 'Mpéravérano' in sec else ''
bl=[l.strip() for l in blk.split('\n') if l.strip()]
for i in range(0,len(bl)-1,2): pairs.append((bl[i],re.sub(r'\s*\(.*$','',bl[i+1]),'proverbe','04_tradition_orale/Proverbes O.docx'))
# expressions : tableaux « | fr | my » alternés
SECS={b.split('\n',1)[0].strip():b for b in T.split('\n## ')}
for name in ['Formules de politesse','Les incontournables','Les poètes dragueurs']:
    body=SECS[name]
    cells=[c.strip() for c in re.split(r'\n\s*\|?', body.split('\n',2)[2]) if c.strip() and not c.startswith(('#','_'))]
    cells=[c.lstrip('| ').strip() for c in cells]
    cells=[c for c in cells if c]
    cells=cells[1:]
    for i in range(0,len(cells)-1,2):
        pairs.append((cells[i+1],cells[i],'expression','03_expressions_conversation/'+name+'.docx'))
pairs=[p for p in pairs if len(p[0])>3 and len(p[1])>2]
print(len(pairs)); [print(p) for p in pairs[:6]+pairs[60:66]+pairs[-6:]]
json.dump(pairs,open('lecons_pairs.json','w'),ensure_ascii=False)
