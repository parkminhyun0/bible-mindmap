import json, os, sys

# Paths
input_path = '/Users/parkminhyeon/bible-mindmap-local/bible-mindmap/.pipeline/task16/input/shard-AH.json'
output_path = '/Users/parkminhyeon/bible-mindmap-local/bible-mindmap/.pipeline/task16/proposals/AH-gptoss120b.json'

# Load mapping from scratch_translit script
sys.path.append('/Users/parkminhyeon/bible-mindmap-local/bible-mindmap')
try:
    from scratch_translit import mapping as translit_mapping
except Exception as e:
    print('Failed to import mapping:', e)
    translit_mapping = {}

with open(input_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

entries = []
for item in data.get('items', []):
    strong = item.get('strong')
    lemma = item.get('lemma')
    # Use existing translit if present, else fill from mapping
    translit = item.get('translit') if item.get('translit') else ''
    translitKo = ''
    note = ''
    if strong in translit_mapping:
        tm = translit_mapping[strong]
        translit = tm.get('translit', translit)
        translitKo = tm.get('translitKo', '')
        note = tm.get('note', '')
    else:
        # fallback: keep empty translit and translitKo
        translit = translit
        translitKo = ''
        note = ''
    entry = {
        'strong': strong,
        'lemma': lemma,
        'translit': translit,
        'translitKo': translitKo,
        'note': note
    }
    entries.append(entry)

out_data = {
    'shard': data.get('shard'),
    'model': 'gptoss120b',
    'count': len(entries),
    'entries': entries
}

os.makedirs(os.path.dirname(output_path), exist_ok=True)
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(out_data, f, ensure_ascii=False, indent=2)
print(f"Generated {len(entries)} entries to {output_path}")
