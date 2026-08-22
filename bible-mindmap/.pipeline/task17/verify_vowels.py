import json

def get_vowels(lemma):
    vowels = []
    for c in lemma:
        if 0x5b0 <= ord(c) <= 0x5bb:
            vowels.append((c, hex(ord(c))))
    return vowels

def check_translit(lemma, translit):
    vowels = get_vowels(lemma)
    # Check if there's a hataf vowel that doesn't match
    # 0x5b1 = hataf segol (ĕ)
    # 0x5b2 = hataf patach (ă)
    # 0x5b3 = hataf qamats (ŏ)
    # 0x5b7 = patach (a)
    # 0x5b8 = qamats (ā or o)
    # 0x5b6 = segol (e)
    # 0x5b5 = tsere (ē)
    # 0x5b4 = hiriq (i or î)
    # 0x5b9 = holem (ō or ô)
    # 0x5bb = qibbuts (u)
    
    issues = []
    
    # Just a simple heuristic: if there's no hataf patach in lemma, there should be no ă in translit
    if '\u05b2' not in lemma and 'ă' in translit:
        issues.append("Found 'ă' in translit but no hataf patach in lemma")
        
    if '\u05b1' not in lemma and 'ĕ' in translit:
        # Wait, vocal shva is also transliterated as ĕ. So 'ĕ' is fine if there is a shva (\u05b0)
        if '\u05b0' not in lemma:
            issues.append("Found 'ĕ' in translit but no shva or hataf segol in lemma")
            
    if '\u05b3' not in lemma and 'ŏ' in translit:
        issues.append("Found 'ŏ' in translit but no hataf qamats in lemma")

    return issues

with open('.pipeline/task17/first_100.json') as f:
    data = json.load(f)

for item in data:
    issues = check_translit(item['lemma'], item['translit'])
    if issues:
        print(f"{item['strong']}: {item['lemma']} -> {item['translit']}")
        for issue in issues:
            print(f"  - {issue}")

