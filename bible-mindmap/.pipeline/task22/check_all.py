import json
import re

with open('.pipeline/task22/final_second_100.json', 'r') as f:
    entries = json.load(f)

for e in entries:
    ko = e['translitKo']
    la = e['translit']
    note = e.get('note', '')
    lemma = e.get('lemma', '')
    strong = e['strong']
    
    # Check mismatched length or obvious mapping error?
    # No, models are pretty good. Let's just output anything suspicious.
    
    # Check if a note contradicts: e.g., says "관용 표기는 X다" but translitKo IS X.
    if "관용 표기는" in note or "관용 표기 '" in note or "관용" in note:
        # try to extract the custom word
        m = re.search(r"관용[^\w]*'([^']+)'|관용[^ ]* ([가-힣]+)로", note)
        m2 = re.search(r"개역개정[^\w]*'([^']+)'|개역개정[^ ]* ([가-힣]+)", note)
        custom_word = None
        if m:
            custom_word = m.group(1) or m.group(2)
        elif m2:
            custom_word = m2.group(1) or m2.group(2)
            
        if custom_word and custom_word in ko:
            print(f"[{strong}] Note says custom word is {custom_word}, but translitKo is {ko}")
            
    # Check for basic Latin to Korean mappings
    if 'b' in la and 'ㅂ' not in ko and 'ㅃ' not in ko and 'ㅍ' not in ko and '보' not in ko and '바' not in ko and '베' not in ko and '비' not in ko and '부' not in ko and '브' not in ko and '벱' not in ko:
         print(f"[{strong}] 'b' in la={la} but ko={ko}")
    if 'p' in la and 'ㅍ' not in ko and 'ㅃ' not in ko and '프' not in ko and '피' not in ko and '파' not in ko and '포' not in ko and '푸' not in ko and '퓌' not in ko and '플' not in ko and '퓔' not in ko and '핍' not in ko and '랍' not in ko and '롭' not in ko and '렙' not in ko and '스' not in ko:
         print(f"[{strong}] 'p' in la={la} but ko={ko}")

