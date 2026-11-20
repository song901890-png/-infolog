// 매일 1편 자동 발행 — 작성 → OG 이미지 → 빌드·SEO 점검 → git commit/push
//   npm run daily                      오늘(KST) 글이 없으면 Claude 가 1편 작성 후 발행
//   npm run daily -- --date 2026-11-21 해당 날짜 글을 미리 작성(예약)
//   npm run daily -- --no-push         커밋까지만 하고 push 하지 않음
//
// - 해당 날짜에 발행 글이 이미 있으면 새로 쓰지 않습니다 (하루 딱 1편).
// - 빌드·SEO 점검이 실패하면 새 글을 .daily-failed/ 로 옮기고 배포하지 않습니다.
// - push 하면 GitHub 에 연결된 Cloudflare Pages 가 자동으로 다시 빌드·배포합니다.
// - 작성 지침: scripts/daily-post-prompt.md / 실행 기록: logs/daily-YYYY-MM.log
import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const BLOG = join(ROOT, 'src/content/blog');
const args = process.argv.slice(2);
const noPush = args.includes('--no-push');
const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
const date = args.includes('--date') ? args[args.indexOf('--date') + 1] : kstNow.toISOString().slice(0, 10);
if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? '')) {
  console.error('--date 는 YYYY-MM-DD 형식이어야 합니다.');
  process.exit(1);
}

mkdirSync(join(ROOT, 'logs'), { recursive: true });
const logFile = join(ROOT, 'logs', `daily-${kstNow.toISOString().slice(0, 7)}.log`);
const log = (msg) => {
  const line = `[${kstNow.toISOString().slice(0, 10)} ${new Date().toLocaleTimeString('ko-KR', { hour12: false })}] ${msg}`;
  console.log(line);
  appendFileSync(logFile, line + '\n', 'utf8');
};
const run = (cmd, opts = {}) => {
  const r = spawnSync(cmd, { cwd: ROOT, shell: true, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...opts });
  return { ok: r.status === 0, out: `${r.stdout ?? ''}${r.stderr ?? ''}`.trim() };
};
const fail = (msg) => {
  log(`✖ ${msg}`);
  process.exit(1);
};

/** 발행 대상 글(draft 아님) 목록: { file, slug, date, category } */
const posts = () =>
  readdirSync(BLOG)
    .filter((f) => /\.mdx?$/.test(f))
    .map((file) => {
      const fm = readFileSync(join(BLOG, file), 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
      return {
        file,
        slug: file.replace(/\.mdx?$/, ''),
        date: fm.match(/^pubDate:\s*["']?(\d{4}-\d{2}-\d{2})/m)?.[1],
        category: fm.match(/^category:\s*["']?([a-z]+)/m)?.[1],
        draft: /^draft:\s*true\s*$/m.test(fm),
      };
    })
    .filter((p) => !p.draft);

/** 금요일은 주간 이슈, 그 외에는 스포츠 → 링크모음 → 웹툰 → OTT → 애니·웹소설 → 보안 순환 */
function nextCategory(all) {
  if (new Date(`${date}T00:00:00Z`).getUTCDay() === 5) return 'weekly';
  const cycle = ['sports', 'guide', 'webtoon', 'ott', 'anime', 'security'];
  const last = all
    .filter((p) => p.date < date && cycle.includes(p.category))
    .sort((a, b) => a.date.localeCompare(b.date))
    .at(-1);
  return cycle[(cycle.indexOf(last?.category) + 1) % cycle.length];
}

log(`── 발행 시작 (대상 날짜 ${date}) ──`);
const before = posts();
let created = before.filter((p) => p.date === date);
if (created.length > 1) fail(`${date} 에 글이 이미 ${created.length}편 있습니다: ${created.map((p) => p.file).join(', ')}`);

if (created.length === 1) {
  log(`이미 ${date} 글이 있습니다 (${created[0].file}) → 새로 쓰지 않습니다.`);
} else {
  const category = nextCategory(before);
  log(`${date} 글 없음 → Claude 로 작성 (카테고리: ${category})`);
  const prompt = `Read scripts/daily-post-prompt.md and follow it exactly. DATE=${date} CATEGORY=${category}`;
  const r = run(
    `claude -p "${prompt}" --permission-mode acceptEdits --allowedTools "Read,Glob,Grep,Write,Edit,WebSearch,WebFetch"`,
    { timeout: 30 * 60 * 1000 },
  );
  log(`Claude 출력: ${r.out.split('\n').slice(-3).join(' / ') || '(없음)'}`);
  const known = new Set(before.map((p) => p.file));
  created = posts().filter((p) => !known.has(p.file));
  if (created.length !== 1) fail(`새 글이 정확히 1편이어야 하는데 ${created.length}편입니다.`);
  const [p] = created;
  if (p.date !== date || p.category !== category || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.slug)) {
    renameFailed(p);
    fail(`새 글 형식 오류 (${p.file}: pubDate ${p.date}, category ${p.category})`);
  }
  log(`✓ 작성 완료: ${p.file}`);
}

function renameFailed(p) {
  mkdirSync(join(ROOT, '.daily-failed'), { recursive: true });
  renameSync(join(BLOG, p.file), join(ROOT, '.daily-failed', `${date}-${p.file}`));
  log(`새 글을 .daily-failed/${date}-${p.file} 로 옮겼습니다.`);
}

const post = created[0];
const isNew = !before.some((p) => p.file === post.file);

const img = run('npm run images');
if (!img.ok) log(`▲ OG 이미지 생성 실패: ${img.out.split('\n').at(-1)}`);

const build = run('npm run build');
if (!build.ok) {
  log(build.out.split('\n').filter((l) => /✖|error/i.test(l)).slice(0, 10).join('\n') || build.out.slice(-800));
  if (isNew) renameFailed(post);
  fail('빌드·SEO 점검 실패 → 배포하지 않습니다.');
}
log('✓ 빌드·SEO 점검 통과');

if (!existsSync(join(ROOT, '.git'))) {
  log('▲ git 저장소가 아니어서 커밋·배포를 건너뜁니다.');
  process.exit(0);
}
run(`git add -- "src/content/blog/${post.file}" "public/og/${post.slug}.png" public/og-default.png`);
if (run('git diff --cached --quiet').ok) {
  log('커밋할 변경이 없습니다.');
} else {
  const c = run(`git commit -m "post: ${post.slug} (${post.date})"`);
  if (!c.ok) fail(`git commit 실패: ${c.out.split('\n').at(-1)}`);
  log(`✓ 커밋: post: ${post.slug} (${post.date})`);
}
if (noPush) log('--no-push: push 를 건너뜁니다.');
else if (!run('git remote get-url origin').ok) log('▲ origin 원격 저장소가 없어 push 를 건너뜁니다.');
else {
  const p = run('git push origin HEAD', { timeout: 5 * 60 * 1000 });
  if (!p.ok) fail(`git push 실패: ${p.out.split('\n').at(-1)}`);
  log('✓ push 완료 → Cloudflare Pages 가 자동 배포합니다.');
}
log('── 발행 끝 ──');
