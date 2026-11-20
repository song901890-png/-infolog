# 인포로그 (infolog.site)

Astro 7 + Tailwind CSS 4 + MDX 기반 정적 정보 블로그.

## 실행

```bash
npm install
npm run dev        # http://localhost:4321 (초안·예약 글도 미리보기)
npm run build      # 타입 체크 + dist/ 생성
npm run preview    # 빌드 결과 확인
```

## 디렉토리 구조

```
public/                 robots.txt, _headers(Cloudflare 캐시), favicon, og-default.png, logo.png
scripts/generate-images.mjs   OG 이미지·로고 PNG 재생성
src/
  consts.ts             ★ 사이트명·도메인·CTA 링크·카테고리 (전역 설정)
  content.config.ts     Content Collections Zod 스키마
  content/blog/*.mdx    글 (파일명 = URL slug)
  layouts/              BaseLayout(SEO 메타), PostLayout(글 상세 + JSON-LD)
  components/           SummaryBox, SoftCTA, MainBannerCTA, StickyMobileBar,
                        FaqAccordion, RelatedPosts, PostCard, Pagination, Breadcrumb, Header, Footer
  pages/
    index.astro                     홈
    [...slug].astro                 글 상세  → /{slug}/
    blog/[...page].astro            전체 글  → /blog/, /blog/2/
    category/[slug]/[...page].astro 카테고리 → /category/sports/, /category/sports/2/
    search.astro, search.json.ts    정적 검색
    404.astro
```

## 매일 1편 발행 워크플로

```bash
npm run new -- kbo-postseason-schedule sports   # 1) 템플릿 생성 (pubDate 자동: 마지막 예약 글 다음 날, draft: true)
#    → src/content/blog/kbo-postseason-schedule.mdx 작성 후 draft: false
npm run images                                  # 2) 글별 OG 이미지 생성 → public/og/{slug}.png (한글 폰트 있는 PC에서)
npm run build                                   # 3) 타입 체크 + 빌드 + SEO 자동 점검 (오류 시 빌드 실패)
```

- `npm run seo` : dist/ 만 다시 점검. ✖ 오류는 배포 차단, ▲ 경고는 개선 권장(본문 1,500자·이미지·내부/외부 링크 등).
- 본문 이미지는 `public/images/{slug}/` 에 넣고 `![설명](/images/{slug}/파일.webp)` 로 사용 (alt 필수).

## 매일 1편 자동 발행 (`npm run daily`)

```bash
npm run daily                        # 오늘(KST) 글이 없으면 Claude 가 1편 작성 → OG 이미지 → 빌드·SEO 점검 → commit → push
npm run daily -- --date 2026-11-25   # 특정 날짜 글을 미리 작성(예약)
npm run daily -- --no-push           # push 없이 커밋까지만
```

- **하루 딱 1편:** 해당 날짜 글이 이미 있으면 새로 쓰지 않고, 같은 날짜에 2편이 있으면 빌드가 실패합니다.
- **카테고리:** 금요일은 주간 이슈, 그 외에는 스포츠 → 링크모음 → 웹툰 → OTT → 애니·웹소설 → 보안 순으로 돌아갑니다.
- **작성 지침:** `scripts/daily-post-prompt.md` (주제 방향·품질 기준을 바꾸려면 이 파일만 수정).
- **실패 시:** 빌드·SEO 점검에 실패한 글은 `.daily-failed/` 로 옮기고 배포하지 않습니다. 기록은 `logs/daily-YYYY-MM.log`.
- **배포:** push 하면 GitHub 에 연결된 Cloudflare Pages 가 자동으로 빌드·배포합니다.
- OG 이미지에 한글 폰트가 필요하므로 이 PC(Windows)의 작업 스케줄러로 매일 실행합니다. Claude Code 로그인이 유지되어 있어야 합니다.

## 도메인 연결 후 할 일 (src/consts.ts)

1. `CTA_URL` 에 텔레그램 채널 주소 입력 → 비어 있으면 CTA 가 자동으로 숨겨짐
2. `VERIFICATION` 에 Google Search Console / 네이버 서치어드바이저 / Bing 소유확인 코드 입력
3. `SITE.contactEmail` 입력 (소개 페이지 문의란)
4. 각 웹마스터도구에 `https://infolog.site/sitemap-index.xml`, 네이버·Daum 에 `https://infolog.site/rss.xml` 제출
5. www·http → `https://infolog.site/` 301 리다이렉트 확인, PageSpeed Insights 로 실측

## 새 글 발행

`src/content/blog/my-post-slug.mdx` 생성:

```mdx
---
title: "제목 (70자 이내)"
description: "메타 설명 (160자 이내)"
pubDate: 2026-11-21
updatedDate: 2026-11-22      # 선택
category: guide              # sports | guide | webtoon | ott | anime | security | weekly
tags: ["태그1", "태그2"]
summary:
  - "요약 1"
  - "요약 2"
  - "요약 3"
faq:                         # 선택 — 있으면 아코디언 + FAQPage JSON-LD 자동
  - question: "질문"
    answer: "답변"
draft: false
---

본문 도입부...

<SoftCTA />

## 소제목
...
```

- 상단 요약 박스, 하단 배너 CTA, FAQ, 관련 글, 모바일 고정 바는 **레이아웃이 자동 삽입**합니다.
- `<SoftCTA />`, `<MainBannerCTA />`는 본문에서 **import 없이** 바로 쓸 수 있습니다. 문구 변경: `<SoftCTA text="..." buttonText="..." />`
- **예약 발행:** `pubDate`가 한국 시간 기준 오늘보다 미래면 빌드에서 제외됩니다. `draft: true`도 제외.
  매일 자동 공개하려면 Cloudflare Pages **Deploy Hook**을 만들고 매일 00:05 KST에 호출(예: GitHub Actions cron)하세요.

## Cloudflare Pages 배포

- Build command: `npm run build`
- Output directory: `dist`
- 환경 변수: `NODE_VERSION=22` 이상
