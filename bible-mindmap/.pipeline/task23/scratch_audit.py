import json

with open('.pipeline/task23/scratch_entries_100_200.json') as f:
    entries = json.load(f)

audits = []

def add_audit(strong, field, current, suggested, evidence, reason):
    audits.append({
        "strong": strong,
        "field": field,
        "current": current,
        "suggested": suggested,
        "evidence": evidence,
        "severity": "high",
        "reason": reason
    })

for e in entries:
    strong = e['strong']
    translit = e['translit']
    translitKo = e['translitKo']
    note = e.get('note', '')

    # Rule 1: translit should not contain ḇ ḡ ḏ ḵ p̄ ṯ
    for bad, good in [('ḇ', 'b'), ('ḡ', 'g'), ('ḏ', 'd'), ('ḵ', 'k'), ('p̄', 'p'), ('ṯ', 't')]:
        if bad in translit:
            sugg = translit.replace(bad, good)
            add_audit(strong, 'translit', translit, sugg, "WORKER_SPEC.md rule 1: No begadkefat symbols", "베가드케파트 기호 사용 불가")

    # Rule 2: dagesh forte / 겹받침
    # We can't perfectly check this, but we can look for specific Korean double consonants or 받침
    # Like 앗, 캅, 랏, 랍 + same consonant
    # We'll skip for automated check and manually review if needed, but let's look for common ones
    
    # Rule 3: syllable final שׁ -> 쉬
    if 'š' in translit and '시' in translitKo:
        # this might be an error if it's syllable final, but '시' could be 'si'
        pass
        
    # Rule 4: ו as w -> 와/웨/위/워 instead of 바/베/비/보
    # if 'w' in translit and '바' in translitKo...
    
    # Greek:
    # ευ -> 유
    if 'ευ' in e.get('lemma', ''):
        if 'eu' in translit or '유' not in translitKo:
            if '에우' in translitKo or '에브' in translitKo or '에프' in translitKo or '에류' in translitKo:
                 # Note: "ευ는 유로 표기" - wait, G3644 ὀλοθρευτής -> olothreutḗs -> 올로트류테스. Here ρευ is 류.
                 pass

    if 'euschēmosýnē' in translit: # G2157 
        pass

    # G3336 μετάλημψις -> metálēmpsis -> 메탈렘프시스 (note says 이문 μετάληψις...)

with open('scratch_audit_results.json', 'w') as f:
    json.dump(audits, f, indent=2, ensure_ascii=False)
