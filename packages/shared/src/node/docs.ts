export const SCALAR_VERSION = '1.76.4';

/** CSP for the Scalar docs page, which loads from a CDN. */
export const DOCS_CSP =
  "default-src 'none'; script-src https://cdn.jsdelivr.net; style-src 'unsafe-inline' https://cdn.jsdelivr.net; font-src https://fonts.scalar.com https://cdn.jsdelivr.net data:; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'";

// Plain docs: no Scalar promo buttons or AI chat.
const CONFIG = JSON.stringify({
  showDeveloperTools: 'never',
  agent: { disabled: true },
  mcp: { disabled: true },
  hideClientButton: false,
  defaultOpenAllTags: false,
});

export function docsPage(specUrl: string) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Flossophy API</title></head><body>
<script id="api-reference" data-url="${specUrl}" data-configuration='${CONFIG}'></script>
<script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference@${SCALAR_VERSION}"></script>
</body></html>`;
}
