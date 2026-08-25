import json
import re

with open('.pipeline/task22/final_second_100.json', 'r') as f:
    entries = json.load(f)

errors = []
for entry in entries:
    strong = entry['strong']
    translit = entry.get('translit', '')
    translitKo = entry.get('translitKo', '')
    note = entry.get('note', '')
    
    # Check 1: ḇ ḡ ḏ ḵ p̄ ṯ in translit
    bad_chars = ['ḇ', 'ḡ', 'ḏ', 'ḵ', 'p̄', 'ṯ']
    for b in bad_chars:
        if b in translit:
            print(f"{strong} translit {translit} contains {b}")
            
    # Check 2: 중복 자음 받침 (ㅅ, ㅂ, ㄲ, ㄸ, ㅃ, ㅆ, ㅉ)
    # Actually just look at translitKo directly.
    # Check 3: 음절 말 쉬 vs 시.
    if '시' in translitKo and 'שׁ' in entry.get('lemma', ''):
        print(f"{strong} translitKo {translitKo} contains 시 but has שׁ (might be 음절 말)")
        
    # Check 4: 바/베/비 for ו (vav)
    if any(v in translitKo for v in ['바', '베', '비']) and 'ו' in entry.get('lemma', ''):
        print(f"{strong} translitKo {translitKo} might have 바/베/비 for ו")
        
    # Check 5: 헬라어 ευ (eu -> 유)
    if 'ευ' in entry.get('lemma', '') and ('에우' in translitKo or '에브' in translitKo or '에프' in translitKo):
        print(f"{strong} translitKo {translitKo} has 에우/에브/에프 for ευ")
        
    # Check 6: 어두 ῥ (rho -> 흐 뺌)
    if entry.get('lemma', '').startswith('ῥ') and ('흐' in translitKo):
        print(f"{strong} translitKo {translitKo} starts with 흐 for ῥ")

print("Done basic heuristic check")
