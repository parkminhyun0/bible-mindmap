import json, os

# Load mapping from existing scratch_translit.py
mapping_path = os.path.abspath(__file__).replace('tmp_generate_am.py', '../../scratch_translit.py')
# Execute the scratch_translit.py to get 'mapping' dict
mapping = {}
with open(mapping_path, 'r', encoding='utf-8') as f:
    exec(f.read(), globals())
# mapping variable should now be defined

input_file = '.pipeline/task18/input/shard-AM.json'
output_file = '.pipeline/task18/proposals/AM-gptoss120b.json'

with open(input_file, 'r', encoding='utf-8') as f:
    data = json.load(f)

output = {
    'shard': data['shard'],
    'model': 'gptoss120b',
    'count': data['count'],
    'entries': []
}

for item in data['items']:
    strong = item['strong']
    lemma = item['lemma']
    translit_input = item.get('translit', '')
    entry = {'strong': strong, 'lemma': lemma}
    if strong in mapping:
        entry['translit'] = mapping[strong].get('translit', translit_input)
        entry['translitKo'] = mapping[strong].get('translitKo', '')
        entry['note'] = mapping[strong].get('note', '')
    else:
        entry['translit'] = translit_input
        entry['translitKo'] = ''
        entry['note'] = ''
    output['entries'].append(entry)

with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

print('Done')
