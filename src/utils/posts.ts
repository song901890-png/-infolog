import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'blog'>;

/**
 * 발행된 글만 반환합니다 (최신순).
 * - draft: true 인 글은 제외
 * - pubDate 가 빌드 시점보다 미래인 글은 제외 (예약 발행 — 매일 재빌드 시 자동 공개)
 * - 개발 서버(npm run dev)에서는 초안·예약 글도 미리보기로 노출
 */
export async function getPublishedPosts(): Promise<Post[]> {
  // 날짜 단위 예약 발행: pubDate(YYYY-MM-DD)가 "한국 시간 기준 오늘" 이하이면 공개
  const todayKst = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const posts = await getCollection('blog', ({ data }) => {
    if (import.meta.env.DEV) return true;
    return !data.draft && data.pubDate.toISOString().slice(0, 10) <= todayKst;
  });
  return posts.sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());
}

export function postUrl(post: Post): string {
  return `/${post.id}/`;
}

export function lastModified(post: Post): Date {
  return post.data.updatedDate ?? post.data.pubDate;
}

const dateFmt = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  timeZone: 'Asia/Seoul',
});

export function formatDate(date: Date): string {
  return dateFmt.format(date);
}

/** 한국어 기준 대략적인 읽기 시간(분) */
export function readingTime(body: string | undefined): number {
  if (!body) return 1;
  const text = body.replace(/<[^>]+>|import .*|export .*|[#>*`_\-[\]()]/g, '');
  const chars = text.replace(/\s+/g, '').length;
  return Math.max(1, Math.round(chars / 500));
}

/** 본문 글자 수(공백 제외) — BlogPosting.wordCount 및 SEO 점검용 */
export function wordCount(body: string | undefined): number {
  if (!body) return 0;
  return body
    .replace(/^---[\s\S]*?---/, '')
    .replace(/<[^>]+>|```[\s\S]*?```|[#>*`_|[\]()-]/g, '')
    .replace(/\s+/g, '').length;
}

/** 글별 OG 이미지 경로 (scripts/generate-images.mjs 가 public/og/{slug}.png 로 생성) */
export function postOgImage(post: Post): string {
  return `/og/${post.id}.png`;
}
