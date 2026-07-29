// 배포 반영 확인 장치 (매 작업 후 실행)
// 라이브 GitHub Pages 의 version.json 을 받아 로컬 git HEAD 와 대조한다.
// 일치 → 최신 배포 반영됨. 불일치 → 라이브가 아직 옛 빌드(CI 진행 중/실패 가능).
import { execSync } from 'node:child_process';

const LIVE = 'https://parkminhyun0.github.io/bible-mindmap/app/version.json';

function localHead() {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString().trim();
  } catch {
    return null;
  }
}

async function main() {
  const local = localHead();
  let live;
  try {
    const res = await fetch(`${LIVE}?_=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    live = await res.json();
  } catch (err) {
    console.error(`✗ 라이브 version.json 조회 실패: ${err.message}`);
    console.error('  (배포 직후라면 CDN 전파에 1~2분 걸릴 수 있음)');
    process.exit(2);
  }

  console.log('로컬 HEAD :', local || '(git 없음)');
  console.log('라이브    :', live.commit, '| 빌드시각', live.buildTime);
  console.log('캐시 세대 :', live.htmlCache, '/', live.chunkCache);

  if (local && live.commit && local === live.commit) {
    console.log('\n✓ 라이브가 최신 커밋과 일치 — 개선 내용이 배포 반영됨.');
    process.exit(0);
  }
  console.log('\n✗ 라이브가 로컬 HEAD와 불일치 — 아직 옛 빌드가 서빙 중.');
  console.log('  → GitHub Actions "Deploy to GitHub Pages" 성공 여부 확인 (gh run list).');
  process.exit(1);
}

main();
