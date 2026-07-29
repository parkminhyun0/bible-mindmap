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

// 이름의 뜻을 성경 본문이 직접 설명하는 경우 그 본문을 우선한다.
// 직접 설명이 없는 이름은 원어 사전과 보편적 성경학의 어원 풀이임을 명시한다.
const BIBLICAL_NAME_MEANING_REFERENCES = {
  Q160: '창세기 2:7 — 땅의 흙으로 사람을 지으심',
  Q46622: '창세기 3:20 — 모든 산 자의 어머니',
  Q93063: '창세기 5:29 — 수고에서 안위하리라',
  Q9181: '창세기 17:5 — 여러 민족의 아버지',
  Q194808: '창세기 17:15-16 — 사래를 사라로 부르심',
  Q183403: '창세기 16:11 — 여호와께서 고통을 들으심',
  Q1386: '창세기 17:19; 18:12 — 웃음과 연결된 이름',
  Q193703: '창세기 25:26; 32:28 — 발꿈치와 이스라엘 이름',
  Q9077: '출애굽기 2:10 — 물에서 건져냄',
  Q43259: '사무엘상 1:20 — 여호와께 구하여 얻음',
  Q302: '마태복음 1:21 — 자기 백성을 죄에서 구원하실 분',
  Q33923: '요한복음 1:42 — 게바, 번역하면 베드로',
};

export function getBiblicalNameMeaningBasis(wikidataId) {
  const profile = getBiblicalPersonProfile(wikidataId);
  if (!profile) return null;
  return BIBLICAL_NAME_MEANING_REFERENCES[wikidataId]
    || (profile.testament === 'nt'
      ? '헬라어 이름의 보편적 성경학 어원'
      : '히브리어 이름의 보편적 성경학 어원');
}

// 성경 본문에 명시되거나 본문의 계보·서술에서 직접 확인되는 인물 관계.
// key는 방향과 무관하게 정렬하며, source/target 방향에 따라 부모·자녀 라벨을 바꾼다.
const BIBLICAL_PERSON_RELATIONSHIPS = {
  'Q160|Q46622': { type: '부부', reference: '창세기 2:22-25; 3:20' },
  'Q9181|Q194808': { type: '부부', reference: '창세기 11:29; 17:15' },
  'Q214617|Q9181': { type: '가족', reference: '창세기 16:3-4', note: '하갈은 사라의 여종이며 아브라함의 첩' },
  'Q183403|Q9181': { type: 'parent-child', parent: 'Q9181', reference: '창세기 16:15' },
  'Q1386|Q9181': { type: 'parent-child', parent: 'Q9181', reference: '창세기 21:2-3' },
  'Q1386|Q194808': { type: 'parent-child', parent: 'Q194808', reference: '창세기 21:2-3' },
  'Q40574|Q9181': { type: '친척', reference: '창세기 11:27; 12:5', note: '롯은 아브라함의 조카' },
  'Q219395|Q9181': { type: '동료', reference: '창세기 14:18-20', note: '멜기세덱이 아브라함을 축복함' },
  'Q1386|Q183403': { type: '가족', reference: '창세기 16:15; 21:2-3', note: '이복형제' },
  'Q1386|Q193703': { type: 'parent-child', parent: 'Q1386', reference: '창세기 25:21-26' },
  'Q193703|Q286215': { type: 'parent-child', parent: 'Q193703', reference: '창세기 30:22-24' },
  'Q179272|Q9077': { type: '가족', reference: '출애굽기 4:14', note: '형제' },
  'Q25324|Q9077': { type: '동료', reference: '출애굽기 24:13; 민수기 27:18-23', note: '후계자·수종자' },
  'Q43259|Q206949': { type: '동료', reference: '사무엘상 9-10', note: '선지자와 왕' },
  'Q206949|Q41370': { type: '가족', reference: '사무엘상 18:18-27', note: '장인과 사위' },
  'Q41370|Q37085': { type: 'parent-child', parent: 'Q41370', reference: '사무엘하 12:24; 열왕기상 1:28-30' },
  'Q133705|Q8073': { type: '동료', reference: '열왕기상 19:19-21; 열왕기하 2:9-15', note: '스승과 제자' },
  'Q302|Q43264': { type: '친척', reference: '누가복음 1:36', note: '어머니들이 친족' },
  'Q302|Q33923': { type: '동료', reference: '마태복음 4:18-20; 16:16-19', note: '예수와 제자' },
  'Q302|Q9412': { type: '동료', reference: '마태복음 4:21-22; 요한복음 13:23', note: '예수와 제자' },
  'Q33923|Q9412': { type: '동료', reference: '누가복음 5:10; 사도행전 3:1', note: '동료 사도' },
  'Q33923|Q9200': { type: '동료', reference: '갈라디아서 1:18; 2:7-9', note: '동료 사도' },
  'Q43274|Q9412': { type: '가족', reference: '마태복음 4:21', note: '형제' },
};

export function getBiblicalPersonRelationship(sourceQid, targetQid) {
  if (!sourceQid || !targetQid) return { label: '동시대', reference: null };
  const relationship = BIBLICAL_PERSON_RELATIONSHIPS[`${sourceQid}|${targetQid}`]
    || BIBLICAL_PERSON_RELATIONSHIPS[`${targetQid}|${sourceQid}`];
  if (!relationship) return { label: '동시대', reference: null };
  if (relationship.type === 'parent-child') {
    return {
      label: sourceQid === relationship.parent ? '자녀' : '부모',
      reference: relationship.reference,
      note: relationship.note || '',
    };
  }
  return {
    label: relationship.type,
    reference: relationship.reference,
    note: relationship.note || '',
  };
}

