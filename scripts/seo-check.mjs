// 빌드 결과물(dist/) SEO 자동 점검 — `npm run build` 마지막 단계에서 실행됩니다.
//   ✖ 오류(error)  : 빌드 실패 처리 (배포 차단)  — 깨진 링크, H1 누락, OG 이미지 없음 등
//   ▲ 경고(warn)   : 빌드는 통과, 개선 권장       — 제목/설명 길이, 내부 링크 부족 등
// 단독 실행: node scripts/seo-check.mjs
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const SITE = 'https://infolog.site';

if (!existsSync(DIST)) {
  console.error('dist/ 가 없습니다. 먼저 astro build 를 실행하세요.');
  process.exit(1);
}

// ── 유틸 ───────────────────────────────────────────────
const walk = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
const decode = (s) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
const attr = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`, 'i'))?.[1];
const meta = (html, key) => {
  for (const m of html.matchAll(/<meta\s[^>]*>/gi)) {
    const t = m[0];
    if (attr(t, 'name') === key || attr(t, 'property') === key) return decode(attr(t, 'content') ?? '');
  }
  return undefined;
};
const text = (s) => decode(s.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
/** 검색결과 표시 폭 추정: 한글 1, 영문/숫자 0.55 */
const width = (s) => [...s].reduce((w, ch) => w + (/[ᄀ-ᇿ　-鿿가-힯＀-￯]/.test(ch) ? 1 : 0.55), 0);

/** URL 경로 → dist 파일 존재 여부 */
const exists = (path) => {
  const clean = decodeURIComponent(path.split(/[?#]/)[0]);
  if (!clean || clean === '/') return existsSync(join(DIST, 'index.html'));
  const p = join(DIST, clean);
  return (existsSync(p) && statSync(p).isFile()) || existsSync(join(p, 'index.html'));
};

// ── 사이트맵 ────────────────────────────────────────────
const sitemapUrls = new Set(
  readdirSync(DIST)
    .filter((f) => /^sitemap-\d+\.xml$/.test(f))
    .flatMap((f) => [...readFileSync(join(DIST, f), 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])),
);

// ── 페이지별 점검 ───────────────────────────────────────
const results = [];
const titles = new Map();
const descriptions = new Map();
const htmlFiles = walk(DIST).filter((f) => f.endsWith('.html'));

for (const file of htmlFiles) {
  const rel = relative(DIST, file).split(sep).join('/');
  const path = '/' + rel.replace(/index\.html$/, '').replace(/\.html$/, '/');
  const html = readFileSync(file, 'utf8');
  const errors = [];
  const warns = [];
  const is404 = rel === '404.html';
  const robots = meta(html, 'robots') ?? '';
  const noindex = /noindex/.test(robots);
  const isPost = /"@type":"BlogPosting"/.test(html);

  // <html lang>
  if (!/<html[^>]*\slang="[^"]+"/.test(html)) errors.push('<html lang> 누락');

  // title
  const title = text(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? '');
  if (!title) errors.push('<title> 누락');
  else {
    if (width(title) > 40) warns.push(`title 이 깁니다 (표시폭 ${width(title).toFixed(0)} > 40, 검색결과에서 잘릴 수 있음): ${title}`);
    if (!noindex) titles.set(title, [...(titles.get(title) ?? []), path]);
  }

  // description
  const desc = meta(html, 'description');
  if (!desc) errors.push('meta description 누락');
  else {
    if (!noindex && desc.length < 40) warns.push(`description 이 짧습니다 (${desc.length}자 < 40)`);
    if (desc.length > 160) warns.push(`description 이 깁니다 (${desc.length}자 > 160)`);
    if (!noindex) descriptions.set(desc, [...(descriptions.get(desc) ?? []), path]);
  }

  // canonical
  const canonical = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i)?.[1];
  if (!is404) {
    if (!canonical) errors.push('canonical 누락');
    else if (canonical !== SITE + path) errors.push(`canonical 불일치: ${canonical} ≠ ${SITE + path}`);
  }

  // H1
  const h1s = [...html.matchAll(/<h1[\s>][\s\S]*?<\/h1>/gi)].length;
  if (h1s !== 1) errors.push(`H1 개수 ${h1s}개 (정확히 1개여야 함)`);

  // 빈 제목 태그
  for (const m of html.matchAll(/<(h[1-6])[^>]*>([\s\S]*?)<\/\1>/gi)) {
    if (!text(m[2])) errors.push(`비어 있는 <${m[1]}>`);
  }

  // OG
  for (const key of ['og:title', 'og:description', 'og:image', 'og:url']) {
    if (!meta(html, key)) errors.push(`${key} 누락`);
  }
  const ogImage = meta(html, 'og:image');
  if (ogImage?.startsWith(SITE) && !exists(ogImage.slice(SITE.length))) {
    errors.push(`OG 이미지 파일 없음: ${ogImage.slice(SITE.length)}  → npm run images 실행`);
  }

  // JSON-LD 문법
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      JSON.parse(m[1]);
    } catch (e) {
      errors.push(`JSON-LD 파싱 오류: ${e.message}`);
    }
  }

  // 이미지 alt / 크기
  for (const m of html.matchAll(/<img\s[^>]*>/gi)) {
    if (attr(m[0], 'alt') === undefined) errors.push(`img alt 누락: ${attr(m[0], 'src')}`);
    if (!attr(m[0], 'width') || !attr(m[0], 'height')) warns.push(`img width/height 누락(CLS): ${attr(m[0], 'src')}`);
  }

  // 링크
  for (const m of html.matchAll(/<a\s[^>]*>/gi)) {
    const href = decode(attr(m[0], 'href') ?? '');
    if (!href) {
      errors.push('href 없는 <a>');
      continue;
    }
    if (/your_channel|example\.com/.test(href)) errors.push(`placeholder 링크: ${href}`);
    if (href.startsWith('/') && !href.startsWith('//')) {
      if (!exists(href)) errors.push(`깨진 내부 링크: ${href}`);
      else if (!/\.[a-z0-9]+$/i.test(href.split(/[?#]/)[0]) && !href.split(/[?#]/)[0].endsWith('/'))
        warns.push(`trailing slash 없는 내부 링크(리다이렉트 발생): ${href}`);
    }
    if (href.startsWith(SITE)) warns.push(`내부 링크는 상대경로 권장: ${href}`);
  }

  // 사이트맵 정합성
  if (!is404) {
    const inSitemap = sitemapUrls.has(SITE + path);
    if (noindex && inSitemap) errors.push('noindex 페이지가 사이트맵에 포함됨');
    if (!noindex && !inSitemap) errors.push('색인 대상 페이지가 사이트맵에 없음');
  }

  // 글 상세 전용 품질 점검
  if (isPost) {
    const prose = html.match(/<div class="prose[^"]*">([\s\S]*?)<\/div>\s*(?:<ul class="mt-10|<section)/)?.[1] ?? '';
    const chars = text(prose).replace(/\s/g, '').length;
    if (chars < 1500) warns.push(`본문이 짧습니다 (${chars}자 < 1,500자)`);
    const internal = new Set(
      [...prose.matchAll(/<a\s[^>]*href="(\/[^"]*)"/g)].map((x) => x[1]).filter((h) => !h.startsWith('/category/')),
    );
    if (internal.size < 2) warns.push(`본문 속 다른 글 링크 ${internal.size}개 (2개 이상 권장)`);
    const h2 = [...prose.matchAll(/<h2[\s>]/g)].length;
    if (h2 < 3) warns.push(`본문 H2 소제목 ${h2}개 (3개 이상 권장)`);
    if (!/"@type":"FAQPage"/.test(html)) warns.push('FAQ 없음 (frontmatter faq 추가 권장)');
    if (!/<img\s/i.test(prose)) warns.push('본문 이미지 없음 (스크린샷·도표 1개 이상 권장, alt 필수)');
    if (!/<a\s[^>]*href="https?:\/\/(?!infolog\.site)[^"]+"[^>]*>/.test(prose))
      warns.push('본문에 외부 출처 링크 없음 (공식 발표·공지 링크 1개 이상 권장)');
  }

  results.push({ path, errors, warns });
}

// 중복 title / description
for (const [t, paths] of titles) if (paths.length > 1) results.find((r) => r.path === paths[1]).errors.push(`title 중복: ${t} (${paths.join(', ')})`);
for (const paths of descriptions.values())
  if (paths.length > 1) results.find((r) => r.path === paths[1]).errors.push(`description 중복 (${paths.join(', ')})`);

// 사이트 단위 점검
const siteErrors = [];
const robotsTxt = existsSync(join(DIST, 'robots.txt')) ? readFileSync(join(DIST, 'robots.txt'), 'utf8') : '';
if (!robotsTxt) siteErrors.push('robots.txt 없음');
if (!/Sitemap:\s*https?:\/\//.test(robotsTxt)) siteErrors.push('robots.txt 에 Sitemap 지시어 없음');
if (/^Disallow:\s*\/\s*$/m.test(robotsTxt)) siteErrors.push('robots.txt 가 사이트 전체를 차단(Disallow: /)');
if (!existsSync(join(DIST, 'sitemap-index.xml'))) siteErrors.push('sitemap-index.xml 없음');
if (!existsSync(join(DIST, 'rss.xml'))) siteErrors.push('rss.xml 없음');
for (const u of sitemapUrls) if (!exists(u.replace(SITE, ''))) siteErrors.push(`사이트맵에 존재하지 않는 URL: ${u}`);

// ── 발행 일정 점검: 하루에 딱 1편 ─────────────────────────
// 같은 pubDate 의 글이 2편 이상이면 오류(배포 차단), 예약 구간에 빈 날이 있으면 경고.
const BLOG = fileURLToPath(new URL('../src/content/blog/', import.meta.url));
const todayKst = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
const nextDay = (d) => {
  const t = new Date(`${d}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + 1);
  return t.toISOString().slice(0, 10);
};
const byDate = new Map();
for (const f of readdirSync(BLOG).filter((f) => /\.mdx?$/.test(f))) {
  const fm = readFileSync(join(BLOG, f), 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
  if (/^draft:\s*true\s*$/m.test(fm)) continue;
  const date = fm.match(/^pubDate:\s*["']?(\d{4}-\d{2}-\d{2})/m)?.[1];
  if (date) byDate.set(date, [...(byDate.get(date) ?? []), f]);
}
const scheduleWarns = [];
for (const [date, files] of [...byDate].sort())
  if (files.length > 1) siteErrors.push(`${date} 에 글이 ${files.length}편 예약됨 (하루 1편만 허용): ${files.join(', ')}`);
const lastDate = [...byDate.keys()].sort().at(-1);
const queued = [...byDate.keys()].filter((d) => d > todayKst).length;
if (lastDate) {
  const gaps = [];
  for (let d = todayKst; d <= lastDate; d = nextDay(d)) if (!byDate.has(d)) gaps.push(d);
  if (gaps.length) scheduleWarns.push(`예약 구간에 글이 없는 날: ${gaps.join(', ')}`);
}
if (!byDate.has(nextDay(todayKst))) scheduleWarns.push(`내일(${nextDay(todayKst)}) 발행할 글이 없습니다 → npm run new 로 예약하세요`);

// ── 출력 ────────────────────────────────────────────────
let errorCount = siteErrors.length;
let warnCount = 0;
for (const r of results.sort((a, b) => a.path.localeCompare(b.path))) {
  errorCount += r.errors.length;
  warnCount += r.warns.length;
  if (!r.errors.length && !r.warns.length) continue;
  console.log(`\n${r.path}`);
  for (const e of r.errors) console.log(`  ✖ ${e}`);
  for (const w of r.warns) console.log(`  ▲ ${w}`);
}
for (const e of siteErrors) console.log(`  ✖ [사이트] ${e}`);
warnCount += scheduleWarns.length;
for (const w of scheduleWarns) console.log(`  ▲ [발행 일정] ${w}`);
console.log(`\n발행 일정: 오늘(${todayKst}) 이후 예약된 글 ${queued}편 · 마지막 예약일 ${lastDate ?? '없음'}`);

const clean = results.filter((r) => !r.errors.length).length;
console.log(
  `\nSEO 점검: 페이지 ${results.length}개 · 오류 ${errorCount}개 · 경고 ${warnCount}개 · 오류 없는 페이지 ${clean}/${results.length}`,
);
if (errorCount > 0) {
  console.log('✖ 오류를 수정해야 배포할 수 있습니다.');
  process.exit(1);
}
console.log('✓ 배포 가능 (경고는 개선 권장 사항)');
