// Wikidata QID → 관련 성경 본문 태그 (정적 매핑)
// 주요 인물/장소에 한해 사전 수록; 나머지는 NodeEditor에서 직접 입력
export const BIBLE_REFS = {
  // ── 인물 ──────────────────────────────────────────────────────────────────
  'Q160':   ['창세기 1-5'],                                                        // 아담
  'Q46622': ['창세기 2-4'],                                                        // 하와
  'Q93063': ['창세기 6-9'],                                                        // 노아
  'Q9181':  ['창세기 12-25'],                                                      // 아브라함
  'Q194808':['창세기 11-23'],                                                      // 사라
  'Q40574': ['창세기 11-19'],                                                      // 롯
  'Q219395':['창세기 14:18-20'],                                                   // 멜기세덱
  'Q214617':['창세기 16', '창세기 21'],                                           // 하갈
  'Q183403':['창세기 16-17', '창세기 21', '창세기 25:12-18'],                    // 이스마엘
  'Q1386':  ['창세기 21-35'],                                                      // 이삭
  'Q193703':['창세기 25-50'],                                                      // 야곱
  'Q286215':['창세기 37-50'],                                                      // 요셉(창세기)
  'Q9077':  ['출애굽기', '레위기', '민수기', '신명기'],                          // 모세
  'Q179272':['출애굽기 4-40', '레위기', '민수기'],                               // 아론
  'Q25324': ['여호수아'],                                                           // 여호수아
  'Q213538':['사사기 6-8'],                                                        // 기드온
  'Q61742': ['사사기 13-16'],                                                      // 삼손
  'Q134539':['룻기'],                                                              // 룻
  'Q43259': ['사무엘상 1-25'],                                                     // 사무엘
  'Q206949':['사무엘상 9-31'],                                                     // 사울(왕)
  'Q41370': ['사무엘상 16-31', '사무엘하', '시편'],                              // 다윗
  'Q37085': ['열왕기상 1-11', '잠언', '전도서', '아가'],                        // 솔로몬
  'Q133705':['열왕기상 17-21', '열왕기하 1-2'],                                  // 엘리야
  'Q8073':  ['열왕기하 2-13'],                                                     // 엘리사
  'Q40640': ['욥기'],                                                              // 욥
  'Q9142':  ['이사야'],                                                            // 이사야
  'Q133535':['예레미야', '예레미야애가'],                                          // 예레미야
  'Q128569':['느헤미야'],                                                          // 느헤미야
  'Q49479': ['에스라'],                                                            // 에스라
  'Q45765': ['에스더'],                                                            // 에스더
  'Q133748':['다니엘'],                                                            // 다니엘
  'Q43264': ['마태복음 3', '마가복음 1', '누가복음 1·3'],                       // 세례 요한
  'Q302':   ['마태복음', '마가복음', '누가복음', '요한복음'],                    // 예수
  'Q16815': ['누가복음 1-2', '마태복음 1-2', '요한복음 2·19'],                  // 마리아(예수 어머니)
  'Q33923': ['마태복음 4+', '마가복음', '사도행전', '베드로전서', '베드로후서'], // 베드로
  'Q9412':  ['요한복음', '요한1·2·3서', '요한계시록'],                           // 사도 요한
  'Q9200':  ['사도행전 9-28', '로마서', '고린도전·후서', '갈라디아서', '에베소서', '빌립보서', '골로새서'], // 바울
  'Q43274': ['마태복음 4', '사도행전 12', '갈라디아서 1-2'],                    // 야고보(사도)

  // ── 장소 ──────────────────────────────────────────────────────────────────
  'Q5699':  ['창세기 11:28-31'],                                                   // 우르
  'Q183':   ['창세기 11:31-12:1', '창세기 27-29'],                               // 하란
  'Q41180': ['여호수아 2-6'],                                                      // 여리고
  'Q5766':  ['출애굽기 19-40'],                                                    // 시내산
  'Q79':    ['창세기 37-50', '출애굽기 1-15'],                                   // 이집트
  'Q1218':  ['역대하', '시편 48', '이사야', '누가복음 19-24'],                   // 예루살렘
  'Q5776':  ['룻기 1', '미가 5:2', '마태복음 2', '누가복음 2'],                // 베들레헴
  'Q5765':  ['다니엘', '에스라', '느헤미야', '에스겔 1'],                       // 바빌론(바벨론)
  'Q41621': ['누가복음 1-4', '마태복음 2:23', '요한복음 1:46'],                // 나사렛
  'Q41637': ['마태복음 4:18', '요한복음 6', '누가복음 5'],                      // 갈릴리 바다
  'Q15975': ['창세기 32', '창세기 35', '사사기', '호세아 6'],                   // 벧엘
};

