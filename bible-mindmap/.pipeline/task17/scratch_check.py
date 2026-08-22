import json

def is_consonant_doubled(word):
    # Check if translitKo has double consonants at the bottom (받침 겹쳐 적기)
    # Not trivial in unicode without decomposition, but we can look for specific strings if we had them.
    # We will just inspect manually if there are any.
    pass

with open('.pipeline/task17/first_100.json') as f:
    data = json.load(f)

for i, item in enumerate(data):
    s = item['strong']
    t = item['translit']
    tk = item['translitKo']
    l = item['lemma']
    n = item['note']
    
    issues = []
    
    # 1. Begadkefat check
    if any(c in t for c in ['ḇ', 'ḡ', 'ḏ', 'ḵ', 'p̄', 'ṯ']):
        issues.append(f"Begadkefat in translit: {t}")
        
    # 2. Shin check (Rule 3)
    if l.endswith('שׁ') or l.endswith('שׁ\u05bc'):
        if not tk.endswith('쉬') and not (tk.endswith('시') and '시' in tk):
            issues.append(f"Shin word-final should be 쉬: {tk} for {l}")
        elif tk.endswith('시'):
            issues.append(f"Shin word-final should be 쉬 (not 시): {tk}")

    # 4. Vav check
    if 'ו' in l:
        if '바' in tk or '베' in tk or '비' in tk:
            # might be false positive if bet is present
            if 'ב' not in l:
                issues.append(f"Vav translated as 바/베/비? {tk}")
                
    # 5. Ayin + Holem Vav
    if 'עו' in l or 'עוֹ' in l:
        if '오' in tk or '우' in tk:
            # Need to check if it's transliterated as a/wa etc.
            pass
            
    # Dagesh forte in translitKo
    double_batchims = ['ㄲ', 'ㅆ'] 
    if any(db in tk for db in double_batchims):
        issues.append(f"Double batchim in {tk}")
        
    if issues:
        print(f"[{i}] {s}: {l} -> {t} -> {tk}")
        for issue in issues:
            print(f"  - {issue}")

