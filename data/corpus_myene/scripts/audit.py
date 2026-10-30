import csv,re,collections,unicodedata,json
from commun import cle
G='/mnt/user-data/attachments/a2f1503b-c6e2-53c6-b424-dcd64d983a11/e6729ee1-corpus_myene_crowdsourcing_10000.csv'
F={'gemini_origine':G,'ancien_mis_a_jour':'out_corpus_myene_ANCIEN_mis_a_jour.csv','nouveau':'out_corpus_myene_NOUVEAU_30000.csv'}
D={k:list(csv.DictReader(open(v,encoding='utf-8'))) for k,v in F.items()}
def toks(s): return [cle(t) for t in re.findall(r"[^\W\d_]+",s) if cle(t)]
A={}
for k,rows in D.items():
    my=[r['myeneText'] for r in rows]
    V=collections.Counter(t for m in my for t in toks(m))
    op=collections.Counter(' '.join(m.split()[:4]) for m in my)
    a=dict(lignes=len(rows),phrases_uniques=len(set(cle(m) for m in my)),doublons_internes=len(rows)-len(set(cle(m) for m in my)),
      mots_distincts=len(V),mots_total=sum(V.values()),
      hapax=sum(1 for c in V.values() if c==1),
      part_100_debuts=round(sum(c for _,c in op.most_common(100))/len(rows)*100,1),
      long_moy=round(sum(len(m.split()) for m in my)/len(my),2),
      non_latin=sum(any(c.isalpha() and not unicodedata.name(c,'').startswith('LATIN') for c in m) for m in my),
      mots_suspects=sum(bool(re.search(r"égaraksyi|gou'|[io]ssiompwa",m)) for m in my),
      mots_colles_15car=sum(any(len(w)>=15 for w in re.findall(r"[^\W\d_]+",m)) for m in my),
      dialectes=dict(collections.Counter(r['dialect'] for r in rows)),
      themes=len(set(r['theme'] for r in rows)),
      themes_detail=dict(collections.Counter(r['theme'] for r in rows).most_common()),
      statut=dict(collections.Counter(r.get('statut','(aucun)') for r in rows)),
      phonetique=sum(bool(r.get('transcription_phonetique') or 'API:' in r.get('contextNotes','')) for r in rows))
    A[k]=a; A[k]['_V']=V
# croisements
ka=set(cle(r['myeneText']) for r in D['ancien_mis_a_jour']); kn=set(cle(r['myeneText']) for r in D['nouveau'])
kf_a=set(cle(r['frenchText']) for r in D['ancien_mis_a_jour']); kf_n=set(cle(r['frenchText']) for r in D['nouveau'])
cross=dict(doublons_myene_ancien_nouveau=len(ka&kn),doublons_francais_ancien_nouveau=len(kf_a&kf_n),
  mots_ancien=len(A['ancien_mis_a_jour']['_V']),mots_nouveau=len(A['nouveau']['_V']),
  mots_communs=len(set(A['ancien_mis_a_jour']['_V'])&set(A['nouveau']['_V'])),
  mots_union=len(set(A['ancien_mis_a_jour']['_V'])|set(A['nouveau']['_V'])|set(A['gemini_origine']['_V'])),
  mots_gemini_conserves=len(set(A['gemini_origine']['_V'])&set(A['ancien_mis_a_jour']['_V'])),
  mots_gemini_total=len(A['gemini_origine']['_V']))
ch=collections.Counter()
for r in D['ancien_mis_a_jour']:
    for m in r['modifications'].split(' ; '):
        ch[re.sub(r'\s*[«(].*','',m).strip()]+=1
for k in A: A[k].pop('_V')
json.dump(dict(fichiers=A,croisement=cross,modifs_ancien=dict(ch.most_common())),open('audit.json','w'),ensure_ascii=False,indent=1)
print(json.dumps(dict(fichiers={k:{kk:vv for kk,vv in v.items() if kk!='themes_detail'} for k,v in A.items()},croisement=cross,modifs=dict(ch.most_common(12))),ensure_ascii=False,indent=1))