// 프로젝트에서 검색·검증하는 모든 성경 인물의 표준 이름과 원어 정보.
// meaning이 '어원 불확실'인 경우 학설 중 하나를 단정하지 않는다.
export const BIBLICAL_PERSON_PROFILES = {
  Q160: { canonicalName: '아담', testament: 'ot', originalName: 'אָדָם', transliteration: '아담(ʾĀdām)', meaning: '사람, 땅에서 난 자', aliases: ['Adam'] },
  Q46622: { canonicalName: '하와', testament: 'ot', originalName: 'חַוָּה', transliteration: '하와(Ḥawwāh)', meaning: '생명, 살아 있는 자', aliases: ['Eve'] },
  Q93063: { canonicalName: '노아', testament: 'ot', originalName: 'נֹחַ', transliteration: '노아흐(Nōaḥ)', meaning: '쉼, 안식', aliases: ['Noah'] },
  Q9181: { canonicalName: '아브라함', testament: 'ot', originalName: 'אַבְרָהָם', transliteration: '아브라함(ʾAḇrāhām)', meaning: '많은 무리의 아버지', aliases: ['아브람', 'Abram', 'Abraham'] },
  Q194808: { canonicalName: '사라', testament: 'ot', originalName: 'שָׂרָה', transliteration: '사라(Śārāh)', meaning: '여주인, 공주', aliases: ['사래', 'Sarai', 'Sarah'] },
  Q40574: { canonicalName: '롯', testament: 'ot', originalName: 'לוֹט', transliteration: '로트(Lôṭ)', meaning: '어원 불확실', aliases: ['Lot'] },
  Q219395: { canonicalName: '멜기세덱', testament: 'ot', originalName: 'מַלְכִּי־צֶדֶק', transliteration: '말키체데크(Malkî-ṣeḏeq)', meaning: '의의 왕', aliases: ['Melchizedek'] },
  Q214617: { canonicalName: '하갈', testament: 'ot', originalName: 'הָגָר', transliteration: '하가르(Hāḡār)', meaning: '어원 불확실', aliases: ['Hagar'] },
  Q183403: { canonicalName: '이스마엘', testament: 'ot', originalName: 'יִשְׁמָעֵאל', transliteration: '이쉬마엘(Yišmāʿēl)', meaning: '하나님이 들으신다', aliases: ['Ishmael'] },
  Q1386: { canonicalName: '이삭', testament: 'ot', originalName: 'יִצְחָק', transliteration: '이츠하크(Yiṣḥāq)', meaning: '그가 웃는다', aliases: ['Isaac'] },
  Q193703: { canonicalName: '야곱', testament: 'ot', originalName: 'יַעֲקֹב', transliteration: '야아코브(Yaʿăqōḇ)', meaning: '발꿈치를 잡는 자', aliases: ['이스라엘', 'Jacob', 'Israel'] },
  Q286215: { canonicalName: '요셉', testament: 'ot', originalName: 'יוֹסֵף', transliteration: '요세프(Yôsēp̄)', meaning: '그가 더하시기를', aliases: ['Joseph'] },
  Q9077: { canonicalName: '모세', testament: 'ot', originalName: 'מֹשֶׁה', transliteration: '모셰(Mōšeh)', meaning: '물에서 건져냄', aliases: ['Moses'] },
  Q179272: { canonicalName: '아론', testament: 'ot', originalName: 'אַהֲרֹן', transliteration: '아하론(ʾAhărōn)', meaning: '어원 불확실', aliases: ['Aaron'] },
  Q25324: { canonicalName: '여호수아', testament: 'ot', originalName: 'יְהוֹשֻׁעַ', transliteration: '예호슈아(Yəhôšuaʿ)', meaning: '여호와는 구원이시다', aliases: ['호세아', 'Hoshea', 'Joshua'] },
  Q213538: { canonicalName: '기드온', testament: 'ot', originalName: 'גִּדְעוֹן', transliteration: '기드온(Gidʿôn)', meaning: '찍어 넘어뜨리는 자', aliases: ['여룹바알', 'Gideon', 'Jerubbaal'] },
  Q61742: { canonicalName: '삼손', testament: 'ot', originalName: 'שִׁמְשׁוֹן', transliteration: '심숀(Šimšôn)', meaning: '태양과 관련된 이름', aliases: ['Samson'] },
  Q134539: { canonicalName: '룻', testament: 'ot', originalName: 'רוּת', transliteration: '루트(Rûṯ)', meaning: '어원 불확실', aliases: ['Ruth'] },
  Q43259: { canonicalName: '사무엘', testament: 'ot', originalName: 'שְׁמוּאֵל', transliteration: '셰무엘(Šəmûʾēl)', meaning: '하나님께서 들으셨다', aliases: ['Samuel'] },
  Q206949: { canonicalName: '사울', testament: 'ot', originalName: 'שָׁאוּל', transliteration: '샤울(Šāʾûl)', meaning: '구하여 얻은 자', aliases: ['Saul'] },
  Q41370: { canonicalName: '다윗', testament: 'ot', originalName: 'דָּוִד', transliteration: '다비드(Dāwiḏ)', meaning: '사랑받는 자', aliases: ['David'] },
  Q37085: { canonicalName: '솔로몬', testament: 'ot', originalName: 'שְׁלֹמֹה', transliteration: '쉘로모(Šəlōmōh)', meaning: '평화', aliases: ['Solomon'] },
  Q133705: { canonicalName: '엘리야', testament: 'ot', originalName: 'אֵלִיָּהוּ', transliteration: '엘리야후(ʾĒlîyāhû)', meaning: '나의 하나님은 여호와이시다', aliases: ['Elijah'] },
  Q8073: { canonicalName: '엘리사', testament: 'ot', originalName: 'אֱלִישָׁע', transliteration: '엘리샤(ʾĔlîšāʿ)', meaning: '하나님은 구원이시다', aliases: ['Elisha'] },
  Q40640: { canonicalName: '욥', testament: 'ot', originalName: 'אִיּוֹב', transliteration: '이요브(ʾIyyôḇ)', meaning: '어원 불확실', aliases: ['Job'] },
  Q9142: { canonicalName: '이사야', testament: 'ot', originalName: 'יְשַׁעְיָהוּ', transliteration: '예샤야후(Yəšaʿyāhû)', meaning: '여호와는 구원이시다', aliases: ['Isaiah'] },
  Q133535: { canonicalName: '예레미야', testament: 'ot', originalName: 'יִרְמְיָהוּ', transliteration: '이르메야후(Yirməyāhû)', meaning: '여호와께서 세우신다', aliases: ['Jeremiah'] },
  Q128569: { canonicalName: '느헤미야', testament: 'ot', originalName: 'נְחֶמְיָה', transliteration: '느헴야(Nəḥemyāh)', meaning: '여호와께서 위로하신다', aliases: ['Nehemiah'] },
  Q49479: { canonicalName: '에스라', testament: 'ot', originalName: 'עֶזְרָא', transliteration: '에즈라(ʿEzrāʾ)', meaning: '도움', aliases: ['Ezra'] },
  Q45765: { canonicalName: '에스더', testament: 'ot', originalName: 'אֶסְתֵּר', transliteration: '에스테르(ʾEstēr)', meaning: '페르시아식 이름, 어원 논쟁 있음', aliases: ['하닷사', 'Hadassah', 'Esther'] },
  Q133748: { canonicalName: '다니엘', testament: 'ot', originalName: 'דָּנִיֵּאל', transliteration: '다니엘(Dāniyyēʾl)', meaning: '하나님은 나의 재판장이시다', aliases: ['Daniel'] },
  Q43264: { canonicalName: '세례 요한', testament: 'nt', originalName: 'Ἰωάννης', transliteration: '이오안네스(Iōannēs)', meaning: '여호와께서 은혜를 베푸셨다', aliases: ['침례 요한', 'John the Baptist'] },
  Q302: { canonicalName: '예수', testament: 'nt', originalName: 'Ἰησοῦς', transliteration: '이에수스(Iēsous)', meaning: '여호와는 구원이시다', aliases: ['Jesus'] },
  Q16815: { canonicalName: '마리아', testament: 'nt', originalName: 'Μαριάμ', transliteration: '마리암(Mariam)', meaning: '어원 불확실', aliases: ['Mary'] },
  Q33923: { canonicalName: '베드로', testament: 'nt', originalName: 'Πέτρος', transliteration: '페트로스(Petros)', meaning: '돌, 반석', aliases: ['시몬', '게바', 'Simon', 'Cephas', 'Peter'] },
  Q9412: { canonicalName: '사도 요한', testament: 'nt', originalName: 'Ἰωάννης', transliteration: '이오안네스(Iōannēs)', meaning: '여호와께서 은혜를 베푸셨다', aliases: ['요한', 'John'] },
  Q9200: { canonicalName: '바울', testament: 'nt', originalName: 'Παῦλος', transliteration: '파울로스(Paulos)', meaning: '작은 자', aliases: ['사울', 'Saul of Tarsus', 'Paul'] },
  Q43274: { canonicalName: '야고보', testament: 'nt', originalName: 'Ἰάκωβος', transliteration: '이아코보스(Iakōbos)', meaning: '야곱에서 유래한 이름', aliases: ['James'] },
};

