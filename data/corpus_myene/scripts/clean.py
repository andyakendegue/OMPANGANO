import json,re,collections,math,unicodedata
from wordfreq import zipf_frequency as ZF
D=json.load(open('/mnt/user-data/uploads/DONDO/07_donnees/dictionnaire_mpongwe_francais.json'))['entries']
pairs=json.load(open('pairs_raw.json'))
FR=set("le la les de du des un une je tu il elle nous vous ils elles est sont et à au aux en pour sur dans par avec ne pas que qui ce cette son sa ses mon ma mes ton ta tes leur se on y lui me te être avoir fait faire va très plus mais ou comme".split())
def frscore(s):
    t=re.findall(r"[a-zàâçéèêëîïôûùü']+",s.lower())
    return sum(w.strip("'") in FR for w in t)/max(1,len(t))
def fix_my(s):
    s=re.split(r'(?<=[a-zèéóôȼṉ\'])\s*ou\s*(?=[A-ZṈȻÓ])|\s+ou\s+',s)[0]
    s=s.replace('rn','m').replace('ﬁ','fi')
    s=re.sub(r'(?<![tȼ])c(?!h)','e',s)
    s=re.sub(r'(?<=[a-zàèéóôîï])l\b','i',s)
    s=re.sub(r'(?<=[a-zàâèéêóòôûîïȼṉ])I(?=[a-zàâèéêóòôûîïȼṉ])','l',s)
    s=re.sub(r'(?<=[a-zàèéóôȼṉ])1(?=[a-zàèéóô])','l',s)
    s=re.sub(r'\s+',' ',s).strip(' ,;:.—-')
    return s
def fix_fr(s):
    s=re.sub(r'\b([a-zàé]) ([a-z])\b(?=\s)',lambda m:m.group(1)+m.group(2) if m.group(1)+m.group(2) in('se','as','ma','me','te','le','sa','ta','de','ne','en','un','il','on','je','tu','du','au','où') else m.group(0),s)
    s=re.sub(r"\b1'","l'",s); s=re.sub(r'\(litt\.?$|\([^)]*$','',s).strip(); s=re.sub(r'\be s\b','es',s); s=re.sub(r'(?<=\s)à(?=[a-z])','à ',s); s=s.replace('­ ','').replace('„','«').replace('"','»')
    s=re.sub(r'\(G\.?$|\((?:G|Or|Nk|En|Ad)\b[^)]*$','',s)
    s=re.sub(r'\b(\w+) \1\b',r'\1',s)
    s=re.sub(r'\s+',' ',s).strip(' ,;:—-')
    return s
# vocabulary from spaced myene text across dictionary
tok=collections.Counter()
for x in D:
    d=x['definition_raw']
    for sent in re.split(r'(?<=[.;])\s+',d):
        for part in sent.split(','):
            if frscore(part)<0.1:
                for w in re.findall(r"[a-zàâèéêóòôûîïȼṉɓ]+'?",fix_my(part).lower()):
                    tok[w]+=1
    for w in re.findall(r"[a-zàâèéêóòôûîïȼṉɓ]+",fix_my(x['headword']).lower()): tok[w]+=3
tot=sum(tok.values())
def cost(w):
    c=tok.get(w,0)
    if c>=2 and len(w)>=1: return -math.log(c/tot)
    return None
def seg(chunk):
    # chunk lowercase without spaces; DP
    n=len(chunk); best=[(0,[])]+[(1e9,None)]*n
    for i in range(1,n+1):
        for j in range(max(0,i-14),i):
            w=chunk[j:i]; c=cost(w)
            if c is None: continue
            if len(w)<3 and w not in('a','e','o','mi','ni','go','re','ne','zi','yi','wi','si','ga','ko','pa','fó','yo','my','ny'): continue
            v=best[j][0]+c+13
            if v<best[i][0]: best[i]=(v,best[j][1]+[w])
    return best[n][1]
FRW=collections.Counter(w for p in pairs for w in re.findall(r"[a-zàâçéèêëîïôûùü]+",p[4].lower()))
def split_conn(w):
    # Nagoy'atweni -> Nago y'atweni ; woduw'akalwi -> wodu w'akalwi
    m=re.match(r"^(.+?)(ny|[ywzsmgdbln])'(.+)$",w)
    stem=(m.group(1)+m.group(2)).lower() if m else ''
    if m and any(tok.get(stem+v,0)>=2 for v in 'aeioóèu'): return w
    if m and len(m.group(1))>=2 and tok.get(m.group(1).lower(),0)>=3:
        return m.group(1)+' '+m.group(2)+"'"+m.group(3)
    return w
