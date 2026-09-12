// @ts-expect-error jsdom declarations not bundled
import { JSDOM } from "jsdom";

if (typeof window === "undefined" || !globalThis.document) {
  const dom = new JSDOM("<!doctype html><html><body><div id=\"root\"></div></body></html>", {
    url: "http://localhost:3000",
  });

  const globalsToDefine: PropertyDescriptorMap = {
    window: { value: dom.window, writable: true },
    document: { value: dom.window.document, writable: true },
    navigator: { value: dom.window.navigator, writable: true },
    HTMLElement: { value: dom.window.HTMLElement, writable: true },
    HTMLInputElement: { value: dom.window.HTMLInputElement, writable: true },
    HTMLFormElement: { value: dom.window.HTMLFormElement, writable: true },
    FileReader: { value: dom.window.FileReader, writable: true },
  };

  if (!globalThis.File) {
    globalsToDefine.File = { value: dom.window.File, writable: true };
  }
  if (!globalThis.FormData) {
    globalsToDefine.FormData = { value: dom.window.FormData, writable: true };
  }

  Object.defineProperties(globalThis, globalsToDefine);
}

import "@testing-library/jest-dom/vitest";
