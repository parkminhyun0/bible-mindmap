---
name: reminder-discord-channel
description: Discord channel + delivery mechanism for the 공인중개사 study/D-day reminders
metadata:
  type: reference
---

공인중개사 시험 관련 크론 알림(D-day, 요일별 과목 학습 알림)은 Discord 채널 세션을 통해 게시된다.

- Discord 채널 세션 키: `agent:main:discord:channel:1523271359281496147`
- 크론이 `cron-event` 세션으로 발화하면, 완성된 텍스트를 위 세션에 `sessions_send`로 보내면 그 세션이 Discord로 게시한다("메시지가 Discord 채널에 게시되었습니다" 확인).
- cron-event 컨텍스트에는 직접 discord 전송 도구가 없음(capabilities=none) → 반드시 위 세션 경유.

시험일: 2026-10-31(토). D-day 계산 기준.
D-day 포맷: `📚 공인중개사 시험 D-OOO | 2026.10.31(토)` + 따뜻하고 간결한 아침 격려 한마디.