PART=['nyi','wi','yi','zi','si','mi','ni','wa','ya','za','sa','ma','nya','myè','wè','yè','zwè','nwè','wawo','yo','mènè','sónó','vónó','pa','fó','re','ne','go','ga','ko','be','dou','du','ka']
def split_part(w):
    lw=w.lower()
    for p in sorted(PART,key=len,reverse=True):
        if lw.endswith(p) and len(lw)-len(p)>=3 and tok.get(lw[:-len(p)],0)>=3 and tok.get(lw,0)<3:
            return w[:-len(p)]+' '+w[-len(p):]
    for p in ['mi','o','a','e','zwè','nwè','myè','wè','yè','mya','my','ny']:
        if lw.startswith(p) and tok.get(lw[len(p):],0)>=5 and tok.get(lw,0)<3 and len(lw)-len(p)>=4:
            return w[:len(p)]+' '+w[len(p):]
    return w
def resegment(s):
    out=[];flag=False
    s=' '.join(split_conn(w) for w in s.split(' '))
    for _ in range(2): s=' '.join(split_part(w) for w in s.split(' '))
    for w in s.split(' '):
        core=w.lower().strip(",.;:!?")
        if len(core)>=11 and tok.get(core,0)<3:
            parts=[];ok=True
            for piece in re.split(r"(')",core):
                if piece=="'" : parts.append("'"); continue
                if not piece: continue
                sg=seg(piece) if len(piece)>=6 and tok.get(piece,0)<3 else [piece]
                if sg is None: ok=False; sg=[piece]
                parts.append(' '.join(sg))
            nw=''.join(parts).replace("' ","'")
            if nw.replace(' ','')==core and ' ' not in nw: nw=w.strip(",.;:!?")
            if not ok: flag=True
            if w[:1].isupper(): nw=nw[:1].upper()+nw[1:]
            out.append(nw)
        else: out.append(w)
    return ' '.join(out),flag
def modern(s):
    s=s.replace('ntȼ','ntch').replace('tȼ','tch').replace('ȼ','tch').replace('Ȼ','Tch')
    s=s.replace('ṉ','ny').replace('Ṉ','Ny').replace('ɓ','b').replace('Ɓ','B')
    s=s.replace('ó','ô').replace('Ó','Ô').replace('ò','ô').replace('î','i').replace('ï','i').replace('â','a').replace('ê','é')
    s=re.sub(r'(?<![a-zA-Zèéô])e(?=[a-z])', 'é', s)  # word-initial e
    s=re.sub(r'(?<=[^aeiouéèô\s\'])e\b', 'é', s)   # word-final e after consonant
    s=re.sub(r'(?<=[^aeiouéèô\s\'])e(?=[^aeiouéèô])', 'é', s)
    s=s.replace('E','É') if s.startswith('E') else s
    return s
res=[];seen=set();stats=collections.Counter()
for pid,hw,pg,a,b in pairs:
    a=fix_my(a); b=fix_fr(b)
    if re.search(r'\b(VIL|VII|VI|IV|II|III)\b',a) or frscore(a)>=0.08 or re.search(r'[0-9()«»"„]|—|\bV\.|\bSyn\b|\bcl\b|\bPl\b|\bSg\b',a): stats['rej_my']+=1; continue
    if re.search(r'[—]|\bv\. ',b) or len(b)<4 or len(b)>160: stats['rej_fr']+=1; continue
    lw=[w for w in re.findall(r"[a-zàâçéèêëîïôûùü]+",a.lower()) if len(w)>=4]
    if lw and sum(ZF(w,'fr')>=3.0 for w in lw)/len(lw)>=0.5: stats['rej_fr_gauche2']+=1; continue
    if re.search(r"[ȼṉóò]|'are\b",b): stats['rej_fr_mixte']+=1; continue
    fwz=re.findall(r"[a-zàâçéèêëîïôûùü]+",b.lower())
    if fwz and sum(ZF(w,'fr')>=2.5 for w in fwz)/len(fwz)<0.75: stats['rej_fr_pas_francais']+=1; continue
    fw=re.findall(r"[a-zàâçéèêëîïôûùüȼṉóò]+",b.lower())
    if fw and (re.search('[ȼṉ]',fw[0]) or (FRW[fw[0]]<2 and tok.get(fw[0],0)>=2)): stats['rej_fr_debut_myene']+=1; continue
    ws=re.findall(r"[a-zàâçéèêëîïôûùüȼṉóò]+",a.lower())
    if ws and sum(FRW[w]>=2 and FRW[w]>=tok.get(w,0) for w in ws)/len(ws)>=0.5: stats['rej_fr_gauche']+=1; continue
    a2,flag=resegment(a)
    if flag: stats['seg_incomplet']+=1
    m=modern(a2); m=m[:1].upper()+m[1:]
    f=b[:1].upper()+b[1:]
    if not f.endswith(('.','?','!')): f+='.'
    key=re.sub(r'\W','',m.lower())
    if key in seen: stats['dup']+=1; continue
    seen.add(key)
    res.append(dict(src_id=pid,headword=hw,page=pg,raponda=a,myene=m,fr=f,seg_flag=flag))
print(stats,len(res))
json.dump(res,open('raponda_clean.json','w'),ensure_ascii=False,indent=0)
import random;random.seed(5)
for r in random.sample(res,30): print(r['page'],'|',r['raponda'],'=>',r['myene'],'|',r['fr'],'|',r['seg_flag'])
