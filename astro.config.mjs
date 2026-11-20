// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { readdirSync, readFileSync } from 'node:fs';

const SITE_URL = 'https://infolog.site';

/**
 * 사이트맵 <lastmod> 용: 글 slug → updatedDate(없으면 pubDate)
 * 빌드 시각을 일괄로 넣으면 검색엔진이 lastmod 를 신뢰하지 않으므로 글별 실제 수정일을 사용합니다.
 */
function postLastmodMap() {
  const dir = new URL('./src/content/blog/', import.meta.url);
  /** @type {Record<string, string>} */
  const map = {};
  const todayKst = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
  for (const file of readdirSync(dir)) {
    if (!/\.mdx?$/.test(file)) continue;
    const fm = readFileSync(new URL(file, dir), 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
    const pick = (/** @type {string} */ key) => fm.match(new RegExp(`^${key}:\\s*["']?([^"'\\r\\n]+)`, 'm'))?.[1]?.split(/\s+#/)[0].trim();
    const date = pick('updatedDate') ?? pick('pubDate');
    const pub = pick('pubDate');
    // 예약(미래)·초안 글은 페이지가 생성되지 않으므로 카테고리 집계에서도 제외
    if (pick('draft') === 'true' || !pub || pub.slice(0, 10) > todayKst) continue;
    const cat = pick('category');
    if (cat) usedCategories.add(cat);
    if (date) map[`${SITE_URL}/${file.replace(/\.mdx?$/, '')}/`] = new Date(date).toISOString();
  }
  return map;
}
/** 글이 1개 이상 있는 카테고리 — 빈 카테고리 페이지(noindex)는 사이트맵에서 제외 */
const usedCategories = new Set();
const lastmods = postLastmodMap();
// 공식 링크 허브: 링크 데이터의 마지막 확인일
const linksChecked = JSON.parse(readFileSync(new URL('./src/data/links.json', import.meta.url), 'utf8')).checked;
if (linksChecked) lastmods[`${SITE_URL}/links/`] = new Date(`${linksChecked}T00:00:00+09:00`).toISOString();

// https://astro.build/config
export default defineConfig({
  site: SITE_URL,
  output: 'static',
  trailingSlash: 'always',
  build: {
    format: 'directory',
    inlineStylesheets: 'auto',
  },
  integrations: [
    mdx(),
    sitemap({
      filter: (page) => {
        if (page.includes('/search/') || page.includes('/404')) return false;
        const cat = page.match(/\/category\/([^/]+)\//)?.[1];
        return !cat || usedCategories.has(cat);
      },
      // Google 은 changefreq/priority 를 무시하고 정확한 lastmod 만 사용합니다.
      serialize(item) {
        const lastmod = lastmods[item.url];
        return lastmod ? { ...item, lastmod } : item;
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
