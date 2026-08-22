import json

def parse_hebrew(lemma):
    chars = []
    i = 0
    while i < len(lemma):
        c = lemma[i]
        # skip normal directional chars if any
        if c in ['\u200f', '\u200e']:
            i+=1
            continue
        chars.append(c)
        i+=1
    return chars

with open('.pipeline/task17/first_100.json') as f:
    data = json.load(f)

for item in data:
    translitKo = item['translitKo']
    lemma = item['lemma']
    translit = item['translit']
    
    # check for weird characters in translit
    for c in translit:
        if c not in "ʾʾbḡgḏdhkḵwzḥṭyklmmnsʿp̄pṣqršśtṭāăēĕîôōûū":
            pass # we can check this
    
    # checking word final mem/nun/tsade/pe/kaf
    if 'ץ' in lemma and not translitKo.endswith('츠'):
        pass
        
    # check for word-final ע
    if lemma.endswith('ע') and translit.endswith('ʿ'):
        # translitKo shouldn't have extra '으' for ʿ
        pass