// 동명이의가 많은 성경 지명을 외부 번역 라벨이 아닌 본문·지역·좌표로 식별한다.
// disputed는 유적 비정이 논쟁 중인 경우이며 좌표는 대표 후보지의 근사값이다.
export const BIBLICAL_PLACE_PROFILES = {
  'place:ur-chaldeans': { canonicalName: '갈대아 우르', aliases: ['우르', 'Ur', 'Ur of the Chaldeans'], testament: 'ot', region: '남부 메소포타미아', lat: 30.9625, lon: 46.1031, certainty: 'probable', description: '아브람의 고향으로 언급되는 갈대아 우르', bibleTags: ['창세기 11:28-31'], locationBasis: '창세기 11:28-31; 전통적으로 이라크 남부 텔 엘무카이야르와 연결' },
  'place:haran': { canonicalName: '하란', aliases: ['Haran', 'Charan'], testament: 'ot', region: '상부 메소포타미아', lat: 36.8634, lon: 39.0312, certainty: 'probable', description: '아브람이 가나안으로 떠나기 전 머문 도시', bibleTags: ['창세기 11:31-12:5', '창세기 27:43-29:4'], locationBasis: '창세기 본문과 튀르키예 남동부 하란의 지명 연속성' },
  'place:jerusalem': { canonicalName: '예루살렘', aliases: ['Jerusalem', '시온', 'Zion'], testament: 'both', region: '유다 산지', lat: 31.7780, lon: 35.2354, certainty: 'confirmed', description: '다윗 왕국과 성전의 중심이며 신약 수난·부활 사건의 도시', bibleTags: ['사무엘하 5:6-10', '열왕기상 8', '누가복음 19-24', '사도행전 1-7'], locationBasis: '성경 본문·고대 문헌·고고학적 지명 연속성' },
  'place:jericho': { canonicalName: '여리고', aliases: ['Jericho'], testament: 'both', region: '요단 계곡', lat: 31.8706, lon: 35.4439, certainty: 'confirmed', description: '가나안 정복과 예수의 사역에 등장하는 요단 계곡 도시', bibleTags: ['여호수아 2-6', '누가복음 18:35-19:10'], locationBasis: '텔 에스술탄과 신약 시대 여리고 유적' },
  'place:bethlehem-judah': { canonicalName: '베들레헴', qualifiedName: '유다 베들레헴', aliases: ['베들레헴 에브라다', 'Bethlehem', 'Bethlehem Ephrathah'], testament: 'both', region: '유다', lat: 31.7054, lon: 35.2024, certainty: 'confirmed', description: '다윗의 고향이며 예수의 탄생지', bibleTags: ['룻기 1-4', '미가 5:2', '마태복음 2:1-6', '누가복음 2:1-20'], locationBasis: '본문에서 에브라다·유다와 연결되어 스불론 베들레헴과 구별' },
  'place:bethlehem-zebulun': { canonicalName: '베들레헴', qualifiedName: '스불론 베들레헴', aliases: ['Bethlehem of Zebulun'], testament: 'ot', region: '스불론', lat: 32.7356, lon: 35.1908, certainty: 'probable', description: '스불론 지파의 성읍으로 유다 베들레헴과 다른 장소', bibleTags: ['여호수아 19:15'], locationBasis: '여호수아 19장의 스불론 성읍 목록; 갈릴리 베들레헴과 연결' },
  'place:bethel': { canonicalName: '벧엘', aliases: ['Bethel', '루스', 'Luz'], testament: 'ot', region: '에브라임·베냐민 경계', lat: 31.9267, lon: 35.2386, certainty: 'probable', description: '야곱의 돌베개 사건과 북왕국 성소로 알려진 장소', bibleTags: ['창세기 28:10-22', '창세기 35:1-15', '열왕기상 12:28-33'], locationBasis: '본문의 루스·아이·예루살렘 상대 위치; 베이틴이 대표 후보' },
  'place:ramah-benjamin': { canonicalName: '라마', qualifiedName: '베냐민 라마', aliases: ['Ramah of Benjamin'], testament: 'ot', region: '베냐민', lat: 31.8493, lon: 35.2342, certainty: 'probable', description: '베냐민 지파의 라마', bibleTags: ['여호수아 18:25', '예레미야 31:15'], locationBasis: '베냐민 성읍 목록과 예루살렘 북쪽 지리' },
  'place:ramah-samuel': { canonicalName: '라마', qualifiedName: '사무엘의 라마', aliases: ['Ramathaim', 'Ramathaim-zophim'], testament: 'ot', region: '에브라임 산지', lat: 31.8327, lon: 35.1808, certainty: 'disputed', description: '사무엘의 고향과 거주지로 전해지는 라마', bibleTags: ['사무엘상 1:1', '사무엘상 7:17'], locationBasis: '라마다임소빔의 정확한 위치는 논쟁 중이며 여러 후보지가 있음' },
  'place:antioch-syria': { canonicalName: '안디옥', qualifiedName: '수리아 안디옥', aliases: ['Antioch', 'Antioch on the Orontes'], testament: 'nt', region: '수리아', lat: 36.2021, lon: 36.1603, certainty: 'confirmed', description: '제자들이 처음 그리스도인이라 불린 교회의 중심지', bibleTags: ['사도행전 11:19-30', '사도행전 13:1-3'], locationBasis: '오론테스 강변 안티오키아 유적과 고대 문헌' },
  'place:antioch-pisidia': { canonicalName: '안디옥', qualifiedName: '비시디아 안디옥', aliases: ['Pisidian Antioch', 'Antioch in Pisidia'], testament: 'nt', region: '비시디아·갈라디아 남부', lat: 38.3067, lon: 31.1897, certainty: 'confirmed', description: '바울의 제1차 전도여행 설교가 기록된 도시', bibleTags: ['사도행전 13:13-52', '사도행전 14:19-22'], locationBasis: '얄바츠 인근 안티오키아 유적과 로마 도로 자료' },
  'place:caesarea-maritima': { canonicalName: '가이사랴', qualifiedName: '해변 가이사랴', aliases: ['Caesarea', 'Caesarea Maritima'], testament: 'nt', region: '지중해 연안', lat: 32.5008, lon: 34.8928, certainty: 'confirmed', description: '고넬료 사건과 바울의 구금에 등장하는 로마 행정 도시', bibleTags: ['사도행전 10', '사도행전 23-26'], locationBasis: '헤롯 항구·극장·비문이 남은 가이사랴 유적' },
  'place:caesarea-philippi': { canonicalName: '가이사랴', qualifiedName: '가이사랴 빌립보', aliases: ['Caesarea Philippi'], testament: 'nt', region: '헤르몬 산 남서 기슭', lat: 33.2486, lon: 35.6944, certainty: 'confirmed', description: '베드로의 신앙고백 배경으로 언급되는 도시', bibleTags: ['마태복음 16:13-20', '마가복음 8:27-30'], locationBasis: '바니아스의 고대 파네아스·가이사랴 빌립보 유적' },

  // ── OT 주요 지명 ────────────────────────────────────────────────────────────
  'place:hebron': { canonicalName: '헤브론', aliases: ['Hebron', '기럇 아르바', 'Kiriath-arba', '마므레'], testament: 'ot', region: '유다 산지', lat: 31.5326, lon: 35.0998, certainty: 'confirmed', description: '족장들의 매장지 막벨라 굴과 다윗의 첫 도읍', bibleTags: ['창세기 13:18', '창세기 23', '사무엘하 2:1-4', '사무엘하 5:1-5'], locationBasis: '텔 루메이다·막벨라 전승 유적과 지명 연속성' },
  'place:shechem': { canonicalName: '세겜', aliases: ['Shechem', 'Sichem'], testament: 'ot', region: '에브라임 산지', lat: 32.2140, lon: 35.2792, certainty: 'confirmed', description: '아브라함의 첫 제단과 여호수아의 언약 갱신 장소', bibleTags: ['창세기 12:6', '창세기 33:18-20', '여호수아 24'], locationBasis: '텔 발라타 발굴과 그리심·에발 사이 위치' },
  'place:shiloh': { canonicalName: '실로', aliases: ['Shiloh'], testament: 'ot', region: '에브라임 산지', lat: 32.0556, lon: 35.2894, certainty: 'confirmed', description: '정착기 성막이 있던 예배 중심지', bibleTags: ['여호수아 18:1', '사무엘상 1-4'], locationBasis: '키르베트 세일룬 발굴' },
  'place:gibeon': { canonicalName: '기브온', aliases: ['Gibeon'], testament: 'ot', region: '베냐민', lat: 31.8461, lon: 35.1836, certainty: 'confirmed', description: '여호수아와 화친한 성읍이자 태양이 멈춘 전투의 무대', bibleTags: ['여호수아 9', '여호수아 10:12-14', '열왕기상 3:4-5'], locationBasis: '엘집 발굴과 물 저장 시설' },
  'place:beersheba': { canonicalName: '브엘세바', aliases: ['Beersheba', 'Beer-sheba'], testament: 'ot', region: '네게브', lat: 31.2450, lon: 34.8420, certainty: 'confirmed', description: '족장들의 맹세와 우물의 성읍, 이스라엘 남쪽 경계', bibleTags: ['창세기 21:31-33', '창세기 26:23-33', '사무엘상 8:2'], locationBasis: '텔 베르셰바 철기 성읍 유적' },
  'place:dan': { canonicalName: '단', aliases: ['Dan', '라이스', 'Laish', 'Leshem'], testament: 'ot', region: '북부 훌라 계곡', lat: 33.2490, lon: 35.6520, certainty: 'confirmed', description: '단 지파가 점령한 최북단 성읍, 북왕국 금송아지 성소', bibleTags: ['사사기 18', '열왕기상 12:28-30'], locationBasis: '텔 단 발굴·단 비문(다윗의 집)' },
  'place:megiddo': { canonicalName: '므깃도', aliases: ['Megiddo', '아마겟돈', 'Armageddon'], testament: 'both', region: '이스르엘 평원 서편', lat: 32.5846, lon: 35.1840, certainty: 'confirmed', description: '전략 요충지이자 요시야 전사지, 계시록 아마겟돈의 배경', bibleTags: ['여호수아 12:21', '열왕기하 23:29-30', '요한계시록 16:16'], locationBasis: '텔 므깃도 다층 발굴' },
  'place:hazor': { canonicalName: '하솔', aliases: ['Hazor'], testament: 'ot', region: '북부 갈릴리', lat: 33.0175, lon: 35.5686, certainty: 'confirmed', description: '가나안 북부 연맹의 수도로 여호수아가 불사른 성읍', bibleTags: ['여호수아 11:10-13', '사사기 4', '열왕기상 9:15'], locationBasis: '텔 하초르 대규모 발굴' },
  'place:lachish': { canonicalName: '라기스', aliases: ['Lachish'], testament: 'ot', region: '유다 평지(셰펠라)', lat: 31.5650, lon: 34.8490, certainty: 'confirmed', description: '앗수르 산헤립의 공격을 받은 유다의 요새 성읍', bibleTags: ['여호수아 10:31-32', '열왕기하 18:13-17', '역대하 32:9'], locationBasis: '텔 라기스 공성로·앗수르 부조' },
  'place:samaria': { canonicalName: '사마리아', aliases: ['Samaria', 'Sebaste'], testament: 'both', region: '에브라임 산지', lat: 32.2803, lon: 35.1897, certainty: 'confirmed', description: '북왕국의 수도이자 신약 사마리아 지방의 중심', bibleTags: ['열왕기상 16:24', '열왕기하 17', '사도행전 8:5-25'], locationBasis: '세바스티아 오므리 왕조 궁전 유적' },
  'place:carmel': { canonicalName: '갈멜산', aliases: ['Mount Carmel', 'Carmel'], testament: 'ot', region: '지중해 연안 산맥', lat: 32.7356, lon: 35.0478, certainty: 'confirmed', description: '엘리야와 바알 선지자들의 대결 장소', bibleTags: ['열왕기상 18:19-40', '열왕기하 2:25'], locationBasis: '갈멜 산맥의 지리적 연속성' },
  'place:jezreel': { canonicalName: '이스르엘', aliases: ['Jezreel'], testament: 'ot', region: '이스르엘 평원', lat: 32.5575, lon: 35.3292, certainty: 'confirmed', description: '아합의 별궁과 나봇의 포도원, 예후 혁명의 무대', bibleTags: ['열왕기상 21', '열왕기하 9:30-37'], locationBasis: '텔 이즈르엘 발굴' },
  'place:jordan-river': { canonicalName: '요단강', aliases: ['Jordan River', 'Jordan'], testament: 'both', region: '요단 지구대', lat: 32.3100, lon: 35.5700, certainty: 'confirmed', description: '이스라엘의 가나안 도하와 예수의 세례가 이루어진 강', bibleTags: ['여호수아 3', '열왕기하 5:10-14', '마태복음 3:13-17'], locationBasis: '갈릴리 바다-사해를 잇는 지리적 하천' },
  'place:dead-sea': { canonicalName: '염해', aliases: ['사해', 'Dead Sea', 'Salt Sea', '아라바 바다'], testament: 'ot', region: '요단 지구대 남부', lat: 31.5000, lon: 35.5000, certainty: 'confirmed', description: '유다 광야 동편의 소금 바다', bibleTags: ['창세기 14:3', '여호수아 3:16', '에스겔 47:8-10'], locationBasis: '지리적 실체' },
  'place:sea-of-galilee': { canonicalName: '갈릴리 바다', aliases: ['Sea of Galilee', '긴네렛', 'Chinnereth', '게네사렛', '디베랴 바다'], testament: 'both', region: '갈릴리 저지', lat: 32.8300, lon: 35.5900, certainty: 'confirmed', description: '예수의 갈릴리 사역 중심 호수', bibleTags: ['민수기 34:11', '마태복음 4:18', '요한복음 6:1'], locationBasis: '지리적 실체' },
  'place:mount-nebo': { canonicalName: '느보산', aliases: ['Mount Nebo', 'Pisgah', '비스가'], testament: 'ot', region: '모압 고원', lat: 31.7683, lon: 35.7253, certainty: 'confirmed', description: '모세가 약속의 땅을 바라보고 죽은 산', bibleTags: ['신명기 34:1-5'], locationBasis: '요르단 시야가 봉우리 전승과 지리' },
  'place:sinai': { canonicalName: '시내산', aliases: ['Mount Sinai', '호렙', 'Horeb', 'Mount Sinai'], testament: 'ot', region: '시내 반도(전통설)', lat: 28.5394, lon: 33.9733, certainty: 'disputed', description: '율법이 주어진 산; 정확한 위치는 여러 후보가 있음', bibleTags: ['출애굽기 19-20', '출애굽기 24', '열왕기상 19:8'], locationBasis: '전통적 제벨 무사 외에 여러 비정설이 논쟁 중' },
  'place:sodom': { canonicalName: '소돔', aliases: ['Sodom'], testament: 'ot', region: '사해 인근', lat: 31.2000, lon: 35.4000, certainty: 'disputed', description: '심판으로 멸망한 요단 들의 성읍', bibleTags: ['창세기 13:10-13', '창세기 19'], locationBasis: '사해 남부/북부 후보지 논쟁(밥 에드-드라 등)' },
  'place:gomorrah': { canonicalName: '고모라', aliases: ['Gomorrah'], testament: 'ot', region: '사해 인근', lat: 31.1500, lon: 35.4200, certainty: 'disputed', description: '소돔과 함께 멸망한 성읍', bibleTags: ['창세기 18:20', '창세기 19:24-28'], locationBasis: '누메이라 등 후보지 논쟁' },
  'place:nineveh': { canonicalName: '니느웨', aliases: ['Nineveh'], testament: 'ot', region: '앗수르(북부 메소포타미아)', lat: 36.3597, lon: 43.1526, certainty: 'confirmed', description: '앗수르 제국의 수도, 요나가 파송된 큰 성읍', bibleTags: ['요나 3', '나훔 1-3', '열왕기하 19:36'], locationBasis: '모술 맞은편 쿠윤지크·네비 유누스 발굴' },
  'place:babylon': { canonicalName: '바빌론', aliases: ['바벨론', 'Babylon'], testament: 'both', region: '남부 메소포타미아', lat: 32.5420, lon: 44.4208, certainty: 'confirmed', description: '유다를 멸망시킨 제국의 수도이자 포로기의 땅, 계시록의 상징', bibleTags: ['열왕기하 25', '다니엘', '요한계시록 17-18'], locationBasis: '이라크 힐라 인근 바빌론 유적' },
  'place:susa': { canonicalName: '수산', aliases: ['수사', 'Susa', 'Shushan'], testament: 'ot', region: '엘람·페르시아', lat: 32.1900, lon: 48.2600, certainty: 'confirmed', description: '페르시아 왕궁 도시, 에스더와 다니엘·느헤미야의 배경', bibleTags: ['에스더 1:2', '느헤미야 1:1', '다니엘 8:2'], locationBasis: '슈시 아케메네스 궁전 발굴' },
  'place:damascus': { canonicalName: '다메섹', aliases: ['Damascus', '다마스쿠스'], testament: 'both', region: '아람(수리아)', lat: 33.5131, lon: 36.2919, certainty: 'confirmed', description: '아람 왕국의 수도이자 바울 회심의 도시', bibleTags: ['창세기 14:15', '열왕기하 5', '사도행전 9:1-25'], locationBasis: '연속 거주 고대 도시' },
  'place:tyre': { canonicalName: '두로', aliases: ['Tyre'], testament: 'both', region: '페니키아 해안', lat: 33.2708, lon: 35.1963, certainty: 'confirmed', description: '페니키아 항구 도시, 예언과 예수 사역에 등장', bibleTags: ['사무엘하 5:11', '에스겔 26-28', '마태복음 15:21'], locationBasis: '수르(레바논) 고대 항구 유적' },
  'place:sidon': { canonicalName: '시돈', aliases: ['Sidon', 'Zidon'], testament: 'both', region: '페니키아 해안', lat: 33.5606, lon: 35.3756, certainty: 'confirmed', description: '두로 북쪽의 페니키아 항구 도시', bibleTags: ['창세기 10:15', '마태복음 15:21', '사도행전 27:3'], locationBasis: '사이다(레바논) 연속 거주지' },
  'place:gerar': { canonicalName: '그랄', aliases: ['Gerar'], testament: 'ot', region: '네게브 서부', lat: 31.3950, lon: 34.6300, certainty: 'probable', description: '아브라함과 이삭이 머문 블레셋 아비멜렉의 성읍', bibleTags: ['창세기 20', '창세기 26'], locationBasis: '텔 하로르가 유력 후보' },
  'place:ararat': { canonicalName: '아라랏', aliases: ['Ararat', 'Urartu'], testament: 'ot', region: '아르메니아 고원', lat: 39.7020, lon: 44.2980, certainty: 'disputed', description: '노아의 방주가 머문 산지', bibleTags: ['창세기 8:4'], locationBasis: '아라랏 산은 상징적 후보이며 본문은 산지(복수)를 지칭' },
  'place:goshen': { canonicalName: '고센', aliases: ['Goshen'], testament: 'ot', region: '이집트 나일 삼각주 동부', lat: 30.8000, lon: 31.8500, certainty: 'probable', description: '이스라엘이 이집트에서 거주한 목축 지역', bibleTags: ['창세기 47:1-6', '출애굽기 8:22', '출애굽기 9:26'], locationBasis: '와디 투밀랏 일대로 비정' },
  'place:red-sea': { canonicalName: '홍해', aliases: ['Red Sea', 'Yam Suph', '갈대 바다'], testament: 'ot', region: '시내 반도 인근', lat: 29.9000, lon: 32.5500, certainty: 'disputed', description: '출애굽 때 갈라진 바다; 정확한 도하 지점은 논쟁 중', bibleTags: ['출애굽기 14', '출애굽기 15:4'], locationBasis: '수에즈만·비터호·아카바만 등 후보 논쟁' },
  'place:ai': { canonicalName: '아이', aliases: ['Ai', 'Hai'], testament: 'ot', region: '벧엘 동편', lat: 31.9170, lon: 35.2640, certainty: 'disputed', description: '여호수아가 두 번째 시도에서 함락한 성읍', bibleTags: ['여호수아 7-8'], locationBasis: '엣-텔 및 키르베트 엘마카티르 후보 논쟁' },
  'place:gilgal': { canonicalName: '길갈', aliases: ['Gilgal'], testament: 'ot', region: '여리고 인근 요단 계곡', lat: 31.8700, lon: 35.5000, certainty: 'disputed', description: '요단 도하 후 첫 진영과 할례·유월절 장소', bibleTags: ['여호수아 4:19-24', '여호수아 5', '사무엘상 11:14-15'], locationBasis: '여리고 동편 후보지 논쟁' },
  'place:kadesh-barnea': { canonicalName: '가데스 바네아', aliases: ['가데스', 'Kadesh', 'Kadesh-barnea'], testament: 'ot', region: '신 광야 남부', lat: 30.6800, lon: 34.4200, certainty: 'probable', description: '정탐과 광야 세대의 오랜 체류지', bibleTags: ['민수기 13:26', '민수기 20:1-13', '신명기 1:19-46'], locationBasis: '아인 엘쿠데이라트가 유력 후보' },
  'place:ebal': { canonicalName: '에발산', aliases: ['Mount Ebal'], testament: 'ot', region: '세겜 북편', lat: 32.2350, lon: 35.2730, certainty: 'confirmed', description: '언약의 저주가 선포된 산, 여호수아의 제단', bibleTags: ['신명기 11:29', '신명기 27:4-13', '여호수아 8:30-35'], locationBasis: '세겜 북쪽 지리와 제단 유적 후보' },
  'place:gerizim': { canonicalName: '그리심산', aliases: ['Mount Gerizim'], testament: 'both', region: '세겜 남편', lat: 32.2000, lon: 35.2730, certainty: 'confirmed', description: '언약의 축복이 선포된 산이자 사마리아 예배 중심', bibleTags: ['신명기 11:29', '여호수아 8:33', '요한복음 4:20'], locationBasis: '세겜 남쪽 지리와 사마리아 성소 유적' },

  // ── 동명 지명(추가 세트) ────────────────────────────────────────────────────
  'place:mizpah-gilead': { canonicalName: '미스바', qualifiedName: '길르앗 미스바', aliases: ['Mizpah of Gilead', 'Mizpeh', '갈르엣'], testament: 'ot', region: '요단 동편 길르앗', lat: 32.3000, lon: 35.7500, certainty: 'disputed', description: '야곱과 라반의 언약 돌무더기, 입다의 근거지', bibleTags: ['창세기 31:44-49', '사사기 11:11', '사사기 11:34'], locationBasis: '요단 동편 길르앗 지역; 정확한 유적은 논쟁 중' },
  'place:mizpah-benjamin': { canonicalName: '미스바', qualifiedName: '베냐민 미스바', aliases: ['Mizpah of Benjamin'], testament: 'ot', region: '베냐민', lat: 31.8830, lon: 35.1810, certainty: 'probable', description: '사무엘의 집회와 사울 즉위, 포로기 총독부의 성읍', bibleTags: ['사사기 20:1', '사무엘상 7:5-12', '열왕기하 25:23'], locationBasis: '텔 엔나스베가 유력 후보' },
  'place:cana-galilee': { canonicalName: '가나', qualifiedName: '갈릴리 가나', aliases: ['Cana of Galilee', 'Cana'], testament: 'nt', region: '하부 갈릴리', lat: 32.7500, lon: 35.3400, certainty: 'probable', description: '예수의 첫 표적(물로 포도주)이 일어난 마을', bibleTags: ['요한복음 2:1-11', '요한복음 4:46'], locationBasis: '키르베트 카나가 유력 후보(케프르 켄나 전승도 있음)' },

  // ── NT 갈릴리·유대 사역지 ────────────────────────────────────────────────────
  'place:nazareth': { canonicalName: '나사렛', aliases: ['Nazareth'], testament: 'nt', region: '하부 갈릴리', lat: 32.7021, lon: 35.2978, certainty: 'confirmed', description: '예수가 자란 갈릴리 마을', bibleTags: ['누가복음 1:26-27', '누가복음 2:39-40', '마태복음 2:23'], locationBasis: '현 나사렛 시가지 아래 1세기 거주 흔적' },
  'place:capernaum': { canonicalName: '가버나움', aliases: ['Capernaum'], testament: 'nt', region: '갈릴리 바다 북안', lat: 32.8807, lon: 35.5750, certainty: 'confirmed', description: '예수의 갈릴리 사역 본거지', bibleTags: ['마태복음 4:13', '마가복음 2:1', '마태복음 8:5-13'], locationBasis: '텔 훔 회당·베드로 집 유적' },
  'place:bethsaida': { canonicalName: '벳새다', aliases: ['Bethsaida', 'Bethsaida Julias'], testament: 'nt', region: '갈릴리 바다 북동안', lat: 32.9100, lon: 35.6300, certainty: 'probable', description: '베드로·안드레·빌립의 고향', bibleTags: ['마태복음 11:21', '마가복음 8:22', '요한복음 1:44'], locationBasis: '엣-텔/엘아라지 후보 논쟁' },
  'place:chorazin': { canonicalName: '고라신', aliases: ['Chorazin', 'Korazim'], testament: 'nt', region: '갈릴리 바다 북편', lat: 32.9108, lon: 35.5672, certainty: 'confirmed', description: '예수의 책망을 받은 갈릴리 성읍', bibleTags: ['마태복음 11:21', '누가복음 10:13'], locationBasis: '코라짐 현무암 회당 유적' },
  'place:sychar': { canonicalName: '수가', aliases: ['Sychar'], testament: 'nt', region: '사마리아(세겜 인근)', lat: 32.2130, lon: 35.2810, certainty: 'probable', description: '예수와 사마리아 여인이 만난 야곱의 우물 마을', bibleTags: ['요한복음 4:5-6'], locationBasis: '세겜·야곱 우물 인근 아스카르 마을 비정' },
  'place:bethany-jerusalem': { canonicalName: '베다니', qualifiedName: '예루살렘 근교 베다니', aliases: ['Bethany'], testament: 'nt', region: '감람산 동편', lat: 31.7714, lon: 35.2636, certainty: 'confirmed', description: '나사로·마르다·마리아의 마을, 예수의 예루살렘 체류지', bibleTags: ['요한복음 11:1', '마태복음 21:17', '요한복음 12:1', '누가복음 24:50'], locationBasis: '엘아자리야 전승 유적; 감람산 동남 기슭' },
  'place:bethany-beyond-jordan': { canonicalName: '베다니', qualifiedName: '요단 건너편 베다니', aliases: ['베다바라', 'Bethabara', 'Bethany beyond the Jordan'], testament: 'nt', region: '요단강 동편', lat: 31.8370, lon: 35.5490, certainty: 'disputed', description: '세례 요한이 세례를 베풀고 예수를 증언한 요단 동편 지역', bibleTags: ['요한복음 1:28', '요한복음 10:40'], locationBasis: '요단 동편 알마그타스(와디 카라르) 후보; 예루살렘 베다니와 다른 곳' },
  'place:bethphage': { canonicalName: '벳바게', aliases: ['Bethphage'], testament: 'nt', region: '감람산', lat: 31.7760, lon: 35.2530, certainty: 'probable', description: '예수의 예루살렘 입성이 시작된 마을', bibleTags: ['마태복음 21:1', '마가복음 11:1', '누가복음 19:29'], locationBasis: '감람산 동남 사면 전승지' },
  'place:mount-olives': { canonicalName: '감람산', aliases: ['Mount of Olives', 'Olivet'], testament: 'both', region: '예루살렘 동편', lat: 31.7784, lon: 35.2453, certainty: 'confirmed', description: '예수의 가르침·승천과 재림 예언의 산', bibleTags: ['스가랴 14:4', '마태복음 24:3', '누가복음 22:39', '사도행전 1:12'], locationBasis: '예루살렘 동편 능선의 지리적 실체' },
  'place:gethsemane': { canonicalName: '겟세마네', aliases: ['Gethsemane'], testament: 'nt', region: '감람산 기슭', lat: 31.7794, lon: 35.2397, certainty: 'probable', description: '예수가 잡히시기 전 기도한 동산', bibleTags: ['마태복음 26:36-46', '마가복음 14:32'], locationBasis: '기드론 골짜기 건너 감람산 서기슭 전승지' },
  'place:golgotha': { canonicalName: '골고다', aliases: ['Golgotha', 'Calvary', '갈보리'], testament: 'nt', region: '예루살렘 성 밖', lat: 31.7784, lon: 35.2298, certainty: 'disputed', description: '예수가 십자가에 못 박힌 곳', bibleTags: ['마태복음 27:33', '요한복음 19:17-20'], locationBasis: '성묘교회 전승지와 정원 무덤 후보 논쟁' },
  'place:emmaus': { canonicalName: '엠마오', aliases: ['Emmaus'], testament: 'nt', region: '유대 구릉', lat: 31.8390, lon: 34.9890, certainty: 'disputed', description: '부활하신 예수가 두 제자에게 나타난 길의 마을', bibleTags: ['누가복음 24:13-35'], locationBasis: '엠마오 니코폴리스 등 여러 후보 논쟁' },

  // ── NT 사도행전·바울 여정 ────────────────────────────────────────────────────
  'place:tarsus': { canonicalName: '다소', aliases: ['Tarsus'], testament: 'nt', region: '길리기아', lat: 36.9170, lon: 34.8950, certainty: 'confirmed', description: '바울의 고향 도시', bibleTags: ['사도행전 9:11', '사도행전 21:39', '사도행전 22:3'], locationBasis: '터키 타르수스 연속 거주지' },
  'place:salamis': { canonicalName: '살라미', aliases: ['Salamis'], testament: 'nt', region: '구브로(키프로스) 동안', lat: 35.1800, lon: 33.9000, certainty: 'confirmed', description: '바울 1차 여행의 구브로 상륙지', bibleTags: ['사도행전 13:5'], locationBasis: '파마구스타 인근 살라미스 유적' },
  'place:paphos': { canonicalName: '바보', aliases: ['Paphos'], testament: 'nt', region: '구브로(키프로스) 서안', lat: 34.7571, lon: 32.4067, certainty: 'confirmed', description: '총독 서기오 바울이 믿은 구브로 서편 도시', bibleTags: ['사도행전 13:6-12'], locationBasis: '네아 파포스 로마 유적' },
  'place:iconium': { canonicalName: '이고니온', aliases: ['Iconium'], testament: 'nt', region: '갈라디아(리가오니아)', lat: 37.8740, lon: 32.4930, certainty: 'confirmed', description: '바울과 바나바가 전도한 갈라디아 도시', bibleTags: ['사도행전 13:51-14:6', '디모데후서 3:11'], locationBasis: '터키 코니아 연속 거주지' },
  'place:lystra': { canonicalName: '루스드라', aliases: ['Lystra'], testament: 'nt', region: '리가오니아', lat: 37.5800, lon: 32.4500, certainty: 'probable', description: '앉은뱅이 치유와 디모데의 고향', bibleTags: ['사도행전 14:6-20', '사도행전 16:1-2'], locationBasis: '자타 회위윅 인근 비문으로 비정' },
  'place:derbe': { canonicalName: '더베', aliases: ['Derbe'], testament: 'nt', region: '리가오니아', lat: 37.3500, lon: 33.2800, certainty: 'probable', description: '바울 1차 여행의 동쪽 종착 도시', bibleTags: ['사도행전 14:20-21', '사도행전 16:1'], locationBasis: '케르티 회위윅 비문으로 비정' },
  'place:philippi': { canonicalName: '빌립보', aliases: ['Philippi'], testament: 'nt', region: '마케도니아 동부', lat: 41.0134, lon: 24.2870, certainty: 'confirmed', description: '유럽 첫 교회가 세워진 로마 식민 도시', bibleTags: ['사도행전 16:11-40', '빌립보서 1:1'], locationBasis: '필리포이 고고 유적' },
  'place:thessalonica': { canonicalName: '데살로니가', aliases: ['Thessalonica'], testament: 'nt', region: '마케도니아', lat: 40.6401, lon: 22.9444, certainty: 'confirmed', description: '데살로니가 교회가 세워진 마케도니아 수도', bibleTags: ['사도행전 17:1-9', '데살로니가전서 1:1'], locationBasis: '테살로니키 연속 거주지' },
  'place:berea': { canonicalName: '베뢰아', aliases: ['Berea', 'Beroea'], testament: 'nt', region: '마케도니아', lat: 40.5240, lon: 22.2030, certainty: 'confirmed', description: '말씀을 상고한 신사적인 유대인들의 도시', bibleTags: ['사도행전 17:10-15'], locationBasis: '베리아(베로이아) 연속 거주지' },
  'place:athens': { canonicalName: '아덴', aliases: ['Athens', '아테네'], testament: 'nt', region: '아가야(그리스)', lat: 37.9715, lon: 23.7267, certainty: 'confirmed', description: '바울이 아레오바고에서 설교한 철학의 도시', bibleTags: ['사도행전 17:16-34'], locationBasis: '아테네 아크로폴리스·아레오바고' },
  'place:corinth': { canonicalName: '고린도', aliases: ['Corinth'], testament: 'nt', region: '아가야(그리스)', lat: 37.9060, lon: 22.8790, certainty: 'confirmed', description: '바울이 오래 머문 아가야의 상업 도시', bibleTags: ['사도행전 18:1-18', '고린도전서 1:2'], locationBasis: '고대 코린토스 유적·베마' },
  'place:ephesus': { canonicalName: '에베소', aliases: ['Ephesus'], testament: 'nt', region: '아시아(소아시아 서안)', lat: 37.9410, lon: 27.3410, certainty: 'confirmed', description: '아데미 신전의 도시, 바울의 장기 사역지, 계시록 일곱 교회의 하나', bibleTags: ['사도행전 19', '에베소서 1:1', '요한계시록 2:1-7'], locationBasis: '에페소스 대규모 유적' },
  'place:miletus': { canonicalName: '밀레도', aliases: ['Miletus'], testament: 'nt', region: '아시아 서안', lat: 37.5300, lon: 27.2770, certainty: 'confirmed', description: '바울이 에베소 장로들과 고별한 항구', bibleTags: ['사도행전 20:15-38'], locationBasis: '밀레투스 고대 항구 유적' },
  'place:troas': { canonicalName: '드로아', aliases: ['Troas', 'Alexandria Troas'], testament: 'nt', region: '아시아 북서안', lat: 39.7500, lon: 26.1600, certainty: 'confirmed', description: '바울이 마케도니아 환상을 본 항구', bibleTags: ['사도행전 16:8-11', '사도행전 20:5-12'], locationBasis: '알렉산드리아 트로아스 유적' },
  'place:rome': { canonicalName: '로마', aliases: ['Rome'], testament: 'nt', region: '이탈리아', lat: 41.8931, lon: 12.4828, certainty: 'confirmed', description: '제국의 수도이자 바울이 갇혀 복음을 전한 도시', bibleTags: ['사도행전 28:14-31', '로마서 1:7'], locationBasis: '로마 시' },
  'place:patmos': { canonicalName: '밧모섬', aliases: ['Patmos'], testament: 'nt', region: '에게해 도데카니사', lat: 37.3100, lon: 26.5500, certainty: 'confirmed', description: '사도 요한이 계시를 받은 섬', bibleTags: ['요한계시록 1:9'], locationBasis: '그리스 파트모스 섬' },

  // ── 계시록 일곱 교회(에베소 제외) ────────────────────────────────────────────
  'place:smyrna': { canonicalName: '서머나', aliases: ['Smyrna'], testament: 'nt', region: '아시아 서안', lat: 38.4190, lon: 27.1290, certainty: 'confirmed', description: '고난받는 교회로 칭찬받은 도시', bibleTags: ['요한계시록 2:8-11'], locationBasis: '이즈미르 연속 거주지' },
  'place:pergamum': { canonicalName: '버가모', aliases: ['Pergamum', 'Pergamon'], testament: 'nt', region: '아시아 서안', lat: 39.1329, lon: 27.1836, certainty: 'confirmed', description: '사탄의 권좌가 있다고 한 도시', bibleTags: ['요한계시록 2:12-17'], locationBasis: '베르가마 아크로폴리스 유적' },
  'place:thyatira': { canonicalName: '두아디라', aliases: ['Thyatira'], testament: 'nt', region: '아시아 서부', lat: 38.9200, lon: 27.8400, certainty: 'confirmed', description: '자색 옷감 상인 루디아의 고향과 연결된 교회', bibleTags: ['요한계시록 2:18-29', '사도행전 16:14'], locationBasis: '아키사르 유적' },
  'place:sardis': { canonicalName: '사데', aliases: ['Sardis'], testament: 'nt', region: '아시아 서부', lat: 38.4885, lon: 28.0400, certainty: 'confirmed', description: '살았으나 죽은 이름뿐인 교회의 도시', bibleTags: ['요한계시록 3:1-6'], locationBasis: '사르디스 유적·회당' },
  'place:philadelphia-asia': { canonicalName: '빌라델비아', aliases: ['Philadelphia'], testament: 'nt', region: '아시아 서부', lat: 38.3500, lon: 28.5200, certainty: 'confirmed', description: '적은 능력으로도 말씀을 지킨 교회의 도시', bibleTags: ['요한계시록 3:7-13'], locationBasis: '알라셰히르 연속 거주지' },
  'place:laodicea': { canonicalName: '라오디게아', aliases: ['Laodicea'], testament: 'nt', region: '아시아 서부(리쿠스 계곡)', lat: 37.8360, lon: 29.1080, certainty: 'confirmed', description: '차지도 뜨겁지도 않다고 책망받은 부유한 도시', bibleTags: ['요한계시록 3:14-22', '골로새서 4:16'], locationBasis: '라오디케이아 유적' },

  // ── 블레셋 5대 도시 ──────────────────────────────────────────────────────────
  'place:gaza': { canonicalName: '가사', aliases: ['Gaza', 'Azzah'], testament: 'ot', region: '블레셋 해안 평야', lat: 31.5200, lon: 34.4500, certainty: 'confirmed', description: '블레셋 5대 도시 중 최남단, 삼손 최후의 무대', bibleTags: ['사사기 16:21-30', '아모스 1:6-7'], locationBasis: '가자 연속 거주지' },
  'place:ashkelon': { canonicalName: '아스글론', aliases: ['Ashkelon', 'Ascalon'], testament: 'ot', region: '블레셋 해안 평야', lat: 31.6658, lon: 34.5500, certainty: 'confirmed', description: '블레셋 5대 도시의 하나인 항구 도시', bibleTags: ['사사기 14:19', '사무엘하 1:20'], locationBasis: '아슈켈론 발굴' },
  'place:ashdod': { canonicalName: '아스돗', aliases: ['Ashdod', '아소도', 'Azotus'], testament: 'both', region: '블레셋 해안 평야', lat: 31.8000, lon: 34.6500, certainty: 'confirmed', description: '언약궤가 옮겨진 블레셋 도시, 신약의 아소도', bibleTags: ['사무엘상 5:1-7', '사도행전 8:40'], locationBasis: '텔 아스돗 발굴' },
  'place:ekron': { canonicalName: '에그론', aliases: ['Ekron'], testament: 'ot', region: '블레셋 평야', lat: 31.7800, lon: 34.8517, certainty: 'probable', description: '언약궤가 마지막으로 머문 블레셋 도시', bibleTags: ['사무엘상 5:10', '사무엘상 6'], locationBasis: '텔 미크네에서 에크론 비문 출토' },
  'place:gath': { canonicalName: '가드', aliases: ['Gath'], testament: 'ot', region: '블레셋 평야', lat: 31.6997, lon: 34.8478, certainty: 'probable', description: '골리앗의 고향이자 다윗이 피신한 블레셋 도시', bibleTags: ['사무엘상 17:4', '사무엘상 21:10-15', '사무엘상 27'], locationBasis: '텔 에스사피가 유력 후보' },

  // ── 유다·다윗 도피 관련 ─────────────────────────────────────────────────────
  'place:gezer': { canonicalName: '게셀', aliases: ['Gezer'], testament: 'ot', region: '유다 평지', lat: 31.8597, lon: 34.9186, certainty: 'confirmed', description: '솔로몬이 재건한 요새 성읍', bibleTags: ['여호수아 10:33', '열왕기상 9:15-17'], locationBasis: '텔 게제르 발굴·게제르 경계비' },
  'place:adullam': { canonicalName: '아둘람', aliases: ['Adullam'], testament: 'ot', region: '유다 평지', lat: 31.6500, lon: 34.9800, certainty: 'probable', description: '다윗이 도피하여 무리를 모은 굴', bibleTags: ['사무엘상 22:1-2', '사무엘하 23:13'], locationBasis: '키르베트 에시셰이크 마드쿠르 인근' },
  'place:en-gedi': { canonicalName: '엔게디', aliases: ['En-gedi', 'En Gedi'], testament: 'ot', region: '유다 광야(사해 서안)', lat: 31.4614, lon: 35.3925, certainty: 'confirmed', description: '다윗이 사울을 살려준 사해 서편 오아시스', bibleTags: ['사무엘상 24', '아가 1:14'], locationBasis: '엔게디 오아시스·나할 다윗' },
  'place:ziklag': { canonicalName: '시글락', aliases: ['Ziklag'], testament: 'ot', region: '네게브', lat: 31.4000, lon: 34.7000, certainty: 'disputed', description: '아기스가 다윗에게 준 성읍', bibleTags: ['사무엘상 27:6', '사무엘상 30'], locationBasis: '텔 세라·키르베트 아지룩 등 후보 논쟁' },
  'place:nob': { canonicalName: '놉', aliases: ['Nob'], testament: 'ot', region: '예루살렘 북편', lat: 31.7950, lon: 35.2400, certainty: 'disputed', description: '제사장들의 성읍, 다윗이 진설병을 받은 곳', bibleTags: ['사무엘상 21:1-9', '사무엘상 22:9-19'], locationBasis: '예루살렘 북쪽 성읍으로 위치 논쟁' },
  'place:gibeah': { canonicalName: '기브아', aliases: ['Gibeah', '사울의 기브아'], testament: 'ot', region: '베냐민', lat: 31.8236, lon: 35.2320, certainty: 'probable', description: '사울의 고향이자 왕정 초기 수도', bibleTags: ['사사기 19-20', '사무엘상 10:26', '사무엘상 11:4'], locationBasis: '텔 엘풀이 유력 후보' },
  'place:keilah': { canonicalName: '그일라', aliases: ['Keilah'], testament: 'ot', region: '유다 평지', lat: 31.6167, lon: 34.9900, certainty: 'probable', description: '다윗이 블레셋에게서 구원한 성읍', bibleTags: ['사무엘상 23:1-13'], locationBasis: '키르베트 킬라 비정' },
  'place:aphek': { canonicalName: '아벡', aliases: ['Aphek', 'Antipatris(후대)'], testament: 'ot', region: '샤론 평야', lat: 32.1042, lon: 34.9333, certainty: 'confirmed', description: '언약궤를 빼앗긴 블레셋 전투의 진지', bibleTags: ['사무엘상 4:1', '사무엘상 29:1'], locationBasis: '텔 아펙(안티파트리스) 발굴' },

  // ── 요단 동편·북부 ──────────────────────────────────────────────────────────
  'place:dothan': { canonicalName: '도단', aliases: ['Dothan'], testament: 'ot', region: '에브라임 북부', lat: 32.4100, lon: 35.2400, certainty: 'confirmed', description: '요셉이 팔리고 엘리사가 아람 군대를 본 곳', bibleTags: ['창세기 37:17', '열왕기하 6:13-23'], locationBasis: '텔 도탄 발굴' },
  'place:beth-shan': { canonicalName: '벧산', aliases: ['Beth-shean', 'Scythopolis', '벧스안'], testament: 'both', region: '이스르엘·요단 합류부', lat: 32.5000, lon: 35.5000, certainty: 'confirmed', description: '사울의 시신이 걸린 성읍, 신약 데가볼리의 스구도볼리', bibleTags: ['사무엘상 31:10-12', '여호수아 17:11'], locationBasis: '텔 벧산·스키토폴리스 유적' },
  'place:zarephath': { canonicalName: '사르밧', aliases: ['Zarephath', 'Sarepta'], testament: 'both', region: '시돈 영역 해안', lat: 33.2700, lon: 35.2900, certainty: 'confirmed', description: '엘리야와 과부의 기적, 예수의 언급', bibleTags: ['열왕기상 17:8-24', '누가복음 4:26'], locationBasis: '사라판드(레바논) 유적' },
  'place:jabbok': { canonicalName: '얍복강', aliases: ['Jabbok'], testament: 'ot', region: '요단 동편', lat: 32.0300, lon: 35.6200, certainty: 'confirmed', description: '야곱이 씨름한 강', bibleTags: ['창세기 32:22-30'], locationBasis: '나흐르 에즈자르카(요단 동편 지류)' },
  'place:mahanaim': { canonicalName: '마하나임', aliases: ['Mahanaim'], testament: 'ot', region: '요단 동편 길르앗', lat: 32.2000, lon: 35.7000, certainty: 'disputed', description: '야곱이 천사를 만나고 다윗이 압살롬 반란 때 피신한 곳', bibleTags: ['창세기 32:1-2', '사무엘하 17:24-27'], locationBasis: '요단 동편 후보지 논쟁' },
  'place:succoth-jordan': { canonicalName: '숙곳', aliases: ['Succoth'], testament: 'ot', region: '요단 동편', lat: 32.2000, lon: 35.6300, certainty: 'probable', description: '야곱이 장막을 친 곳, 기드온이 벌한 성읍', bibleTags: ['창세기 33:17', '사사기 8:5-16'], locationBasis: '텔 데이르 알라 비정' },
  'place:penuel': { canonicalName: '브니엘', aliases: ['Peniel', 'Penuel'], testament: 'ot', region: '요단 동편', lat: 32.1800, lon: 35.6800, certainty: 'disputed', description: '야곱이 하나님의 얼굴을 본 곳', bibleTags: ['창세기 32:30-31', '사사기 8:8-9'], locationBasis: '얍복 상류 후보지 논쟁' },

  // ── 광야·남방·에돔·이집트 ───────────────────────────────────────────────────
  'place:zoar': { canonicalName: '소알', aliases: ['Zoar', 'Bela'], testament: 'ot', region: '사해 남동부', lat: 31.0300, lon: 35.5000, certainty: 'disputed', description: '롯이 피신한 작은 성읍', bibleTags: ['창세기 19:20-23'], locationBasis: '사해 남부 후보지 논쟁' },
  'place:midian': { canonicalName: '미디안', aliases: ['Midian'], testament: 'ot', region: '북서 아라비아', lat: 28.5000, lon: 35.5000, certainty: 'probable', description: '모세가 도피하여 이드로를 만난 땅', bibleTags: ['출애굽기 2:15-22', '출애굽기 3:1'], locationBasis: '아카바만 동편 미디안 지역' },
  'place:bozrah-edom': { canonicalName: '보스라', qualifiedName: '에돔 보스라', aliases: ['Bozrah'], testament: 'ot', region: '에돔', lat: 30.7350, lon: 35.6000, certainty: 'probable', description: '에돔의 중심 성읍, 심판 예언의 대상', bibleTags: ['이사야 34:6', '이사야 63:1', '아모스 1:12'], locationBasis: '부세이라(요르단) 비정' },
  'place:ezion-geber': { canonicalName: '에시온게벨', aliases: ['Ezion-geber', 'Elath', '엘랏'], testament: 'ot', region: '아카바만 북안', lat: 29.5500, lon: 34.9800, certainty: 'probable', description: '솔로몬의 무역 선단 항구', bibleTags: ['열왕기상 9:26', '민수기 33:35'], locationBasis: '텔 엘켈레이페·아카바 인근' },
  'place:pithom-rameses': { canonicalName: '비돔·라암셋', aliases: ['Pithom', 'Rameses', 'Raamses'], testament: 'ot', region: '이집트 나일 삼각주 동부', lat: 30.8000, lon: 31.8300, certainty: 'probable', description: '이스라엘이 강제 노역으로 지은 국고성', bibleTags: ['출애굽기 1:11', '출애굽기 12:37'], locationBasis: '텔 엘마스쿠타·콴티르(피람세스) 비정' },

  // ── 메소포타미아·아람 ───────────────────────────────────────────────────────
  'place:carchemish': { canonicalName: '갈그미스', aliases: ['Carchemish'], testament: 'ot', region: '유프라테스 상류', lat: 36.8300, lon: 38.0200, certainty: 'confirmed', description: '느부갓네살이 이집트를 격파한 전투지', bibleTags: ['예레미야 46:2', '역대하 35:20'], locationBasis: '카르케미시(제르가모시) 유적' },
  'place:riblah': { canonicalName: '리블라', aliases: ['Riblah'], testament: 'ot', region: '오론테스 강변(하맛 지역)', lat: 34.4600, lon: 36.5500, certainty: 'probable', description: '느부갓네살이 유다 왕들을 심판한 지휘 본부', bibleTags: ['열왕기하 25:6', '열왕기하 25:20-21'], locationBasis: '리블레(시리아) 비정' },
  'place:paddan-aram': { canonicalName: '밧단아람', aliases: ['Paddan-aram', '아람나하라임'], testament: 'ot', region: '상부 메소포타미아', lat: 36.8600, lon: 39.0300, certainty: 'probable', description: '나홀의 성과 야곱이 아내를 맞은 지역', bibleTags: ['창세기 28:2-5', '창세기 29'], locationBasis: '하란 일대 아람 지역' },

  // ── NT 사도행전 여정(추가) ──────────────────────────────────────────────────
  'place:joppa': { canonicalName: '욥바', aliases: ['Joppa', 'Jaffa', '야파'], testament: 'both', region: '지중해 연안', lat: 32.0540, lon: 34.7520, certainty: 'confirmed', description: '요나의 출항지, 베드로의 환상과 다비다 소생', bibleTags: ['요나 1:3', '사도행전 9:36-43', '사도행전 10'], locationBasis: '야파(텔아비브) 옛 항구' },
  'place:lydda': { canonicalName: '룻다', aliases: ['Lydda', 'Lod', '롯'], testament: 'nt', region: '샤론 평야', lat: 31.9515, lon: 34.8953, certainty: 'confirmed', description: '베드로가 애니아를 고친 성읍', bibleTags: ['사도행전 9:32-35'], locationBasis: '로드(리다) 연속 거주지' },
  'place:perga': { canonicalName: '버가', aliases: ['Perga'], testament: 'nt', region: '밤빌리아', lat: 36.9614, lon: 30.8536, certainty: 'confirmed', description: '바울 1차 여행 중 마가 요한이 떠난 도시', bibleTags: ['사도행전 13:13-14', '사도행전 14:25'], locationBasis: '페르게 유적' },
  'place:attalia': { canonicalName: '앗달리아', aliases: ['Attalia', 'Antalya'], testament: 'nt', region: '밤빌리아 해안', lat: 36.8841, lon: 30.7056, certainty: 'confirmed', description: '바울 1차 여행의 귀환 항구', bibleTags: ['사도행전 14:25-26'], locationBasis: '안탈리아 항구' },
  'place:myra': { canonicalName: '무라', aliases: ['Myra'], testament: 'nt', region: '루기아 해안', lat: 36.2589, lon: 29.9850, certainty: 'confirmed', description: '바울이 로마행 알렉산드리아 배로 갈아탄 항구', bibleTags: ['사도행전 27:5-6'], locationBasis: '데므레(무라) 유적' },
  'place:fair-havens': { canonicalName: '미항', aliases: ['Fair Havens', '아름다운 항구', '라새아'], testament: 'nt', region: '그레데(크레타) 남안', lat: 34.9000, lon: 24.9200, certainty: 'probable', description: '바울의 로마 항해 중 정박한 그레데의 항구', bibleTags: ['사도행전 27:8-13'], locationBasis: '크레타 남부 칼로이 리메네스 비정' },
  'place:puteoli': { canonicalName: '보디올', aliases: ['Puteoli', 'Pozzuoli'], testament: 'nt', region: '이탈리아 캄파니아', lat: 40.8230, lon: 14.1210, certainty: 'confirmed', description: '바울이 로마로 가는 길에 형제들을 만난 항구', bibleTags: ['사도행전 28:13-14'], locationBasis: '포추올리 고대 항구' },
  'place:colossae': { canonicalName: '골로새', aliases: ['Colossae'], testament: 'nt', region: '아시아 서부(리쿠스 계곡)', lat: 37.7900, lon: 29.2600, certainty: 'confirmed', description: '골로새서 수신 교회의 도시', bibleTags: ['골로새서 1:2'], locationBasis: '리쿠스 계곡 골로새 텔' },
  'place:hierapolis': { canonicalName: '히에라볼리', aliases: ['Hierapolis'], testament: 'nt', region: '아시아 서부(리쿠스 계곡)', lat: 37.9247, lon: 29.1250, certainty: 'confirmed', description: '골로새·라오디게아와 함께 언급된 도시', bibleTags: ['골로새서 4:13'], locationBasis: '파묵칼레 히에라폴리스 유적' },

  // ── 혼동하기 쉬운 지명(정밀 구별) ────────────────────────────────────────────
  'place:geba': { canonicalName: '게바', aliases: ['Geba', '게바 베냐민'], testament: 'ot', region: '베냐민(믹마스 맞은편)', lat: 31.8580, lon: 35.2800, certainty: 'confirmed', description: '요나단의 전투지이자 유다 북쪽 경계 성읍 — 기브아(Gibeah)와 구별되는 별개의 성읍', bibleTags: ['사무엘상 13:3', '열왕기상 15:22', '스가랴 14:10'], locationBasis: '제바 마을; 기브아(Tell el-Ful)와 다른 곳' },
  'place:ramoth-gilead': { canonicalName: '라못 길르앗', aliases: ['Ramoth-gilead', 'Ramoth in Gilead'], testament: 'ot', region: '요단 동편 길르앗', lat: 32.6000, lon: 35.9000, certainty: 'probable', description: '아람과의 전쟁·아합 전사·예후 기름부음의 무대(라마와 구별)', bibleTags: ['열왕기상 22:1-38', '열왕기하 9:1-14'], locationBasis: '텔 에르루메이트 등 후보; 도피성이자 요새' },
  'place:gerasenes': { canonicalName: '거라사인의 지방', aliases: ['가다라', 'Gerasa', 'Gadara', 'Gergesa', '거라사', '가다라 지방'], testament: 'nt', region: '갈릴리 바다 동편(데가볼리)', lat: 32.7450, lon: 35.6510, certainty: 'disputed', description: '군대 귀신 축출 사건의 지역 — 사본에 따라 거라사·가다라·거게사로 전해짐', bibleTags: ['마가복음 5:1-20', '마태복음 8:28-34', '누가복음 8:26-39'], locationBasis: '쿠르시(게르게사)·움 카이스(가다라)·제라시(거라사) 후보 논쟁' },
  'place:beth-horon': { canonicalName: '벧호론', aliases: ['Beth-horon'], testament: 'ot', region: '에브라임·베냐민 경계 고갯길', lat: 31.8690, lon: 35.1150, certainty: 'confirmed', description: '여호수아가 아모리 연합군을 추격한 전략 고갯길', bibleTags: ['여호수아 10:10-11', '열왕기상 9:17'], locationBasis: '상·하 벧호론(베이트 우르) 연속 지명' },
  'place:michmash': { canonicalName: '믹마스', aliases: ['Michmash', 'Micmash'], testament: 'ot', region: '베냐민', lat: 31.8700, lon: 35.2900, certainty: 'confirmed', description: '요나단이 블레셋 진영을 기습한 협곡 성읍', bibleTags: ['사무엘상 13:23', '사무엘상 14:1-23', '이사야 10:28'], locationBasis: '무크마스 마을·와디 수와이니트 협곡' },
  'place:kiriath-jearim': { canonicalName: '기럇여아림', aliases: ['Kiriath-jearim', '바알라'], testament: 'ot', region: '유다·베냐민 경계', lat: 31.8100, lon: 35.1000, certainty: 'confirmed', description: '언약궤가 20년간 머문 성읍', bibleTags: ['사무엘상 7:1-2', '역대상 13:5-6'], locationBasis: '데이르 엘아자르(아부고쉬 인근)' },
  'place:beth-shemesh': { canonicalName: '벧세메스', qualifiedName: '유다 벧세메스', aliases: ['Beth-shemesh'], testament: 'ot', region: '유다 평지(소렉 골짜기)', lat: 31.7514, lon: 34.9758, certainty: 'confirmed', description: '블레셋에서 돌아온 언약궤가 도착한 제사장 성읍', bibleTags: ['사무엘상 6:9-20', '열왕기하 14:11'], locationBasis: '텔 벧세메스 발굴' },
  'place:elah-valley': { canonicalName: '엘라 골짜기', aliases: ['Valley of Elah', 'Elah'], testament: 'ot', region: '유다 평지', lat: 31.6900, lon: 34.9600, certainty: 'confirmed', description: '다윗과 골리앗의 대결이 벌어진 골짜기', bibleTags: ['사무엘상 17:2', '사무엘상 17:19'], locationBasis: '와디 에스산트(소고-아세가 사이)' },
  'place:socoh': { canonicalName: '소고', aliases: ['Socoh', 'Sochoh'], testament: 'ot', region: '유다 평지', lat: 31.6800, lon: 34.9600, certainty: 'probable', description: '블레셋이 진 친 엘라 골짜기 인근 성읍', bibleTags: ['사무엘상 17:1'], locationBasis: '키르베트 아바드 비정' },
  'place:libnah': { canonicalName: '립나', aliases: ['Libnah'], testament: 'ot', region: '유다 평지', lat: 31.6300, lon: 34.8700, certainty: 'probable', description: '여호수아 정복과 산헤립 전쟁에 등장하는 성읍', bibleTags: ['여호수아 10:29-30', '열왕기하 19:8'], locationBasis: '텔 부르나 등 후보' },
  'place:ziph': { canonicalName: '십', aliases: ['Ziph', '십 광야'], testament: 'ot', region: '유다 광야', lat: 31.4800, lon: 35.1300, certainty: 'probable', description: '다윗이 사울을 피해 숨은 광야, 십 사람들의 밀고', bibleTags: ['사무엘상 23:14-24', '사무엘상 26:1-3'], locationBasis: '텔 지프(헤브론 남동)' },
  'place:maon': { canonicalName: '마온', aliases: ['Maon'], testament: 'ot', region: '유다 광야', lat: 31.4160, lon: 35.1330, certainty: 'probable', description: '다윗의 도피와 나발의 거주지가 있던 광야', bibleTags: ['사무엘상 23:24-25', '사무엘상 25:2'], locationBasis: '텔 마인(카르멜 인근)' },
  'place:en-dor': { canonicalName: '엔돌', aliases: ['En-dor', 'Endor'], testament: 'ot', region: '이스르엘 평원 북편', lat: 32.6300, lon: 35.4000, certainty: 'probable', description: '사울이 신접한 여인을 찾아간 성읍', bibleTags: ['사무엘상 28:7', '시편 83:10'], locationBasis: '엔도르(카르멜 산지 북동) 비정' },
  'place:heshbon': { canonicalName: '헤스본', aliases: ['Heshbon'], testament: 'ot', region: '요단 동편 고원', lat: 31.8000, lon: 35.8100, certainty: 'confirmed', description: '아모리 왕 시혼의 수도', bibleTags: ['민수기 21:25-30', '신명기 2:24-37', '여호수아 13:17'], locationBasis: '텔 헤스반 발굴' },
  'place:dibon': { canonicalName: '디본', aliases: ['Dibon', 'Dibon-gad'], testament: 'ot', region: '모압 고원', lat: 31.5100, lon: 35.7800, certainty: 'confirmed', description: '모압 성읍, 메사 비문(모압 석비)이 발견된 곳', bibleTags: ['민수기 21:30', '민수기 33:45', '이사야 15:2'], locationBasis: '디반(요르단)·모압 석비 출토지' },
  'place:anathoth': { canonicalName: '아나돗', aliases: ['Anathoth'], testament: 'ot', region: '베냐민', lat: 31.8140, lon: 35.2800, certainty: 'probable', description: '예레미야의 고향, 아비아달이 추방된 제사장 성읍', bibleTags: ['예레미야 1:1', '예레미야 32:6-9', '열왕기상 2:26'], locationBasis: '아나타·라스 엘카루베 비정' },

  // ── NT 추가 사역지·여정 ─────────────────────────────────────────────────────
  'place:nain': { canonicalName: '나인', aliases: ['Nain'], testament: 'nt', region: '이스르엘 평원 북편', lat: 32.6360, lon: 35.3490, certainty: 'probable', description: '예수가 과부의 아들을 살린 갈릴리 성읍', bibleTags: ['누가복음 7:11-17'], locationBasis: '네인 마을(모레 산 북서)' },
  'place:arimathea': { canonicalName: '아리마대', aliases: ['Arimathea', '라마다임'], testament: 'nt', region: '유대 구릉', lat: 31.9900, lon: 34.9600, certainty: 'disputed', description: '예수의 시신을 장사한 요셉의 고향', bibleTags: ['마태복음 27:57', '요한복음 19:38'], locationBasis: '라마다임소빔(렌티스) 등과 연결하는 전승; 위치 논쟁' },
  'place:aenon': { canonicalName: '애논', aliases: ['Aenon', '살렘', 'Aenon near Salim'], testament: 'nt', region: '요단 계곡(살렘 인근)', lat: 32.3200, lon: 35.5500, certainty: 'disputed', description: '물이 많아 요한이 세례를 베푼 곳', bibleTags: ['요한복음 3:23'], locationBasis: '벧산 남쪽·세겜 동편 등 후보 논쟁' },
  'place:decapolis': { canonicalName: '데가볼리', aliases: ['Decapolis', '열 성읍'], testament: 'nt', region: '갈릴리·요단 동편 헬라 도시 연맹', lat: 32.5000, lon: 35.9000, certainty: 'confirmed', description: '예수의 명성이 퍼진 열 성읍 지역', bibleTags: ['마가복음 5:20', '마태복음 4:25', '마가복음 7:31'], locationBasis: '가다라·거라사·벧산 등 헬라 도시군' },
  'place:crete': { canonicalName: '그레데', aliases: ['Crete', 'Candia'], testament: 'nt', region: '지중해 섬', lat: 35.2400, lon: 24.8100, certainty: 'confirmed', description: '바울의 로마 항해 경유지, 디도가 교회를 세운 섬', bibleTags: ['사도행전 27:7-13', '디도서 1:5'], locationBasis: '크레타 섬' },
  'place:assos': { canonicalName: '아소스', aliases: ['Assos'], testament: 'nt', region: '아시아 북서 해안', lat: 39.4900, lon: 26.3380, certainty: 'confirmed', description: '바울이 도보 후 배로 합류한 항구', bibleTags: ['사도행전 20:13-14'], locationBasis: '베흐람칼레(아소스) 유적' },
  'place:patara': { canonicalName: '바다라', aliases: ['Patara'], testament: 'nt', region: '루기아 해안', lat: 36.2620, lon: 29.3180, certainty: 'confirmed', description: '바울이 배를 갈아탄 루기아 항구', bibleTags: ['사도행전 21:1-2'], locationBasis: '파타라 유적' },
  'place:rhodes': { canonicalName: '로도', aliases: ['Rhodes'], testament: 'nt', region: '에게해 남동 섬', lat: 36.4340, lon: 28.2170, certainty: 'confirmed', description: '바울의 예루살렘 귀환 항로 경유지', bibleTags: ['사도행전 21:1'], locationBasis: '로도스 섬' },
  'place:syracuse': { canonicalName: '수라구사', aliases: ['Syracuse'], testament: 'nt', region: '시칠리아', lat: 37.0755, lon: 15.2866, certainty: 'confirmed', description: '바울이 로마로 가는 길에 사흘 머문 항구', bibleTags: ['사도행전 28:12'], locationBasis: '시라쿠사(시칠리아) 항구' },
  'place:rhegium': { canonicalName: '레기온', aliases: ['Rhegium'], testament: 'nt', region: '이탈리아 남단', lat: 38.1100, lon: 15.6500, certainty: 'confirmed', description: '보디올로 향하던 바울의 경유 항구', bibleTags: ['사도행전 28:13'], locationBasis: '레조 칼라브리아' },
};

