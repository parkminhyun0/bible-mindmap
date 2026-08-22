import json
import os

shard_path = '/Users/parkminhyeon/bible-mindmap-local/bible-mindmap/.pipeline/task19/input/shard-R.json'
output_path = '/Users/parkminhyeon/bible-mindmap-local/bible-mindmap/.pipeline/task19/proposals/R-gem31pro.json'

with open(shard_path, 'r', encoding='utf-8') as f:
    shard = json.load(f)

entries = []
for item in shard['items']:
    entries.append({
        "strong": item["strong"],
        "lemma": item["lemma"],
        "translit": item["translit"],
        "translitKo": "",
        "note": ""
    })

out_data = {
    "shard": "R",
    "model": "gem31pro",
    "count": shard["count"],
    "entries": entries
}

os.makedirs(os.path.dirname(output_path), exist_ok=True)
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(out_data, f, ensure_ascii=False, indent=2)

print("Python script completed.")
