import { SITE } from '../consts';

/**
 * 사이트 공통 엔티티(@id) — 모든 페이지의 JSON-LD 가 같은 Organization/WebSite 를 참조하도록 합니다.
 * 검색엔진이 "이 글의 발행처 = 이 사이트 = 이 조직"을 하나의 엔티티로 연결해 이해합니다.
 */
const base = SITE.url.replace(/\/$/, '');
export const ORG_ID = `${base}/#organization`;
export const WEBSITE_ID = `${base}/#website`;

export function organizationSchema(sameAs: string[] = []) {
  return {
    '@type': 'Organization',
    '@id': ORG_ID,
    name: SITE.name,
    alternateName: SITE.nameEn,
    url: `${base}/`,
    logo: { '@type': 'ImageObject', url: `${base}/logo.png`, width: 512, height: 512 },
    ...(sameAs.length > 0 ? { sameAs } : {}),
  };
}

export function websiteSchema() {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: SITE.name,
    alternateName: SITE.nameEn,
    url: `${base}/`,
    inLanguage: SITE.lang,
    description: SITE.description,
    publisher: { '@id': ORG_ID },
  };
}