function normalizePlaceName(value) {
  return String(value || '').trim().toLocaleLowerCase().replace(/\s+/g, ' ');
}

function toPlaceResult(id, place) {
  return {
    id,
    wikidataId: id,
    label: place.qualifiedName || place.canonicalName,
    name: place.qualifiedName || place.canonicalName,
    canonicalName: place.canonicalName,
    ...place,
    source: '성경 본문 + 프로젝트 성경 지명 식별 자료',
    verified: true,
  };
}

function matchesTestamentFilter(place, testament) {
  return testament === 'all' || place.testament === 'both' || place.testament === testament;
}

export function searchStaticBiblicalPlaces(query, testament = 'all') {
  const normalized = normalizePlaceName(query);
  if (!normalized) return [];
  return Object.entries(BIBLICAL_PLACE_PROFILES)
    .filter(([, place]) => (
      normalizePlaceName(place.canonicalName).includes(normalized)
      || normalizePlaceName(place.qualifiedName).includes(normalized)
      || place.aliases.some((alias) => normalizePlaceName(alias).includes(normalized))
    ))
    .filter(([, place]) => matchesTestamentFilter(place, testament))
    .map(([id, place]) => toPlaceResult(id, place));
}

// 일괄 배치용: 이름 또는 성경 본문(책 이름) 기준으로 지명을 모아 반환한다.
// 예) '여호수아' → 여호수아에 등장하는 모든 지명, '블레셋'·'갈릴리' 등 지역/별칭도 매칭.
export function getPlacesByReference(query, testament = 'all') {
  const normalized = normalizePlaceName(query);
  if (!normalized) return [];
  return Object.entries(BIBLICAL_PLACE_PROFILES)
    .filter(([, place]) => (
      normalizePlaceName(place.canonicalName).includes(normalized)
      || normalizePlaceName(place.qualifiedName).includes(normalized)
      || normalizePlaceName(place.region).includes(normalized)
      || place.aliases.some((alias) => normalizePlaceName(alias).includes(normalized))
      || (place.bibleTags || []).some((tag) => normalizePlaceName(tag).includes(normalized))
    ))
    .filter(([, place]) => matchesTestamentFilter(place, testament))
    .map(([id, place]) => toPlaceResult(id, place));
}

// 전체 지명(선택적 구약/신약 필터) — 일괄 추가/맵 렌더용.
export function getAllBiblicalPlaces(testament = 'all') {
  return Object.entries(BIBLICAL_PLACE_PROFILES)
    .filter(([, place]) => matchesTestamentFilter(place, testament))
    .map(([id, place]) => toPlaceResult(id, place));
}

/**
 * Wikidata QID로 성경 본문 태그 배열 반환.
 * 매핑 없으면 빈 배열.
 */
export function getBibleTags(wikidataId) {
  return BIBLE_REFS[wikidataId] || BIBLICAL_PLACE_PROFILES[wikidataId]?.bibleTags || [];
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
