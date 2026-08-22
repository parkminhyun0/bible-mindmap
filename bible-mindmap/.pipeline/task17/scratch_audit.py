import json
import re

with open('.pipeline/task17/first_100.json') as f:
    data = json.load(f)

# output to check
findings = []

for item in data:
    strong = item['strong']
    lemma = item['lemma']
    translit = item['translit']
    translitKo = item['translitKo']
    note = item['note']
    
    # Check rule 1: begadkefat spirals
    if any(c in translit for c in ['ḇ', 'ḡ', 'ḏ', 'ḵ', 'p̄', 'ṯ']):
        findings.append({
            'strong': strong,
            'field': 'translit',
            'current': translit,
            'suggested': re.sub(r'ḇ', 'b', re.sub(r'ḡ', 'g', re.sub(r'ḏ', 'd', re.sub(r'ḵ', 'k', re.sub(r'p̄', 'p', re.sub(r'ṯ', 't', translit)))))),
            'evidence': '베가드케파트 연음에 라틴 음역에서 밑줄/바를 쓰지 않는다.',
            'severity': 'high',
            'reason': '배포 선례 및 규칙 1 위반'
        })
    
    # Check rule 2: dagesh forte in translitKo
    # This is harder to check automatically, we can look for specific Korean double consonants at bottom
    # but Korean rules say "받침으로 겹쳐 적지 않는다". e.g. 앗타 -> 아타
    
    # Check rule 3: word final shin
    if lemma.endswith('שׁ') or lemma.endswith('שׁ\u05bc'):
        if not translitKo.endswith('쉬'):
            if 'note' in item and '후음' not in note: # some exceptions maybe?
                pass
                
    # Check note contradictions
    # "관용 표기와 갈릴 이유가 없으면 빈 문자열"
    if '관용' in note and ('다름' in note or '아님' in note or '이다' in note):
        # usually ok
        pass

with open('.pipeline/task17/findings_auto.json', 'w') as f:
    json.dump(findings, f, ensure_ascii=False, indent=2)

