import type { APIRoute } from 'astro';
import { getCategory } from '../consts';
import { getPublishedPosts, postUrl } from '../utils/posts';

/** 검색 페이지용 정적 인덱스 (빌드 시 /search.json 으로 생성) */
export const GET: APIRoute = async () => {
  const posts = await getPublishedPosts();
  const index = posts.map((p) => ({
    t: p.data.title,
    d: p.data.description,
    c: getCategory(p.data.category).name,
    g: p.data.tags,
    u: postUrl(p),
    p: p.data.pubDate.toISOString().slice(0, 10),
  }));
  return new Response(JSON.stringify(index), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
