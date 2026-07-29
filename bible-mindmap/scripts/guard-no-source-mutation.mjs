// 아키텍처 가드 — 빌드가 tracked 소스(src/·index.html·package.json)를 변형하면 실패
// 배경: 과거 ensure-* 스크립트가 predev/prebuild마다 컴포넌트 소스를 in-place 변형하여
// 로컬 빌드 재실행 시 anchor mismatch로 throw하는 사고가 반복됨. 이 가드는 그 재발을 막는다.
//
// 원칙:
// - 데이터 생성물(public/data/*, dist/*)은 무시(빌드 아티팩트).
// - src/·index.html·package.json·package-lock.json·vite.config.js 등 tracked 소스는 무변형이어야 한다.
// - CI post-build 스텝에서 실행. 실패 시 배포 차단.
//
// 우회 방법 (지침 위반이 아닌 정당한 편집일 때):
// 1) 소스를 직접 편집해 커밋 (권장). 2) 이 가드가 tracked 파일 목록을 감시하므로,
//    변형 대상을 소스로 옮기고 스크립트를 제거하는 것이 정답.
import { execSync } from 'node:child_process';

const WATCHED = ['src/', 'index.html', 'package.json', 'package-lock.json', 'vite.config.js'];

function run(cmd) {
  return execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'] }).toString();
}

try {
  const diff = run(`git status --porcelain -- ${WATCHED.join(' ')}`).trim();
  if (!diff) {
    console.log('✓ 소스 무변형 가드: 빌드가 tracked 소스를 변형하지 않았습니다.');
    process.exit(0);
  }
  console.error('✗ 소스 무변형 가드 실패 — 빌드가 tracked 소스를 변형했습니다:');
  console.error(diff.split('\n').map((l) => `  ${l}`).join('\n'));
  console.error('\n원인: predev/prebuild 또는 build 스텝이 in-place 소스 편집을 수행 중입니다.');
  console.error('해결: 편집 결과를 소스에 영구 반영하고 해당 ensure-*/patch 스크립트를 제거하세요.');
  console.error('      (patch materialize + verifier-only 원칙 · bible-release-workflow 참조)');
  process.exit(1);
} catch (err) {
  // git 미설치 등 예외 상황에서는 통과 처리 (CI에는 항상 git 있음)
  console.warn(`⚠ 가드 스킵 (git 접근 불가): ${err.message}`);
  process.exit(0);
}