export function getBiblicalPersonProfile(wikidataId) {
  return BIBLICAL_PERSON_PROFILES[wikidataId] || null;
}

/**
 * Wikidata QID로 성경 본문 태그 배열 반환.
 * 매핑 없으면 빈 배열.
 */
export function getBibleTags(wikidataId) {
  return BIBLE_REFS[wikidataId] || [];
}

// 성경 본문 안에서 이름이 변경되거나 함께 사용되는 주요 인물 이름.
// 검색은 어느 이름으로 입력해도 canonicalName 기준으로 통합한다.
export const BIBLICAL_NAME_ALIASES = [
  { aliases: ['아브람', 'Abram'], canonicalName: '아브라함', qid: 'Q9181', note: '아브람에서 아브라함으로 이름이 변경됨', reference: '창세기 17:5' },
  { aliases: ['사래', 'Sarai', 'Sarah'], canonicalName: '사라', qid: 'Q194808', note: '사래에서 사라로 이름이 변경됨', reference: '창세기 17:15' },
  { aliases: ['야곱', 'Jacob'], canonicalName: '이스라엘', qid: 'Q193703', note: '야곱에게 이스라엘이라는 이름이 주어짐', reference: '창세기 32:28; 35:10' },
  { aliases: ['호세아', 'Hoshea'], canonicalName: '여호수아', qid: 'Q25324', note: '모세가 호세아를 여호수아라 부름', reference: '민수기 13:16' },
  { aliases: ['기드온', 'Gideon'], canonicalName: '여룹바알', qid: 'Q213538', note: '기드온이 여룹바알이라 불림', reference: '사사기 6:32' },
  { aliases: ['하닷사', 'Hadassah'], canonicalName: '에스더', qid: 'Q45765', note: '하닷사의 페르시아식 이름이 에스더임', reference: '에스더 2:7' },
  { aliases: ['시몬', '게바', 'Simon', 'Cephas'], canonicalName: '베드로', qid: 'Q33923', note: '시몬에게 게바·베드로라는 이름이 주어짐', reference: '요한복음 1:42' },
  { aliases: ['사울', 'Saul of Tarsus'], canonicalName: '바울', qid: 'Q9200', note: '사울과 바울은 같은 인물의 유대식·로마식 이름', reference: '사도행전 13:9' },
  { aliases: ['요셉 바사바', '바사바'], canonicalName: '유스도', qid: null, note: '요셉이 바사바·유스도라는 이름으로도 불림', reference: '사도행전 1:23' },
];

