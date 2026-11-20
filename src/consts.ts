/**
 * 사이트 전역 설정 — 이 파일만 수정하면 사이트 전체에 반영됩니다.
 */
export const SITE = {
  name: '인포로그',
  nameEn: 'Infolog',
  url: 'https://infolog.site',
  lang: 'ko-KR',
  locale: 'ko_KR',
  description:
    '스포츠 중계·프리뷰, 링크모음·접속 오류 해결, 웹툰·OTT·애니 플랫폼, 피싱·보안, 주간 이슈까지 — 매일 한 편씩 검증된 정보를 정리하는 인포로그.',
  /** 홈 <title> 에 쓰이는 키워드형 문구 */
  homeTitle: '스포츠중계·웹툰 링크모음·접속 오류 해결 정보 블로그',
  author: '인포로그 편집팀',
  ogImage: '/og-default.png',
  postsPerPage: 9,
  /** 문의 이메일 (비워두면 연락처 페이지에서 이메일 항목을 숨깁니다) */
  contactEmail: '',
  /** 운영 시작일 (소개 페이지 표기용) */
  since: '2026-11',
} as const;

/**
 * 검색엔진 소유확인 코드 — 도메인 연결 후 각 웹마스터도구에서 받은 content 값을 넣으세요.
 * 비어 있으면 메타 태그를 출력하지 않습니다.
 */
export const VERIFICATION = {
  google: '', // Google Search Console  → <meta name="google-site-verification">
  naver: '', //  네이버 서치어드바이저     → <meta name="naver-site-verification">
  bing: '', //   Bing Webmaster Tools   → <meta name="msvalidate.01">
} as const;

/**
 * 메인 CTA(텔레그램 등) 설정
 * url 을 비워두면 모든 CTA(본문 배너·하단 배너·모바일 바)가 자동으로 숨겨집니다.
 * → 깨진 링크가 사이트 전체에 깔리는 것을 방지. 채널 개설 후 주소만 넣으면 바로 노출됩니다.
 */
const CTA_URL = ''; // 예: 'https://t.me/infolog_channel'

export const CTA = {
  url: CTA_URL,
  enabled: /^https:\/\/t\.me\/(?!your_channel)[\w]+/.test(CTA_URL),
  label: '텔레그램 바로가기',
  softText: '새 글 발행과 업데이트 소식은 공식 텔레그램 채널에서 가장 먼저 받아보세요.',
  bannerTitle: '새 글 알림을 가장 먼저 받아보세요',
  bannerText: '매일 발행되는 새 글과 기존 글의 업데이트 소식을 공식 텔레그램 채널에서 전해 드립니다.',
  stickyText: '새 글 알림은 공식 텔레그램에서',
} as const;

export const CATEGORIES = [
  {
    slug: 'sports',
    name: '스포츠중계·프리뷰',
    short: '스포츠',
    description: '해외축구·프로야구 등 주요 경기 일정과 합법 중계 채널, 빅매치 프리뷰를 시즌별로 한눈에 정리합니다.',
  },
  {
    slug: 'guide',
    name: '링크모음',
    short: '링크모음',
    description: '웹툰·스포츠중계·OTT 공식 사이트 링크모음과 주소 찾는 법, 접속이 안 될 때 해결법, 피싱·가짜 주소 구별법까지 한곳에 정리합니다.',
  },
  {
    slug: 'webtoon',
    name: '웹툰·플랫폼',
    short: '웹툰',
    description: '네이버웹툰·카카오페이지 등 웹툰 플랫폼 비교와 합법 무료 이용 팁, 신작·완결 소식을 정리합니다.',
  },
  {
    slug: 'ott',
    name: 'OTT·영화드라마',
    short: 'OTT',
    description: '넷플릭스·티빙·쿠팡플레이 등 OTT 요금제 비교와 신작 공개 일정, 공식 사이트 주소와 합법 시청 방법을 정리합니다.',
  },
  {
    slug: 'anime',
    name: '애니·웹소설',
    short: '애니·웹소설',
    description: '애니메이션 합법 스트리밍 플랫폼과 웹소설 플랫폼 비교, 무료 이용 팁, 신작·완결 소식과 공식 사이트 주소를 정리합니다.',
  },
  {
    slug: 'security',
    name: '피싱·보안',
    short: '보안',
    description: '스미싱·피싱 사이트 구별법, 계정 보안 설정, 개인정보 유출 대처와 신고 방법까지 안전한 인터넷 이용법을 안내합니다.',
  },
  {
    slug: 'weekly',
    name: '주간 이슈 요약',
    short: '주간 이슈',
    description: '스포츠·웹툰·보안 등 한 주 동안 놓치기 쉬운 핵심 이슈를 매주 3분 안에 읽을 수 있게 요약합니다.',
  },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]['slug'];
export const CATEGORY_SLUGS = CATEGORIES.map((c) => c.slug) as [CategorySlug, ...CategorySlug[]];

export function getCategory(slug: string) {
  const found = CATEGORIES.find((c) => c.slug === slug);
  if (!found) throw new Error(`Unknown category: ${slug}`);
  return found;
}
