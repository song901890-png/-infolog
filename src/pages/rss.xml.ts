import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { SITE, getCategory } from '../consts';
import { getPublishedPosts, postUrl } from '../utils/posts';

/** RSS 피드 — 네이버 서치어드바이저·Daum·피드 리더 제출용 (/rss.xml) */
export async function GET(context: APIContext) {
  const posts = await getPublishedPosts();
  return rss({
    title: SITE.name,
    description: SITE.description,
    site: context.site ?? SITE.url,
    items: posts.slice(0, 50).map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: postUrl(post),
      categories: [getCategory(post.data.category).name, ...post.data.tags],
      author: SITE.author,
    })),
    customData: `<language>ko-kr</language>`,
  });
}
