#!/usr/bin/env python3
"""extract-sp-verses.py — Samaritan Pentateuch (DT-UCPH TF 4.1.3) → verse-indexed JSON
사용: python3 scripts/extract-sp-verses.py
출력: .oshb-cache/sp-verses.json  {"Gen": {"1": {"1": "hebrew consonantal text", ...}, ...}, ...}

근거:
- DT-UCPH SP dataset (CC BY-NC 4.0 · MS Chester Beatty 751 + MS Garizim 1)
- Christian Canu Højgaard, Martijn Naaijer, & Stefan Schorch. (2023)
- Text-Fabric API: use('dt-ucph/sp')
- 참고: Stefan Schorch (ed.), The Samaritan Pentateuch: A critical editio maior. Berlin: de Gruyter, 2018-
"""

import json
import os
import sys
from pathlib import Path

# 프로젝트 루트 (스크립트의 상위 디렉토리)
ROOT = Path(__file__).resolve().parent.parent
OUT_PATH = ROOT / '.oshb-cache' / 'sp-verses.json'

# TF SP 데이터셋 로드 (자동 다운로드 · 캐시됨)
print('[SP] text-fabric 로드 중 (첫 실행은 다운로드 · 이후 캐시)...')
from tf.app import use
A = use('dt-ucph/sp:hot', hoist=globals(), silent='terse')

# STEPBible 표준 책 ID 매핑
BOOK_MAP = {
    'Genesis':     'Gen',
    'Exodus':      'Exod',
    'Leviticus':   'Lev',
    'Numbers':     'Num',
    'Deuteronomy': 'Deut',
}

# 결과 축적: {bookId: {chapter: {verse: "hebrew text"}}}
result = {v: {} for v in BOOK_MAP.values()}

verse_nodes = F.otype.s('verse')
print(f'[SP] verse 노드 총 {len(verse_nodes)}개 처리 시작...')

for i, vnode in enumerate(verse_nodes):
    if i % 1000 == 0 and i > 0:
        print(f'  {i}/{len(verse_nodes)}...')
    book_full = T.sectionFromNode(vnode)[0]
    book_id = BOOK_MAP.get(book_full)
    if not book_id:
        continue
    ch = T.sectionFromNode(vnode)[1]
    v  = T.sectionFromNode(vnode)[2]
    words = L.d(vnode, otype='word')
    # g_cons_utf8 = 자음 형태 UTF-8 (모음·악센트 제외) — MT와 비교 시 자음 대조 위해 사용
    text = ' '.join(F.g_cons_utf8.v(w) or '' for w in words).strip()
    if not text:
        continue
    result[book_id].setdefault(str(ch), {})[str(v)] = text

# 통계
print()
print('[SP] 추출 완료:')
total_verses = 0
for b, chs in result.items():
    n_verses = sum(len(vs) for vs in chs.values())
    total_verses += n_verses
    print(f'  {b}: {len(chs)} 장 · {n_verses} 절')
print(f'  총 절: {total_verses}')

# JSON 저장
OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
with open(OUT_PATH, 'w', encoding='utf-8') as f:
    json.dump(result, f, ensure_ascii=False, separators=(',', ':'))

size_kb = os.path.getsize(OUT_PATH) / 1024
print(f'\n✅ 저장: {OUT_PATH} ({size_kb:.0f} KB)')
