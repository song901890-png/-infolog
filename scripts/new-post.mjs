// 새 글 템플릿 생성 — 매일 1편 발행용
//   npm run new -- <slug> <category>
//   예) npm run new -- kbo-postseason-schedule sports
//
// - pubDate 는 "이미 예약된 마지막 글의 다음 날"(없으면 오늘, KST)로 자동 지정 → 하루 1편 예약 발행
// - draft: true 로 생성되므로 작성이 끝나면 false 로 바꾸고 `npm run images` 로 OG 이미지를 만드세요.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';


const CATEGORIES = ['sports', 'guide', 'webtoon', 'ott', 'anime', 'security', 'weekly'];
const [slug, category] = process.argv.slice(2);

if (!slug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
  console.error('사용법: npm run new -- <slug> <category>\n  slug: 영문 소문자·숫자·하이픈 (예: kbo-postseason-schedule)');
  process.exit(1);
}
if (!CATEGORIES.includes(category)) {
  console.error(`category 는 ${CATEGORIES.join(' | ')} 중 하나여야 합니다.`);
  process.exit(1);
}

const dir = new URL('../src/content/blog/', import.meta.url);
const file = new URL(`${slug}.mdx`, dir);
if (existsSync(file)) {
  console.error(`이미 존재합니다: src/content/blog/${slug}.mdx`);
  process.exit(1);
}

const todayKst = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
const dates = readdirSync(dir)
  .filter((f) => /\.mdx?$/.test(f))
  .map((f) => readFileSync(new URL(f, dir), 'utf8').match(/^pubDate:\s*["']?(\d{4}-\d{2}-\d{2})/m)?.[1])
  .filter(Boolean)
  .sort();
const last = dates.at(-1);
let pubDate = todayKst;
if (last && last >= todayKst) {
  const d = new Date(`${last}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  pubDate = d.toISOString().slice(0, 10);
}

const template = `---
# ── SEO 체크리스트 ─────────────────────────────────────────────
# title       : 핵심 키워드를 앞쪽에, 28자 안팎 (사이트명 포함 검색결과 표시폭 40 이내)
# description : 검색 의도에 대한 답을 요약, 80~120자
# 본문         : 1,500자 이상 · H2 소제목 3개 이상 · 다른 글 링크 2개 이상
#               · 공식 출처(외부) 링크 1개 이상 · 이미지 1개 이상(alt 필수)
# 이미지       : public/images/${slug}/ 에 넣고 ![설명](/images/${slug}/파일.webp)
# 발행 전      : draft: false → npm run images → npm run build (SEO 점검 통과 확인)
# ─────────────────────────────────────────────────────────────
title: "제목을 입력하세요"
description: "검색 결과에 노출될 설명을 80~120자로 입력하세요. 독자가 이 글에서 얻을 수 있는 답을 구체적으로 적습니다."
pubDate: ${pubDate}
category: ${category}
tags: ["태그1", "태그2", "태그3"]
summary:
  - "핵심 요약 1"
  - "핵심 요약 2"
  - "핵심 요약 3"
faq:
  - question: "독자가 실제로 검색할 법한 질문"
    answer: "2~3문장으로 된 직접적인 답변"
  - question: "두 번째 질문"
    answer: "답변"
draft: true
---

도입부: 이 글이 어떤 문제를 해결하는지 2~3문장으로 설명하세요. 핵심 키워드를 첫 문단에 자연스럽게 포함합니다.

<SoftCTA />

## 첫 번째 소제목

본문...

## 두 번째 소제목

본문... 관련 글: [다른 글 제목](/다른-글-slug/)

## 세 번째 소제목

본문... 출처: [공식 사이트 이름](https://)

## 마무리

핵심을 한 번 더 정리합니다.
`;

writeFileSync(file, template, 'utf8');
console.log(`✓ src/content/blog/${slug}.mdx 생성 (pubDate: ${pubDate}, draft: true)`);
console.log(`  URL 예정: https://infolog.site/${slug}/`);

