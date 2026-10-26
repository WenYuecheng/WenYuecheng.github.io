/** Static front end; the guestbook is a separately deployed service. */
const nextConfig = { output: 'export', trailingSlash: true, images: { unoptimized: true }, poweredByHeader: false };
export default nextConfig;
