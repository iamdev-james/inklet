import { chromium, type Browser } from "playwright";

const store = globalThis as unknown as { __offprintBrowser?: Promise<Browser> };

export async function getBrowser(): Promise<Browser> {
  if (!store.__offprintBrowser) {
    store.__offprintBrowser = chromium
      .launch({ headless: true })
      .then((browser) => {
        browser.on("disconnected", () => {
          store.__offprintBrowser = undefined;
        });
        return browser;
      })
      .catch((err: unknown) => {
        store.__offprintBrowser = undefined;
        throw err;
      });
  }
  return store.__offprintBrowser;
}

export async function closeBrowser(): Promise<void> {
  const pending = store.__offprintBrowser;
  store.__offprintBrowser = undefined;
  if (!pending) return;
  const browser = await pending.catch(() => null);
  await browser?.close();
}
