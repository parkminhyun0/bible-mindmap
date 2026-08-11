// 중첩된 HTML/스크립트 태그도 안전하게 제거한다. 단일 `.replace(/<[^>]*>/g, '')`는
// `<scr<script>ipt>` 같은 입력에서 한 번 제거 후에도 `<script>`가 남아 CodeQL
// js/incomplete-multi-character-sanitization 로 flag되므로, 결과가 안정될 때까지
// 반복 적용해 잔여 태그가 없음을 보장한다.
export function stripHtmlTags(value) {
  let current = String(value ?? '');
  let previous;
  do {
    previous = current;
    current = current.replace(/<[^>]*>/g, '');
  } while (current !== previous);
  return current;
}
