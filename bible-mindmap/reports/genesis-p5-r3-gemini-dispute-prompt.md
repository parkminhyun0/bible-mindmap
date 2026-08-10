# Genesis P5 R3 — 독립 Dispute Review 요청 (Gemini)

> **자비스 → 박 목사님 → Gemini** 순으로 전달.
> 자비스는 Gemini CLI를 직접 호출하지 않는다 (see `memory/feedback_gemini_cli_use.md`).
> 이 파일을 Gemini에 붙여 넣고, 함께 있는 `genesis-p5-r3-gemini-input.json` 데이터를 참조하도록 지시하십시오.

당신(Gemini)은 히브리어 성경 사전(BDB 기반) 한국어 후보 번역에 대한 **독립적 dispute reviewer**입니다.
Claude가 이 5건을 이미 PASS 판정했습니다(수정 반영된 H46 포함). 당신의 임무는 Claude 결론에 얽매이지 말고 **독립적으로 재검증**하여 잘못이나 개선 여지를 찾는 것입니다. 오히려 반박(refute)에 무게를 두세요.

## 참고 자료
- 대상 데이터: `bible-mindmap/reports/genesis-p5-r3-gemini-input.json` (5 units, 41 pairs)
- 이전 Claude 감사 결과: `bible-mindmap/reports/genesis-p5-claude-audit-results.json` (rechecked H46: `bible-mindmap/reports/genesis-p5-claude-audit-recheck-h4325-h46.json`)
- 후보 원본: `bible-mindmap/data/lexicon/candidates/genesis-p5/*.json`

## 대상: R3 5 units (theological-sensitive)
| Strong | Lemma | 한글 | tier | pairs |
|---|---|---|---|---|
| H430 | אֱלֹהִים | 엘로힘 | R3 | 13 |
| H1254a | בָּרָא | 바라 | R3 | 9 |
| H3117 | יוֹם | 욤 | R3 | 8 |
| H7307 | רוּחַ | 루아흐 | R3 | 10 |
| H46 | אָבִיר | 아비르 (REVISE 반영본) | R3 | 1 |

## 필수 검사 5축
각 unit마다 아래 5축을 판정하세요:

1. **source-fidelity**: BDB 원문의 sense·gloss·라벨(예: `Qal`/`Niph`/`Piel`, `sg`/`pl`, `opp. X`, `prob.`, `alw.`)이 KO에 손실 없이 반영되는가?
2. **sense-boundary**: 상위 sense와 하위 sub-sense 경계가 훼손되지 않았는가? 계층 구조 유지?
3. **theological-overreach**: 사전 정의 범위를 초과한 신학적 해석(삼위일체, 성령론, creatio ex nihilo, 종말론, 원죄론 등)이 삽입되지 않았는가?
4. **morphology-strong-separation**: 이형태소/동철이의어(예: H46 sheva vs H47 patach, H1254a Qal-창조 vs Piel-베어냄, H3117 세속적 날 vs 여호와의 날) 구분이 명확한가?
5. **uncertainty-expression**: BDB가 `prob.`, `wholly dub.`, `?`, `old name of God (poet.)` 등 불확실성/문체 제약을 표시한 곳에서 KO가 그 유보성을 보존하는가?

## 판정
각 unit마다: **PASS / REVISE / DISPUTE**
- `PASS`: 5축 모두 통과, Approval Registry로 승격 가능
- `REVISE`: 문구·표기 수정 필요, 사전 승격 전 수정 요구
- `DISPUTE`: 근본적 오역·과잉해석 또는 명확한 오류, Gemini와 Claude의 판정이 상충함

## 출력 형식 (JSON only, 코드펜스 없이 순수 JSON)

```json
{
  "reviewerRole": "gemini-independent-dispute-reviewer",
  "reviewerModel": "<gemini model id, 예: gemini-2.5-pro>",
  "reviewedAt": "<ISO8601>",
  "targetBaseline": {
    "mainSha": "f51c8c14daf8845fd9a86fdce9f7be0d455c93d0",
    "claudeEvidencePR": 296,
    "claudeRevisePR": 297,
    "manifestBundleFingerprint": "sha256:a9ebdc22e34659332b84ced41118597feae70f18a742e8a5234968e902c9d261"
  },
  "verdicts": [
    {
      "strong": "H430",
      "lemma": "אֱלֹהִים",
      "tier": "R3",
      "verdict": "PASS|REVISE|DISPUTE",
      "checks": {
        "sourceFidelity":           "PASS|REVISE|DISPUTE — <근거 한 문장>",
        "senseBoundary":            "PASS|REVISE|DISPUTE — <근거 한 문장>",
        "theologicalOverreach":     "PASS|REVISE|DISPUTE — <근거 한 문장>",
        "morphologyStrongSeparation": "PASS|REVISE|DISPUTE — <근거 한 문장>",
        "uncertaintyExpression":    "PASS|REVISE|DISPUTE — <근거 한 문장>"
      },
      "disputeWithClaude": "AGREE|DISAGREE — <상충하면 이유>",
      "evidenceQuotes":   ["<원문 대응 한국어 인용 1~3개>"],
      "suggestedRevision": null
    }
    // ... H1254a, H3117, H7307, H46 (총 5개 항목)
  ],
  "governance": {
    "auditOnly": true,
    "candidateWritten": false,
    "approvalRegistryWritten": false,
    "serviceUiWritten": false,
    "productionWritten": false
  }
}
```

## 절대 금지
- 후보 파일(`bible-mindmap/data/lexicon/candidates/genesis-p5/*.json`) 수정
- Approval Registry(`bible-mindmap/data/lexicon/approval-registry.json`) 수정
- UI/service surface 코드 수정
- Production/deploy 트리거
- verifier 완화, Gate 우회

**Gemini는 오직 판정 evidence만 생성**하고, 실제 저장·PR·배포는 이후 자비스가 처리합니다.
