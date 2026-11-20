// OG 이미지·로고 PNG 생성 스크립트
//   npm run images            → 기본 OG/로고 + "아직 이미지가 없는 글"의 OG 이미지 생성
//   npm run images -- --force → 모든 글의 OG 이미지 재생성 (제목을 바꿨을 때)
//
// ⚠ 한글 폰트가 있는 PC(Windows: 맑은 고딕)에서 실행하고 public/og/*.png 를 함께 커밋하세요.
//    Cloudflare 빌드 서버에는 한글 폰트가 없어 글자가 깨지므로 빌드 단계에서는 생성하지 않습니다.
import sharp from 'sharp';
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const out = (name) => fileURLToPath(new URL(`public/${name}`, root));
const font = "Pretendard, 'Malgun Gothic', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif";
const force = process.argv.includes('--force');

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const mark = (x, y, s) => `
  <g transform="translate(${x} ${y}) scale(${s})">
    <rect width="64" height="64" rx="14" fill="#0f172a"/>
    <rect x="6" y="6" width="52" height="52" rx="10" fill="#1e293b"/>
    <path d="M22 18h7v28h-7z" fill="#00e676"/>
    <path d="M33 18h7v21h10v7H33z" fill="#38bdf8"/>
  </g>`;

const background = `
  <defs>
    <radialGradient id="g" cx="1" cy="0" r="1.2">
      <stop offset="0" stop-color="#0d3a3a"/>
      <stop offset="0.5" stop-color="#1e293b"/>
      <stop offset="1" stop-color="#0f172a"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <rect x="0" y="0" width="12" height="630" fill="#00e676"/>`;

const og = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  ${background}
  ${mark(90, 110, 2)}
  <text x="240" y="190" font-family="${font}" font-size="64" font-weight="800" fill="#ffffff">인포로그</text>
  <text x="90" y="350" font-family="${font}" font-size="58" font-weight="800" fill="#f8fafc">매일 한 편, 꼭 필요한 정보만</text>
  <text x="90" y="430" font-family="${font}" font-size="32" font-weight="500" fill="#94a3b8">스포츠중계 · 링크모음 · 웹툰 · 주간 이슈</text>
  <text x="90" y="540" font-family="${font}" font-size="28" font-weight="700" fill="#00e676">infolog.site</text>
</svg>`;

const logo = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  ${mark(0, 0, 8)}
</svg>`;

/** 글자 폭 추정(em): 한글·전각 1.0, 영문·숫자·기호 ~0.58 */
const charWidth = (ch) => (/[ᄀ-ᇿ　-鿿가-힯＀-￯]/.test(ch) ? 1 : 0.58);
const textWidth = (s) => [...s].reduce((w, ch) => w + charWidth(ch), 0);

/** 공백 단위 줄바꿈 (긴 단어는 글자 단위로 자름), 최대 maxLines 줄 */
function wrap(text, maxEm, maxLines) {
  const lines = [];
  let line = '';
  // 공백 외에 가운뎃점(·) 뒤에서도 줄바꿈 허용 — "네이버웹툰·카카오페이지·레진코믹스" 같은 긴 묶음 대응
  for (const word of text.split(/\s+|(?<=·)/)) {
    const next = line ? (line.endsWith('·') ? `${line}${word}` : `${line} ${word}`) : word;
    if (textWidth(next) <= maxEm) {
      line = next;
      continue;
    }
    if (line) lines.push(line);
    line = word;
    while (textWidth(line) > maxEm) {
      let cut = '';
      for (const ch of line) {
        if (textWidth(cut + ch) > maxEm) break;
        cut += ch;
      }
      lines.push(cut);
      line = line.slice(cut.length);
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = lines[maxLines - 1].replace(/.{1}$/u, '') + '…';
  }
  return lines;
}

/** src/consts.ts 의 카테고리 slug → name (TS 파일을 import 하지 않고 정규식으로 읽음) */
function categoryNames() {
  const src = readFileSync(new URL('src/consts.ts', root), 'utf8');
  const map = {};
  for (const m of src.matchAll(/slug:\s*'([^']+)',\s*name:\s*'([^']+)'/g)) map[m[1]] = m[2];
  return map;
}

function frontmatter(file) {
  const fm = readFileSync(file, 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
  const pick = (key) =>
    fm
      .match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))?.[1]
      ?.replace(/\s+#.*$/, '')
      .trim()
      .replace(/^(["'])(.*)\1$/, '$2');
  return { title: pick('title'), category: pick('category'), ogImage: pick('ogImage') };
}

function postOg({ title, category }) {
  const fontSize = 64;
  const lines = wrap(title, 1000 / fontSize, 3);
  const lineHeight = fontSize * 1.3;
  const startY = 330 - ((lines.length - 1) * lineHeight) / 2;
  const tspans = lines
    .map((l, i) => `<text x="90" y="${startY + i * lineHeight}" font-family="${font}" font-size="${fontSize}" font-weight="800" fill="#f8fafc">${esc(l)}</text>`)
    .join('\n  ');
  const badgeW = Math.round(textWidth(category) * 28 + 40);
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  ${background}
  <rect x="90" y="80" width="${badgeW}" height="52" rx="10" fill="#00e676" fill-opacity="0.15"/>
  <text x="110" y="116" font-family="${font}" font-size="28" font-weight="700" fill="#00e676">${esc(category)}</text>
  ${tspans}
  ${mark(90, 498, 0.9)}
  <text x="160" y="540" font-family="${font}" font-size="30" font-weight="800" fill="#ffffff">인포로그</text>
  <text x="1110" y="540" text-anchor="end" font-family="${font}" font-size="26" font-weight="600" fill="#94a3b8">infolog.site</text>
</svg>`;
}

await sharp(Buffer.from(og)).png({ compressionLevel: 9 }).toFile(out('og-default.png'));
await sharp(Buffer.from(logo)).png({ compressionLevel: 9 }).toFile(out('logo.png'));
console.log('✓ public/og-default.png, public/logo.png');

mkdirSync(out('og'), { recursive: true });
const cats = categoryNames();
const blogDir = new URL('src/content/blog/', root);
let made = 0;
for (const file of readdirSync(blogDir)) {
  if (!/\.mdx?$/.test(file)) continue;
  const slug = file.replace(/\.mdx?$/, '');
  const target = out(`og/${slug}.png`);
  const data = frontmatter(new URL(file, blogDir));
  if (data.ogImage || (!force && existsSync(target))) continue;
  if (!data.title) {
    console.warn(`⚠ ${file}: title 없음 — 건너뜀`);
    continue;
  }
  await sharp(Buffer.from(postOg({ title: data.title, category: cats[data.category] ?? '' })))
    .png({ compressionLevel: 9, palette: true })
    .toFile(target);
  console.log(`✓ public/og/${slug}.png`);
  made++;
}
console.log(made ? `글 OG 이미지 ${made}개 생성` : '새로 생성할 글 OG 이미지 없음');
