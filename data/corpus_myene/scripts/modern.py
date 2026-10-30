import re
def fix_my(s):
    s=re.split(r'(?<=[a-zèéóôȼṉ\'])\s*ou\s*(?=[A-ZṈȻÓ])|\s+ou\s+',s)[0]
    s=s.replace('rn','m').replace('ﬁ','fi')
    s=re.sub(r'(?<![tȼ])c(?!h)','e',s)
    s=re.sub(r'(?<=[a-zàèéóôîï])l\b','i',s)
    s=re.sub(r'(?<=[a-zàâèéêóòôûîïȼṉ])I(?=[a-zàâèéêóòôûîïȼṉ])','l',s)
    s=re.sub(r'(?<=[a-zàèéóôȼṉ])1(?=[a-zàèéóô])','l',s)
    s=re.sub(r'\s+',' ',s).strip(' ,;:.—-')
    return s
def modern(s):
    s=s.replace('ntȼ','ntch').replace('tȼ','tch').replace('ȼ','tch').replace('Ȼ','Tch')
    s=s.replace('ṉ','ny').replace('Ṉ','Ny').replace('ɓ','b').replace('Ɓ','B')
    s=s.replace('ó','ô').replace('Ó','Ô').replace('ò','ô').replace('î','i').replace('ï','i').replace('â','a').replace('ê','é')
    s=re.sub(r'(?<![a-zA-Zèéô])e(?=[a-z])', 'é', s)  # word-initial e
    s=re.sub(r'(?<=[^aeiouéèô\s\'])e\b', 'é', s)   # word-final e after consonant
    s=re.sub(r'(?<=[^aeiouéèô\s\'])e(?=[^aeiouéèô])', 'é', s)
    s=s.replace('E','É') if s.startswith('E') else s
    return s
