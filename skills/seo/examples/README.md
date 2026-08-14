`app/sitemap.ts` in a generated Next.js site:

```ts
import { generateSitemap } from "@hermes/seo";

export async function GET() {
  const xml = generateSitemap("https://example.com", [
    { path: "/", priority: 1.0 },
    { path: "/about" },
    { path: "/contact" },
  ]);
  return new Response(xml, { headers: { "content-type": "application/xml" } });
}
```
