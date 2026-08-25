import json

with open('.pipeline/task22/final.json', 'r') as f:
    entries = json.load(f)['entries']

for e in entries:
    if 'mm' in e.get('translit', ''):
        print(f"{e['strong']} {e['translit']} -> {e['translitKo']}")
