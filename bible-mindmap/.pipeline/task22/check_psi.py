import json

with open('.pipeline/task22/final.json', 'r') as f:
    entries = json.load(f)['entries']

for e in entries:
    if 'ψ' in e.get('lemma', ''):
        print(f"{e['strong']} {e['lemma']} {e['translit']} -> {e['translitKo']}")
