// 공식 링크 허브(src/data/links.json)의 모든 외부 링크 접속 확인
//   npm run links
// - 2xx/3xx: 정상 · 403/429: 봇 차단(대개 정상, 브라우저로 직접 확인) · 그 외/타임아웃: 확인 필요
import { readFileSync } from 'node:fs';

const data = JSON.parse(readFileSync(new URL('../src/data/links.json', import.meta.url), 'utf8'));
const links = [...new Map(data.sections.flatMap((s) => s.links).map((l) => [l.url, l])).values()];
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

async function check(l) {
  try {
    const res = await fetch(l.url, { redirect: 'follow', headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(15000) });
    const moved = new URL(res.url).hostname !== new URL(l.url).hostname;
    return { ...l, status: res.status, final: res.url, moved };
  } catch (e) {
    return { ...l, status: 0, error: e.name === 'TimeoutError' ? '타임아웃' : e.message };
  }
}

const results = await Promise.all(links.map(check));
let bad = 0;
for (const r of results) {
  const ok = r.status >= 200 && r.status < 400;
  const blocked = r.status === 403 || r.status === 429;
  const mark = ok ? (r.moved ? '▲' : '✓') : blocked ? '?' : '✖';
  if (!ok && !blocked) bad++;
  const extra = r.error ?? (r.moved ? `→ 도메인 변경됨: ${r.final}` : '');
  console.log(`${mark} ${String(r.status).padEnd(3)} ${r.name.padEnd(14)} ${r.url} ${extra}`);
}
console.log(`\n링크 ${results.length}개 · 확인 필요 ${bad}개  (? = 봇 차단, ▲ = 다른 도메인으로 이동 — 브라우저로 직접 확인)`);
console.log(`마지막 확인일(checked): ${data.checked} — 점검 후 src/data/links.json 의 checked 를 오늘 날짜로 갱신하세요.`);
process.exit(bad ? 1 : 0);