function normalizeName(value) {
  return String(value || '').trim().toLocaleLowerCase().replace(/\s+/g, ' ');
}

export function resolveBiblicalName(query) {
  const normalized = normalizeName(query);
  // 정확한 표준 이름을 별칭보다 먼저 해석한다.
  // 예: 구약 왕 '사울'이 바울의 이전 이름 별칭에 가로채이지 않도록 한다.
  const canonicalProfileMatch = Object.entries(BIBLICAL_PERSON_PROFILES).find(([, profile]) =>
    normalizeName(profile.canonicalName) === normalized
    || normalizeName(profile.originalName) === normalized
    || normalizeName(profile.transliteration) === normalized,
  );
  if (canonicalProfileMatch) {
    const [qid, profile] = canonicalProfileMatch;
    const nameInfo = BIBLICAL_NAME_ALIASES.find((entry) => entry.qid === qid);
    return {
      query: profile.canonicalName,
      matchedName: String(query).trim(),
      canonicalName: profile.canonicalName,
      aliases: profile.aliases,
      qid,
      note: nameInfo?.note,
      reference: nameInfo?.reference,
    };
  }

  const aliasMatch = BIBLICAL_NAME_ALIASES.find((entry) =>
    entry.aliases.some((alias) => normalizeName(alias) === normalized),
  );
  if (aliasMatch) {
    return { query: aliasMatch.canonicalName, matchedName: String(query).trim(), ...aliasMatch };
  }

  const profileMatch = Object.entries(BIBLICAL_PERSON_PROFILES).find(([, profile]) =>
    profile.aliases.some((alias) => normalizeName(alias) === normalized),
  );
  if (profileMatch) {
    const [qid, profile] = profileMatch;
    return {
      query: profile.canonicalName,
      matchedName: String(query).trim(),
      canonicalName: profile.canonicalName,
      aliases: profile.aliases,
      qid,
    };
  }
  return { query: String(query || '').trim(), matchedName: null };
}

