import json
import unicodedata

with open('.pipeline/task22/first100.json', 'r') as f:
    entries = json.load(f)

def normalize(s):
    return unicodedata.normalize('NFC', s)

for e in entries:
    issues = []
    strong = e.get('strong', '')
    lemma = e.get('lemma', '')
    translit = e.get('translit', '')
    ko = e.get('translitKo', '')
    note = e.get('note', '')
    
    norm_t = normalize(translit)
    
    # 1. translit should not have ḇ ḡ ḏ ḵ p̄ ṯ
    for c in ['ḇ', 'ḡ', 'ḏ', 'ḵ', 'ṯ']:
        if normalize(c) in norm_t:
            issues.append(f"translit has begadkefat {c}")
    if 'p' + chr(0x0304) in unicodedata.normalize('NFD', translit):
        issues.append("translit has p̄")
    if 'p' + chr(0x0331) in unicodedata.normalize('NFD', translit):
        issues.append("translit has p with macron below")
    
    # 2. Dagesh forte check (Heuristic: 받침 ㅅ, ㅂ, ㄱ, ㄷ)
    # 앗, 압, 악...
    batchim = ['앗', '압', '악', '앋', '앝', '앞', '앟', '샇', '탛', '캅', '캇', '랏', '밧', '삿', '잣', '릿', '잇', '입', '익', '읻', '엇', '업', '억', '얻', '옷', '옵', '옥', '옫', '웃', '웁', '욱', '욷']
    if any(c in ko for c in batchim):
        issues.append(f"potential dagesh forte error (has 받침): ko={ko}")
        
    # 3. syllable final שׁ (shin) -> 쉬
    if 'שׁ' in lemma and '시' in ko:
        issues.append(f"shin might be transliterated as 시 instead of 쉬: ko={ko}")
        
    # 4. consonant ו -> w
    if 'ו' in lemma and any(x in ko for x in ['바', '베', '비', '보', '부', '벱', '봅', '붑', '뱝', '볩']):
        issues.append(f"waw might be transliterated with ㅂ: ko={ko}")
        
    # 6. Greek ευ -> 유
    if 'ευ' in lemma and not any(x in ko for x in ['유', '튜', '류', '뮤', '뉴', '슈', '큐', '퓨', '휴', '듀', '뷰', '쥬']):
        issues.append(f"Greek ευ not transliterated as 유-series: ko={ko}")
    if 'ευ' in lemma and any(x in ko for x in ['에우', '에브', '에프']):
        issues.append(f"Greek ευ transliterated as 에우/에브/에프: ko={ko}")
        
    # 7. Greek ῥ -> no 흐
    if 'ῥ' in lemma and '흐' in ko:
        issues.append(f"Greek ῥ transliterated with 흐: ko={ko}")
        
    if issues:
        print(f"{strong} ({lemma} / {translit} / {ko}): {issues} | note: {note}")

