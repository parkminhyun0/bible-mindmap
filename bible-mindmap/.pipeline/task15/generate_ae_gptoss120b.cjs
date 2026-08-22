// generate_ae_gptoss120b.cjs
const fs = require('fs');
const inputPath = '.pipeline/task15/input/shard-AE.json';
const outputPath = '.pipeline/task15/proposals/AE-gptoss120b.json';
const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

const mapping = {
  "G5544": {"translitKo": "크레스토테스", "note": ""},
  "G873": {"translitKo": "아포리조", "note": ""},
  "G3841": {"translitKo": "판토크라토르", "note": ""},
  "G5562": {"translitKo": "코레오", "note": ""},
  "G618": {"translitKo": "아폴람바노", "note": ""},
  "G4670": {"translitKo": "소도마", "note": "관용 표기 소돔"},
  "G4342": {"translitKo": "프로스카르테레오", "note": ""},
  "G5564": {"translitKo": "코리온", "note": ""},
  "G976": {"translitKo": "비블로스", "note": ""},
  "G2445": {"translitKo": "이오페", "note": "관용 표기 욥바"},
  "G3960": {"translitKo": "파타소", "note": ""},
  "G5266": {"translitKo": "휘포데마", "note": ""},
  "G4576": {"translitKo": "세보마이", "note": ""},
  "G483": {"translitKo": "안틸레고", "note": ""},
  "G1929": {"translitKo": "에피디도미", "note": ""},
  "G5221": {"translitKo": "휘판타오", "note": ""},
  "G4755": {"translitKo": "스트라테고스", "note": ""},
  "G4623": {"translitKo": "시오파오", "note": ""},
  "G1843": {"translitKo": "엑소몰로게오", "note": ""},
  "G86": {"translitKo": "하데스", "note": ""},
  "G3727": {"translitKo": "호르코스", "note": ""},
  "G3925": {"translitKo": "파렘볼레", "note": ""},
  "G2004": {"translitKo": "에피타소", "note": ""},
  "G1718": {"translitKo": "엠파니조", "note": ""},
  "G4605": {"translitKo": "시돈", "note": ""},
  "G4116": {"translitKo": "플라튀스", "note": ""},
  "G4802": {"translitKo": "쉬제테오", "note": ""},
  "G5408": {"translitKo": "포노스", "note": ""},
  "G4889": {"translitKo": "쉰둘로스", "note": ""},
  "G851": {"translitKo": "아파이레오", "note": ""},
  "G1345": {"translitKo": "디카이오마", "note": ""},
  "G4058": {"translitKo": "페리스테라", "note": ""},
  "G4749": {"translitKo": "스톨레", "note": ""},
  "H1160": {"translit": "bəʿôr", "translitKo": "베오르", "note": "관용 표기 브올"},
  "H1177": {"translit": "baʿal ḥānān", "translitKo": "바알 하난", "note": ""},
  "H4444": {"translit": "malkîšûaʿ", "translitKo": "말키슈아", "note": "관용 표기 말기수아"},
  "H447": {"translit": "ʾĕlîʾēl", "translitKo": "엘리엘", "note": ""},
  "H5744": {"translit": "ʿôbēd", "translitKo": "오베드", "note": "관용 표기 오벳"},
  "H3395": {"translit": "yərōḥām", "translitKo": "예로함", "note": "관용 표기 여로함"},
  "H1663": {"translit": "gittî", "translitKo": "기티", "note": ""},
  "H3774": {"translit": "kərētî", "translitKo": "케레티", "note": "관용 표기 그렛"},
  "H5176": {"translit": "nāḥāš", "translitKo": "나하쉬", "note": "관용 표기 나하스"},
  "H763": {"translit": "ʾăram nahărayim", "translitKo": "아람 나하라임", "note": ""},
  "H6147": {"translit": "ʿēr", "translitKo": "에르", "note": "관용 표기 엘"},
  "H5177": {"translit": "naḥšôn", "translitKo": "나흐숀", "note": "관용 표기 나손"},
  "H672": {"translit": "ʾephrāt", "translitKo": "에프라트", "note": "관용 표기 에브랏"},
  "H2128": {"translit": "zîph", "translitKo": "지프", "note": "관용 표기 십"},
  "H4635": {"translit": "maʿăreket", "translitKo": "마아레케트", "note": ""},
  "H7935": {"translit": "šəkanyâ", "translitKo": "셰카냐", "note": "관용 표기 스가냐"},
  "H564": {"translit": "ʾimmēr", "translitKo": "이메르", "note": "관용 표기 임멜"},
  "H2139": {"translit": "zakkûr", "translitKo": "자쿠르", "note": "관용 표기 사굴"},
  "H8018": {"translit": "šelemyâ", "translitKo": "셸렘야", "note": "관용 표기 셀레먀"},
  "H7239": {"translit": "ribbô", "translitKo": "리보", "note": ""},
  "H7649": {"translit": "śābēaʿ", "translitKo": "사베아", "note": "furtive patach"},
  "H1328": {"translit": "bətûʾēl", "translitKo": "베투엘", "note": "관용 표기 브두엘"},
  "H8082": {"translit": "šāmēn", "translitKo": "샤멘", "note": ""},
  "H1062": {"translit": "bəkôrâ", "translitKo": "베코라", "note": ""},
  "H1463": {"translit": "gôg", "translitKo": "고그", "note": "관용 표기 곡"},
  "H7652": {"translit": "šebaʿ", "translitKo": "셰바", "note": "관용 표기 스바"},
  "H5714": {"translit": "ʿiddô", "translitKo": "이도", "note": "관용 표기 잇도"},
  "H6846": {"translit": "ṣəphanyâ", "translitKo": "체판야", "note": "관용 표기 스바냐"},
  "H357": {"translit": "ʾayyālôn", "translitKo": "아얄론", "note": ""},
  "H7340": {"translit": "rəḥōb", "translitKo": "레호브", "note": "관용 표기 르홉"},
  "H8396": {"translit": "tābôr", "translitKo": "타보르", "note": "관용 표기 다볼"},
  "H5989": {"translit": "ʿammîhûd", "translitKo": "암미후드", "note": "관용 표기 암미훗"},
  "H5402": {"translit": "nešeq", "translitKo": "네셰크", "note": ""},
  "H1558": {"translit": "gālāl", "translitKo": "갈랄", "note": ""},
  "H6158": {"translit": "ʿōrēb", "translitKo": "오레브", "note": "관용 표기 오렙"},
  "H2048": {"translit": "hātal", "translitKo": "하탈", "note": ""},
  "H6561": {"translit": "pāraq", "translitKo": "파라크", "note": ""},
  "H5606": {"translit": "sāphaq", "translitKo": "사파크", "note": ""},
  "H3608": {"translit": "keleʾ", "translitKo": "켈레", "note": ""},
  "H231": {"translit": "ʾēzôb", "translitKo": "에조브", "note": ""},
  "H2504": {"translit": "ḥālāṣ", "translitKo": "할라츠", "note": ""},
  "H2527": {"translit": "ḥōm", "translitKo": "홈", "note": ""},
  "H2318": {"translit": "ḥādaš", "translitKo": "하다쉬", "note": ""},
  "H4673": {"translit": "maṣṣāb", "translitKo": "마차브", "note": ""},
  "H2883": {"translit": "ṭābaʿ", "translitKo": "타바", "note": ""},
  "H4745": {"translit": "miqreh", "translitKo": "미크레", "note": ""},
  "H6872": {"translit": "ṣərôr", "translitKo": "체로르", "note": ""},
  "H3543": {"translit": "kāhâ", "translitKo": "카하", "note": ""},
  "H3334": {"translit": "yāṣar", "translitKo": "야차르", "note": ""},
  "H6881": {"translit": "ṣārʿâ", "translitKo": "차르아", "note": "관용 표기 소라"},
  "H1642": {"translit": "gərār", "translitKo": "게라르", "note": "관용 표기 그랄"},
  "H961": {"translit": "bizzâ", "translitKo": "비자", "note": ""},
  "H5095": {"translit": "nāhal", "translitKo": "나할", "note": ""},
  "H107": {"translit": "ʾiggeret", "translitKo": "이게레트", "note": ""},
  "H3078": {"translit": "yəhôyākîn", "translitKo": "예호야킨", "note": "관용 표기 여호야긴"},
  "H919": {"translit": "bedeq", "translitKo": "베데크", "note": ""},
  "H1443": {"translit": "gādar", "translitKo": "가다르", "note": ""},
  "H7054": {"translit": "qāmâ", "translitKo": "카마", "note": ""},
  "H7600": {"translit": "šaʾănān", "translitKo": "샤아난", "note": ""},
  "H7025": {"translit": "qîr ḥereś", "translitKo": "키르 헤레스", "note": "관용 표기 길하레셋"},
  "H1602": {"translit": "gāʿal", "translitKo": "가알", "note": ""},
  "H5064": {"translit": "nāgar", "translitKo": "나가르", "note": ""},
  "H6354": {"translit": "paḥat", "translitKo": "파하트", "note": ""},
  "H2529": {"translit": "ḥemʾâ", "translitKo": "헴아", "note": ""},
  "H5154": {"translit": "nəḥûšâ", "translitKo": "네후샤", "note": ""},
  "H6418": {"translit": "pelek", "translitKo": "펠레크", "note": ""},
  "H6210": {"translit": "ʿereś", "translitKo": "에레스", "note": ""}
};

const output = {
  shard: data.shard,
  model: 'gptoss120b',
  count: data.count,
  entries: []
};

for (const item of data.items) {
  const { strong, lemma, translit } = item;
  const entry = { strong, lemma };
  if (mapping[strong]) {
    const m = mapping[strong];
    if (m.translit !== undefined) entry.translit = m.translit;
    else if (translit) entry.translit = translit;
    entry.translitKo = m.translitKo;
    entry.note = m.note;
  } else {
    entry.translit = translit || '';
    entry.translitKo = 'UNKNOWN';
    entry.note = '';
  }
  output.entries.push(entry);
}

fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');
console.log(`F/AE-gptoss120b.json entries=${output.entries.length} OK`);