export function getBiblicalNameInfo(wikidataId) {
  return BIBLICAL_NAME_ALIASES.find((entry) => entry.qid && entry.qid === wikidataId) || null;
}

// 성경 인물의 대표 활동 연대. 고대 연대기는 학설 차이가 있으므로 모두 추정값으로 취급한다.
// Wikidata에 연도가 없는 인물의 동시대 검색 기준과 정적 결과 보완에 사용한다.
export const BIBLICAL_CHRONOLOGY = {
  Q93063: { name: '노아', birthYear: -3000, deathYear: -2500 },
  Q9181: { name: '아브라함', birthYear: -2000, deathYear: -1825 },
  Q194808: { name: '사라', birthYear: -1990, deathYear: -1865 },
  Q40574: { name: '롯', birthYear: -1985, deathYear: -1870 },
  Q219395: { name: '멜기세덱', birthYear: -2000, deathYear: -1900 },
  Q214617: { name: '하갈', birthYear: -1980, deathYear: -1880 },
  Q183403: { name: '이스마엘', birthYear: -1914, deathYear: -1777 },
  Q1386: { name: '이삭', birthYear: -1900, deathYear: -1720 },
  Q193703: { name: '야곱', birthYear: -1840, deathYear: -1690 },
  Q286215: { name: '요셉', birthYear: -1750, deathYear: -1640 },
  Q179272: { name: '아론', birthYear: -1400, deathYear: -1280 },
  Q9077: { name: '모세', birthYear: -1390, deathYear: -1270 },
  Q25324: { name: '여호수아', birthYear: -1350, deathYear: -1240 },
  Q213538: { name: '기드온', birthYear: -1200, deathYear: -1100 },
  Q61742: { name: '삼손', birthYear: -1120, deathYear: -1080 },
  Q134539: { name: '룻', birthYear: -1120, deathYear: -1030 },
  Q43259: { name: '사무엘', birthYear: -1100, deathYear: -1010 },
  Q206949: { name: '사울', birthYear: -1080, deathYear: -1010 },
  Q41370: { name: '다윗', birthYear: -1040, deathYear: -970 },
  Q37085: { name: '솔로몬', birthYear: -990, deathYear: -930 },
  Q133705: { name: '엘리야', birthYear: -920, deathYear: -850 },
  Q8073: { name: '엘리사', birthYear: -900, deathYear: -800 },
  Q9142: { name: '이사야', birthYear: -765, deathYear: -685 },
  Q133535: { name: '예레미야', birthYear: -650, deathYear: -570 },
  Q133748: { name: '다니엘', birthYear: -620, deathYear: -535 },
  Q45765: { name: '에스더', birthYear: -500, deathYear: -430 },
  Q49479: { name: '에스라', birthYear: -480, deathYear: -400 },
  Q128569: { name: '느헤미야', birthYear: -475, deathYear: -390 },
  Q16815: { name: '마리아', birthYear: -20, deathYear: 45 },
  Q43264: { name: '세례 요한', birthYear: -5, deathYear: 30 },
  Q302: { name: '예수', birthYear: -6, deathYear: 30 },
  Q33923: { name: '베드로', birthYear: -1, deathYear: 64 },
  Q9412: { name: '사도 요한', birthYear: 6, deathYear: 100 },
  Q9200: { name: '바울', birthYear: 5, deathYear: 67 },
  Q43274: { name: '야고보', birthYear: 1, deathYear: 44 },
};

