import json

with open('.pipeline/task15/input/shard-AF.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

entries = []

overrides = {
    "H1867": {"translit": "dāryāwēš", "translitKo": "다르야웨쉬", "note": "관용 표기는 다리오"},
    "H7990": {"translit": "šallîṭ", "translitKo": "샬리트", "note": ""},
    "H1855": {"translit": "dĕqaq", "translitKo": "데카크", "note": ""},
    "H6347": {"translit": "peḥâ", "translitKo": "페하", "note": ""},
    "H861": {"translit": "attûn", "translitKo": "아툰", "note": ""},
    "H3062": {"translit": "yĕhûdāʾî", "translitKo": "예후다이", "note": "관용 표기는 유다인"},
    "H6399": {"translit": "pĕlaḥ", "translitKo": "펠라흐", "note": ""},
    "H5943": {"translit": "ʿillay", "translitKo": "일라이", "note": ""},
    "H6634": {"translit": "ṣĕbāʾ", "translitKo": "체바", "note": ""},
    "H1358": {"translit": "gōb", "translitKo": "고브", "note": ""},
    "H744": {"translit": "ʾaryēh", "translitKo": "아르예", "note": ""},
    "H2102": {"translit": "zûd", "translitKo": "주드", "note": ""},
    "H1885": {"translit": "dātān", "translitKo": "다탄", "note": ""},
    "H4916": {"translit": "mišlôaḥ", "translitKo": "미쉴로아흐", "note": "furtive patach 적용"},
    "H4465": {"translit": "mimkār", "translitKo": "밈카르", "note": ""},
    "H1331": {"translit": "bĕtûlîm", "translitKo": "베툴림", "note": ""},
    "H653": {"translit": "ʾăpēlâ", "translitKo": "아펠라", "note": ""},
    "H5903": {"translit": "ʿêrōm", "translitKo": "에이롬", "note": ""},
    "H6026": {"translit": "ʿānag", "translitKo": "아나그", "note": ""},
    "H8307": {"translit": "šĕrîrût", "translitKo": "셰리루트", "note": ""},
    "H1367": {"translit": "gĕbûlâ", "translitKo": "게불라", "note": ""},
    "H8419": {"translit": "tahpukâ", "translitKo": "타흐푸카", "note": ""},
    "H6790": {"translit": "ṣin", "translitKo": "친", "note": "관용 표기는 신"},
    "H6820": {"translit": "ṣōʿar", "translitKo": "초아르", "note": "관용 표기는 소알"},
    "H8544": {"translit": "tĕmûnâ", "translitKo": "테무나", "note": ""},
    "H6914": {"translit": "qibrôt hattaʾăwâ", "translitKo": "키브로트 하타아와", "note": "관용 표기는 기브롯핫다아와"},
    "H3504": {"translit": "yitrôn", "translitKo": "이트론", "note": ""},
    "H2060": {"translit": "waštî", "translitKo": "와쉬티", "note": "관용 표기는 와스디"},
    "H6340": {"translit": "pāzar", "translitKo": "파자르", "note": ""},
    "H6770": {"translit": "ṣāmēʾ", "translitKo": "차메", "note": ""},
    "H119": {"translit": "ʾādam", "translitKo": "아담", "note": ""},
    "H2213": {"translit": "zēr", "translitKo": "제르", "note": ""},
    "H7165": {"translit": "qeres", "translitKo": "케레스", "note": ""},
    "H213": {"translit": "ʾûṣ", "translitKo": "우츠", "note": ""},
    "H5144": {"translit": "nāzar", "translitKo": "나자르", "note": ""},
    "H2787": {"translit": "ḥārar", "translitKo": "하라르", "note": ""},
    "H5710": {"translit": "ʿādâ", "translitKo": "아다", "note": ""},
    "H8362": {"translit": "šātal", "translitKo": "샤탈", "note": ""},
    "H3002": {"translit": "yābēš", "translitKo": "야베쉬", "note": ""},
    "H4743": {"translit": "māqaq", "translitKo": "마카크", "note": ""},
    "H1091": {"translit": "ballāhâ", "translitKo": "발라하", "note": ""},
    "H4830": {"translit": "mirʿît", "translitKo": "미르이트", "note": ""},
    "H2720": {"translit": "ḥārēb", "translitKo": "하레브", "note": ""},
    "H7075": {"translit": "qinyān", "translitKo": "킨얀", "note": ""},
    "H4471": {"translit": "mamrēʾ", "translitKo": "맘레", "note": "관용 표기는 마므레"},
    "H6501": {"translit": "pereʾ", "translitKo": "페레", "note": ""},
    "H1683": {"translit": "dĕbôrâ", "translitKo": "데보라", "note": "관용 표기는 드보라"},
    "H4066": {"translit": "mādôn", "translitKo": "마돈", "note": ""},
    "H4565": {"translit": "mistār", "translitKo": "미스타르", "note": ""},
    "H3524": {"translit": "kabbîr", "translitKo": "카비르", "note": ""},
    "H6388": {"translit": "peleg", "translitKo": "펠레그", "note": ""},
    "H5374": {"translit": "nēriyyâ", "translitKo": "네리야", "note": ""},
    "H5000": {"translit": "nāʾweh", "translitKo": "나웨", "note": ""},
    "H6079": {"translit": "ʿapʿap", "translitKo": "아프아프", "note": ""},
    "H7158": {"translit": "qiryat sannâ", "translitKo": "키르야트 사나", "note": "관용 표기는 기랴산나"},
    "H5571": {"translit": "sanballaṭ", "translitKo": "산발라트", "note": "관용 표기는 산발랏"},
    "H4079": {"translit": "midyān", "translitKo": "미디안", "note": "관용 표기 미디안을 따름"},

    "G1106": {"translitKo": "그노메", "note": ""},
    "G2054": {"translitKo": "에리스", "note": ""},
    "G2786": {"translitKo": "케파스", "note": "관용 표기는 게바"},
    "G139": {"translitKo": "하이레시스", "note": ""},
    "G2706": {"translitKo": "카타프로네오", "note": ""},
    "G4601": {"translitKo": "시가오", "note": ""},
    "G76": {"translitKo": "아담", "note": ""},
    "G5351": {"translitKo": "프테이로", "note": ""},
    "G4582": {"translitKo": "셀레네", "note": ""},
    "G5356": {"translitKo": "프토라", "note": ""},
    "G4311": {"translitKo": "프로펨포", "note": ""},
    "G4739": {"translitKo": "스테코", "note": ""},
    "G5021": {"translitKo": "타소", "note": ""},
    "G5303": {"translitKo": "휘스테레마", "note": ""},
    "G3611": {"translitKo": "오이케오", "note": ""},
    "G1788": {"translitKo": "엔트레포", "note": ""},
    "G3622": {"translitKo": "오이코노미아", "note": ""},
    "G390": {"translitKo": "아나스트레포", "note": ""},
    "G659": {"translitKo": "아포티테미", "note": ""},
    "G5355": {"translitKo": "프토노스", "note": ""},
    "G1971": {"translitKo": "에피포테오", "note": ""},
    "G593": {"translitKo": "아포도키마조", "note": ""},
    "G1137": {"translitKo": "고니아", "note": ""},
    "G1557": {"translitKo": "에크디케시스", "note": ""},
    "G15": {"translitKo": "아가토포이에오", "note": ""},
    "G3679": {"translitKo": "오네이디조", "note": ""},
    "G4121": {"translitKo": "플레오나조", "note": ""},
    "G1064": {"translitKo": "가스테르", "note": ""},
    "G3135": {"translitKo": "마르가리테스", "note": ""},
    "G5034": {"translitKo": "타코스", "note": ""},
    "G2475": {"translitKo": "이스라엘리테스", "note": ""},
    "G2794": {"translitKo": "킨뒤노스", "note": ""},
    "G5038": {"translitKo": "테이코스", "note": ""},
    "G315": {"translitKo": "아낭카조", "note": ""},
    "G4280": {"translitKo": "프로에레오", "note": ""},
    "G4281": {"translitKo": "프로에르코마이", "note": ""},
    "G393": {"translitKo": "아나텔로", "note": ""},
    "G2107": {"translitKo": "에우도키아", "note": ""},
    "G654": {"translitKo": "아포스트레포", "note": ""},
    "G620": {"translitKo": "아폴레이포", "note": ""},
    "G1904": {"translitKo": "에페르코마이", "note": ""},
    "G2883": {"translitKo": "코르넬리오스", "note": "관용 표기는 고넬료"},
    "G3343": {"translitKo": "메타펨포", "note": ""}
}

for item in data['items']:
    strong = item['strong']
    entry = {
        "strong": strong,
        "lemma": item['lemma'],
        "translit": item.get('translit', ''),
        "translitKo": "",
        "note": ""
    }
    
    ov = overrides.get(strong, {})
    if 'translit' in ov and not entry['translit']:
        entry['translit'] = ov['translit']
    elif 'translit' in ov:
        entry['translit'] = ov['translit'] # Just in case it's Greek and we want to override
    
    if not entry['translit']:
        entry['translit'] = item.get('translit', '')
        
    entry['translitKo'] = ov.get('translitKo', '')
    entry['note'] = ov.get('note', '')
    
    entries.append(entry)

out = {
    "shard": "AF",
    "model": "gptoss120b",
    "count": 100,
    "entries": entries
}

with open('.pipeline/task15/proposals/AF-gptoss120b.json', 'w', encoding='utf-8') as f:
    json.dump(out, f, ensure_ascii=False, indent=2)

