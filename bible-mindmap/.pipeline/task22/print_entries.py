import json

with open('.pipeline/task22/final_second_100.json', 'r') as f:
    entries = json.load(f)

for i, e in enumerate(entries):
    print(f"[{100+i}] {e['strong']} | {e.get('lemma')} | {e.get('translit')} | {e.get('translitKo')} | {e.get('note')}")