export function getBiblicalChronology(wikidataId) {
  return BIBLICAL_CHRONOLOGY[wikidataId] || null;
}

// ── 정적 장소-인물 보완 매핑 ──────────────────────────────────────────────────
// Wikidata 데이터 공백 보완: P19/P551이 해당 장소로 직접 연결되지 않는 주요 인물
// 예) 아브라함 P19 없음, P551 = 메소포타미아(Q11767) → 우르 검색 시 누락
export const STATIC_PLACE_PERSONS = {
  // 우르 (Ur) + 갈대아 우르 (Ur Kasdim)
  'Q5699':    [{ wikidataId: 'Q9181', name: '아브라함', description: '믿음의 조상, 우르 출신 (창 11:31)', birthYear: -2000 }],
  'Q5373099': [{ wikidataId: 'Q9181', name: '아브라함', description: '믿음의 조상, 우르 출신 (창 11:31)', birthYear: -2000 }],

  // 이집트
  'Q79': [
    { wikidataId: 'Q286215', name: '요셉',   description: '야곱의 아들, 이집트 총리 (창 37-50)', birthYear: -1900 },
    { wikidataId: 'Q9077',   name: '모세',   description: '출애굽 지도자 (출)', birthYear: -1300 },
    { wikidataId: 'Q179272', name: '아론',   description: '모세의 형, 대제사장 (출)', birthYear: -1305 },
  ],

  // 헤브론
  'Q168225': [
    { wikidataId: 'Q9181',   name: '아브라함', description: '막벨라 굴 매장지 (창 23)', birthYear: -2000 },
    { wikidataId: 'Q1386',   name: '이삭',     description: '막벨라 굴 매장 (창 35:29)', birthYear: -1900 },
    { wikidataId: 'Q193703', name: '야곱',     description: '막벨라 굴 매장 (창 50:13)', birthYear: -1837 },
    { wikidataId: 'Q41370',  name: '다윗',     description: '7년간 헤브론에서 통치 (삼하 2:1-11)', birthYear: -1040 },
  ],

  // 예루살렘
  'Q1218': [
    { wikidataId: 'Q41370', name: '다윗',    description: '예루살렘 정복, 수도 삼음 (삼하 5)', birthYear: -1040 },
    { wikidataId: 'Q37085', name: '솔로몬',  description: '성전 건축 (왕상 5-8)', birthYear: -1010 },
    { wikidataId: 'Q302',   name: '예수',    description: '예루살렘 입성, 십자가 (눅 19-24)', birthYear: -6 },
    { wikidataId: 'Q128569', name: '느헤미야', description: '성벽 재건 (느)', birthYear: -445 },
  ],

  // 베들레헴
  'Q5776': [
    { wikidataId: 'Q134539', name: '룻',     description: '나오미를 따라 베들레헴 귀환 (룻)', birthYear: -1100 },
    { wikidataId: 'Q41370',  name: '다윗',   description: '베들레헴 출생 (삼상 16)', birthYear: -1040 },
    { wikidataId: 'Q302',    name: '예수',   description: '베들레헴 탄생 (마 2, 눅 2)', birthYear: -6 },
  ],

  // 나사렛
  'Q41621': [
    { wikidataId: 'Q302',    name: '예수',   description: '나사렛에서 성장 (눅 2:51)', birthYear: -6 },
    { wikidataId: 'Q16815',  name: '마리아', description: '예수의 어머니, 나사렛 거주 (눅 1:26)', birthYear: -18 },
  ],

  // 하란
  'Q183': [
    { wikidataId: 'Q9181',   name: '아브라함', description: '우르에서 하란으로 이주 (창 11:31)', birthYear: -2000 },
    { wikidataId: 'Q193703', name: '야곱',     description: '외삼촌 라반 집으로 피신 (창 28-31)', birthYear: -1837 },
  ],
};

/**
 * 장소 QID에 정적으로 연결된 인물 목록 반환.
 * 해당 QID가 없으면 빈 배열.
 */
export function getStaticPlacePersons(wikidataId) {
  return STATIC_PLACE_PERSONS[wikidataId] || [];
}
