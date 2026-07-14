// Single source of truth for the Chrome Web Store listing. After the extension
// clears review, set NEXT_PUBLIC_CHROME_STORE_URL to the published listing URL
// (https://chromewebstore.google.com/detail/<id>); until then this falls back
// to the store search so the "Add to Chrome" button is never a dead link.
export const CHROME_WEB_STORE_URL =
  process.env.NEXT_PUBLIC_CHROME_STORE_URL || "https://chromewebstore.google.com/search/Offprint";
