export type Locale = 'en' | 'zh';

export const localizedProjectPath = (locale: Locale, slug: string) =>
  `${locale === 'zh' ? '/zh' : ''}/projects/${slug}/`;

export const localizedHomePath = (locale: Locale) => (locale === 'zh' ? '/zh/' : '/');

export function alternatePath(locale: Locale, pathname: string) {
  if (locale === 'en' && pathname.startsWith('/404')) return '/zh/404/';
  if (locale === 'zh' && pathname.startsWith('/zh/404')) return '/404.html';
  if (locale === 'en') return pathname === '/' ? '/zh/' : `/zh${pathname}`;
  const withoutPrefix = pathname.replace(/^\/zh(?=\/)/, '');
  return withoutPrefix || '/';
}
