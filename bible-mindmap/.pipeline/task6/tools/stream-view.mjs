// stream-json NDJSON → 사람이 읽는 한 줄 로그.
// agy(Antigravity)의 event/step_update 형식과 Claude Code의 type/message.content 형식을 모두 받는다.
import readline from 'node:readline';

const label = process.argv[2] || '';
const t0 = Date.now();
const clock = () => {
  const s = Math.floor((Date.now() - t0) / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};
const cut = (s, n = 150) => {
  const one = String(s).replace(/\s+/g, ' ').trim();
  return one.length > n ? `${one.slice(0, n)}…` : one;
};
const say = (icon, msg) => console.log(`[${clock()}] ${label} ${icon} ${msg}`);

let tools = 0;
let textChars = 0;
const rl = readline.createInterface({ input: process.stdin, terminal: false });

function firstString(obj, keys) {
  for (const k of keys) {
    const v = obj?.[k];
    if (typeof v === 'string' && v.trim()) return v;
  }
  return '';
}

rl.on('line', (line) => {
  const raw = line.trim();
  if (!raw) return;
  if (!raw.startsWith('{')) {
    say('·', cut(raw));
    return;
  }
  let ev;
  try {
    ev = JSON.parse(raw);
  } catch {
    say('·', cut(raw));
    return;
  }

  // --- agy 형식 ---
  if (ev.event) {
    if (ev.event === 'init') {
      say('▶', `시작 · model=${ev.init?.model || '?'}`);
      return;
    }
    if (ev.event === 'result') {
      const r = ev.result || {};
      say('✅', cut(firstString(r, ['text', 'response', 'summary']) || `완료 (출력 ${textChars}자, 도구 ${tools}회)`));
      return;
    }
    if (ev.event === 'step_update') {
      const su = ev.step_update || {};
      if (su.state && su.state !== 'DONE' && su.state !== 'RUNNING') return;
      const type = su.step_type || 'step';
      if (type === 'agent_response') {
        const txt = su.text_delta || '';
        textChars += txt.length;
        if (txt.trim()) say('💬', cut(txt));
        return;
      }
      if (type === 'user_input' || type === 'checkpoint') return;
      tools += 1;
      const name = firstString(su, ['tool_name', 'name', 'command', 'title']) || type;
      const hint = firstString(su, ['file_path', 'path', 'command', 'query', 'text_delta']);
      say('🔧', `#${tools} ${name}${hint ? ` · ${cut(hint, 80)}` : ''}`);
      return;
    }
    say('·', cut(ev.event));
    return;
  }

  // --- Claude Code 형식 ---
  const blocks = ev?.message?.content ?? ev?.content ?? [];
  const list = Array.isArray(blocks) ? blocks : [blocks];
  for (const b of list) {
    if (!b || typeof b !== 'object') continue;
    if (b.type === 'text' && b.text?.trim()) {
      textChars += b.text.length;
      say('💬', cut(b.text));
    } else if (b.type === 'tool_use') {
      tools += 1;
      const inp = b.input || {};
      const hint = firstString(inp, ['file_path', 'path', 'command', 'pattern', 'description']);
      say('🔧', `#${tools} ${b.name || 'tool'}${hint ? ` · ${cut(hint, 80)}` : ''}`);
    }
  }
  if (ev.type === 'result') {
    say(ev.is_error ? '❌' : '✅', cut(ev.result ?? ev.subtype ?? 'done'));
  }
});

rl.on('close', () => say('—', `스트림 종료 (도구 ${tools}회, 출력 ${textChars}자)`));
