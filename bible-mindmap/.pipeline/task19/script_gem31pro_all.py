import json
import os

shard_path = '/Users/parkminhyeon/bible-mindmap-local/bible-mindmap/.pipeline/task19/input/shard-R.json'
output_path = '/Users/parkminhyeon/bible-mindmap-local/bible-mindmap/.pipeline/task19/proposals/R-gem31pro.json'

mapping = {
    "G2859": {"translit": "kólpos", "translitKo": "콜포스", "note": ""},
    "G4446": {"translit": "pyretós", "translitKo": "퓌레토스", "note": "관용 표기는 피레토스"},
    "G3346": {"translit": "metatíthēmi", "translitKo": "메타티테미", "note": ""},
    "G5395": {"translit": "phlóx", "translitKo": "플록스", "note": ""},
    "G3906": {"translit": "paratēréō", "translitKo": "파라테레오", "note": ""},
    "G2993": {"translit": "Laodíkeia", "translitKo": "라오디케이아", "note": "관용 표기는 라오디게아"},
    "G5311": {"translit": "hýpsos", "translitKo": "휩소스", "note": ""},
    "G4024": {"translit": "perizṓnnymi", "translitKo": "페리존뉘미", "note": ""},
    "G3353": {"translit": "métochos", "translitKo": "메토코스", "note": ""},
    "G206": {"translit": "ákron", "translitKo": "아크론", "note": ""},
    "G4693": {"translit": "spḗlaion", "translitKo": "스펠라이온", "note": ""},
    "G3448": {"translit": "móschos", "translitKo": "모스코스", "note": ""},
    "G4930": {"translit": "syntéleia", "translitKo": "쉰텔레이아", "note": ""},
    "G3007": {"translit": "leípō", "translitKo": "레이포", "note": ""},
    "G2328": {"translit": "thermaínō", "translitKo": "테르마이노", "note": ""},
    "G2672": {"translit": "kataráomai", "translitKo": "카타라오마이", "note": ""},
    "G3482": {"translit": "Nathanaḗl", "translitKo": "나타나엘", "note": "관용 표기는 나다나엘"},
    "G5176": {"translit": "trṓgō", "translitKo": "트로고", "note": ""},
    "G3904": {"translit": "paraskeuḗ", "translitKo": "파라스큐에", "note": "ευ는 유 계열 한 음절로 표기"},
    "G3690": {"translit": "óxos", "translitKo": "옥소스", "note": ""},
    "G2894": {"translit": "kóphinos", "translitKo": "코피노스", "note": ""},
    "G4081": {"translit": "pēlós", "translitKo": "펠로스", "note": ""},
    "G4082": {"translit": "pḗra", "translitKo": "페라", "note": ""},
    "G2807": {"translit": "kleís", "translitKo": "클레이스", "note": ""},
    "G596": {"translit": "apothḗkē", "translitKo": "아포테케", "note": ""},
    "G347": {"translit": "anaklínō", "translitKo": "아나클리노", "note": ""},
    "G3994": {"translit": "pentherá", "translitKo": "펜테라", "note": ""},
    "G589": {"translit": "apodēméō", "translitKo": "아포데메오", "note": ""},
    "G946": {"translit": "bdélygma", "translitKo": "브델뤼그마", "note": ""},
    "G5576": {"translit": "pseudomartyréō", "translitKo": "프슈도마르튀레오", "note": "ευ는 유 계열 한 음절로 표기"},
    "G2574": {"translit": "kámēlos", "translitKo": "카멜로스", "note": ""},
    "G1716": {"translit": "emptýō", "translitKo": "엠프튀오", "note": ""},
    "G4616": {"translit": "sindṓn", "translitKo": "신돈", "note": ""},
    "G2266": {"translit": "Hērōdiás", "translitKo": "헤로디아스", "note": ""},
    "G2595": {"translit": "kárphos", "translitKo": "카르포스", "note": ""},
    "G1385": {"translit": "dokós", "translitKo": "도코스", "note": ""},
    "G5444": {"translit": "phýllon", "translitKo": "퓔론", "note": ""},
    "G3677": {"translit": "ónar", "translitKo": "오나르", "note": ""},
    "G3667": {"translit": "homoíōma", "translitKo": "호모이오마", "note": ""},
    "G929": {"translit": "basanismós", "translitKo": "바사니스모스", "note": ""},
    "G1461": {"translit": "enkentrízō", "translitKo": "엥켄트리조", "note": ""},
    "H7018": {"translit": "qênān", "translitKo": "케난", "note": "관용 표기는 게난"},
    "H4968": {"translit": "mětûšelaḥ", "translitKo": "메투셸라흐", "note": "관용 표기는 므두셀라"},
    "H1586": {"translit": "gōmer", "translitKo": "고메르", "note": ""},
    "H3355": {"translit": "yoqṭān", "translitKo": "요크탄", "note": "관용 표기는 욕단"},
    "H8555": {"translit": "timnāʿ", "translitKo": "팀나", "note": "관용 표기는 딤나"},
    "H345": {"translit": "ʾayyâ", "translitKo": "아야", "note": ""},
    "H4407": {"translit": "millôʾ", "translitKo": "밀로", "note": ""},
    "H5896": {"translit": "ʿîrāʾ", "translitKo": "이라", "note": ""},
    "H1905": {"translit": "hagrî", "translitKo": "하그리", "note": ""},
    "H3043": {"translit": "yĕdîʿăʾēl", "translitKo": "예디아엘", "note": ""},
    "H295": {"translit": "ʾăḥîʿezer", "translitKo": "아히에제르", "note": "관용 표기는 아히에셀"},
    "H3166": {"translit": "yaḥăzîʾēl", "translitKo": "야하지엘", "note": "관용 표기는 야하시엘"},
    "H5832": {"translit": "ʿăzarʾēl", "translitKo": "아자르엘", "note": "관용 표기는 아사렐"},
    "H1173": {"translit": "baʿălâ", "translitKo": "바알라", "note": ""},
    "H283": {"translit": "ʾaḥyô", "translitKo": "아흐요", "note": "관용 표기는 아효"},
    "H469": {"translit": "ʾĕlîṣāpān", "translitKo": "엘리차판", "note": "관용 표기는 엘리사반"},
    "H2690": {"translit": "ḥāṣar", "translitKo": "하차르", "note": ""},
    "H3226": {"translit": "yāmîn", "translitKo": "야민", "note": ""},
    "H8060": {"translit": "šammay", "translitKo": "샴마이", "note": "관용 표기는 삼매"},
    "H32": {"translit": "ʾăbîhayil", "translitKo": "아비하일", "note": ""},
    "H501": {"translit": "ʾelʿāśâ", "translitKo": "엘아사", "note": ""},
    "H8599": {"translit": "tappûaḥ", "translitKo": "타푸아흐", "note": "관용 표기는 답부아"},
    "H7552": {"translit": "reqem", "translitKo": "레켐", "note": "관용 표기는 레겜"},
    "H1555": {"translit": "golyat", "translitKo": "골야트", "note": "관용 표기는 골리앗"},
    "H7619": {"translit": "šĕbûʾēl", "translitKo": "셰부엘", "note": "관용 표기는 스부엘"},
    "H6976": {"translit": "qôṣ", "translitKo": "코츠", "note": "관용 표기는 고스"},
    "H5988": {"translit": "ʿammîʾēl", "translitKo": "암미엘", "note": ""},
    "H2276": {"translit": "ḥebrônî", "translitKo": "헤브로니", "note": ""},
    "H2227": {"translit": "zarḥî", "translitKo": "자르히", "note": ""},
    "H2067": {"translit": "zabdî", "translitKo": "자브디", "note": "관용 표기는 삽디"},
    "H757": {"translit": "ʾarkî", "translitKo": "아르키", "note": "관용 표기는 아렉"},
    "H1916": {"translit": "hădōm", "translitKo": "하돔", "note": ""},
    "H8526": {"translit": "talmay", "translitKo": "탈마이", "note": "관용 표기는 달매"},
    "H5840": {"translit": "ʿazrîqām", "translitKo": "아즈리캄", "note": "관용 표기는 아스리감"},
    "H851": {"translit": "ʾeštĕmōaʿ", "translitKo": "에쉬테모아", "note": "관용 표기는 에스드모아"},
    "H8480": {"translit": "taḥat", "translitKo": "타하트", "note": "관용 표기는 다핫"},
    "H4494": {"translit": "mānôaḥ", "translitKo": "마노아흐", "note": "관용 표기는 마노아"},
    "H1551": {"translit": "gālîl", "translitKo": "갈릴", "note": ""},
    "H8439": {"translit": "tôlāʿ", "translitKo": "톨라", "note": "관용 표기는 돌라"},
    "H4807": {"translit": "mĕrîb baʿal", "translitKo": "메리브 바알", "note": "관용 표기는 므립바알"},
    "H7888": {"translit": "šîlônî", "translitKo": "실로니", "note": ""},
    "H5543": {"translit": "sallû", "translitKo": "살루", "note": ""},
    "H1521": {"translit": "gîḥôn", "translitKo": "기혼", "note": ""},
    "H2485": {"translit": "ḥālîl", "translitKo": "할릴", "note": ""},
    "H6152": {"translit": "ʿărāb", "translitKo": "아라브", "note": ""},
    "H5696": {"translit": "ʿāgōl", "translitKo": "아골", "note": ""},
    "H7675": {"translit": "šebet", "translitKo": "셰베트", "note": ""},
    "H2209": {"translit": "ziqnâ", "translitKo": "지크나", "note": ""},
    "H1377": {"translit": "gĕbîrâ", "translitKo": "게비라", "note": ""},
    "H6137": {"translit": "ʿaqrāb", "translitKo": "아크라브", "note": ""},
    "H4991": {"translit": "mattāt", "translitKo": "마타트", "note": ""},
    "H8366": {"translit": "šātan", "translitKo": "샤탄", "note": ""},
    "H1405": {"translit": "gibbĕtôn", "translitKo": "기베톤", "note": "관용 표기는 깁브돈"},
    "H8664": {"translit": "tišbî", "translitKo": "티쉬비", "note": "관용 표기는 디셉"},
    "H3897": {"translit": "lāḥak", "translitKo": "라하크", "note": ""},
    "H7028": {"translit": "qîšôn", "translitKo": "키숀", "note": "관용 표기는 기손"},
    "H65": {"translit": "ʾābēl mĕḥôlâ", "translitKo": "아벨 메홀라", "note": "관용 표기는 아벨므홀라"},
    "H328": {"translit": "ʾaṭ", "translitKo": "아트", "note": ""},
    "H6458": {"translit": "pāsal", "translitKo": "파살", "note": ""}
}

with open(shard_path, 'r', encoding='utf-8') as f:
    shard = json.load(f)

entries = []
for item in shard['items']:
    s_id = item["strong"]
    if s_id in mapping:
        entries.append({
            "strong": s_id,
            "lemma": item["lemma"],
            "translit": mapping[s_id]["translit"],
            "translitKo": mapping[s_id]["translitKo"],
            "note": mapping[s_id]["note"]
        })
    else:
        print(f"Missing mapping for {s_id}")

out_data = {
    "shard": "R",
    "model": "gem31pro",
    "count": shard["count"],
    "entries": entries
}

os.makedirs(os.path.dirname(output_path), exist_ok=True)
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(out_data, f, ensure_ascii=False, indent=2)

print("All combined python script completed.")
