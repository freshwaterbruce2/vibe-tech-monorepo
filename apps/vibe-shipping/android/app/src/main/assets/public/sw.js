/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-a79aec54'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();

  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "registerSW.js",
    "revision": "1872c500de691dce40960bb85481de07"
  }, {
    "url": "offline.html",
    "revision": "52a10c8d7f758c78ded75d933b60af2d"
  }, {
    "url": "index.html",
    "revision": "a238d275ae0213ae2e8ee74f06597a26"
  }, {
    "url": "favicon.ico",
    "revision": "ad1a6f4c5183484aea75bd061d11fc25"
  }, {
    "url": "icons/icon-96x96.png",
    "revision": "71beeec395f2dfa4399d5674bd8cf431"
  }, {
    "url": "icons/icon-72x72.png",
    "revision": "977c9916c323295f6e340cc46ad59ba5"
  }, {
    "url": "icons/icon-512x512.png",
    "revision": "4d8ce60038077550f452f30389550703"
  }, {
    "url": "icons/icon-384x384.png",
    "revision": "62bd53f5339602483bc2b7484dd13705"
  }, {
    "url": "icons/icon-192x192.png",
    "revision": "62171a1c2c32d22df167cef34802b07a"
  }, {
    "url": "icons/icon-180x180.png",
    "revision": "62171a1c2c32d22df167cef34802b07a"
  }, {
    "url": "icons/icon-152x152.png",
    "revision": "ef7331ef310406584e49630db6eb6d0b"
  }, {
    "url": "icons/icon-144x144.png",
    "revision": "e0a0d071987a6c575788fecd3bf1d36d"
  }, {
    "url": "icons/icon-128x128.png",
    "revision": "6843bb3e9cbbed783bd939a283b7ee21"
  }, {
    "url": "assets/js/WelcomeWizard-TI4bGYv0.js",
    "revision": null
  }, {
    "url": "assets/js/WarehouseSetup-t3wpIYJB.js",
    "revision": null
  }, {
    "url": "assets/js/VoiceTutorial-CbRRKakG.js",
    "revision": null
  }, {
    "url": "assets/js/VoiceTestPage-C847O0tH.js",
    "revision": null
  }, {
    "url": "assets/js/vendor-tf3Ilbry.js",
    "revision": null
  }, {
    "url": "assets/js/utils-BjHvLfi6.js",
    "revision": null
  }, {
    "url": "assets/js/TermsOfService-DxY4VcLP.js",
    "revision": null
  }, {
    "url": "assets/js/TenantAuthPage-CTe78Tmi.js",
    "revision": null
  }, {
    "url": "assets/js/tabs-DIV7VbLY.js",
    "revision": null
  }, {
    "url": "assets/js/Support-B5pbsJad.js",
    "revision": null
  }, {
    "url": "assets/js/square-FmAB4oG6.js",
    "revision": null
  }, {
    "url": "assets/js/SignupPage-D0297v_K.js",
    "revision": null
  }, {
    "url": "assets/js/Settings-CDwP3Bk2.js",
    "revision": null
  }, {
    "url": "assets/js/separator-uMVKzLWy.js",
    "revision": null
  }, {
    "url": "assets/js/sentry-CE0uQ5_m.js",
    "revision": null
  }, {
    "url": "assets/js/sentry-BJ_XQiAL.js",
    "revision": null
  }, {
    "url": "assets/js/router-wfFXilXK.js",
    "revision": null
  }, {
    "url": "assets/js/radix-overlays-zO7FUh6i.js",
    "revision": null
  }, {
    "url": "assets/js/radix-layout-DJl1sv6-.js",
    "revision": null
  }, {
    "url": "assets/js/radix-forms-BM0vnbEW.js",
    "revision": null
  }, {
    "url": "assets/js/radix-core-UYtkzGXG.js",
    "revision": null
  }, {
    "url": "assets/js/query-DekEGfwq.js",
    "revision": null
  }, {
    "url": "assets/js/pwa-l0sNRNKZ.js",
    "revision": null
  }, {
    "url": "assets/js/progress-rKdeq7p3.js",
    "revision": null
  }, {
    "url": "assets/js/PrivacyPolicy-BbORVxCQ.js",
    "revision": null
  }, {
    "url": "assets/js/PalletCounter-C--VWu1W.js",
    "revision": null
  }, {
    "url": "assets/js/NotFound-zl_28NTE.js",
    "revision": null
  }, {
    "url": "assets/js/Notes-BRxyWI1q.js",
    "revision": null
  }, {
    "url": "assets/js/motion-Y5unnI9k.js",
    "revision": null
  }, {
    "url": "assets/js/misc-DQazhydP.js",
    "revision": null
  }, {
    "url": "assets/js/Maps-3nUpMTH6.js",
    "revision": null
  }, {
    "url": "assets/js/LandingPage-_U0_ufl4.js",
    "revision": null
  }, {
    "url": "assets/js/index-RzrRTIzh.js",
    "revision": null
  }, {
    "url": "assets/js/firebase-l0sNRNKZ.js",
    "revision": null
  }, {
    "url": "assets/js/DataExport-D8mA7xow.js",
    "revision": null
  }, {
    "url": "assets/js/Dashboard-BFOj87Uc.js",
    "revision": null
  }, {
    "url": "assets/js/charts-Brw45gM8.js",
    "revision": null
  }, {
    "url": "assets/js/Analytics-D-hlnCVZ.js",
    "revision": null
  }, {
    "url": "assets/js/alert-DlI2F0aa.js",
    "revision": null
  }, {
    "url": "assets/js/AdminLogin-CbHIujIZ.js",
    "revision": null
  }, {
    "url": "assets/js/AdminDashboard-SXpHB7CI.js",
    "revision": null
  }, {
    "url": "assets/css/index-iu3N-FG-.css",
    "revision": null
  }, {
    "url": "favicon.ico",
    "revision": "ad1a6f4c5183484aea75bd061d11fc25"
  }, {
    "url": "offline.html",
    "revision": "52a10c8d7f758c78ded75d933b60af2d"
  }, {
    "url": "icons/icon-128x128.png",
    "revision": "6843bb3e9cbbed783bd939a283b7ee21"
  }, {
    "url": "icons/icon-144x144.png",
    "revision": "e0a0d071987a6c575788fecd3bf1d36d"
  }, {
    "url": "icons/icon-152x152.png",
    "revision": "ef7331ef310406584e49630db6eb6d0b"
  }, {
    "url": "icons/icon-180x180.png",
    "revision": "62171a1c2c32d22df167cef34802b07a"
  }, {
    "url": "icons/icon-192x192.png",
    "revision": "62171a1c2c32d22df167cef34802b07a"
  }, {
    "url": "icons/icon-384x384.png",
    "revision": "62bd53f5339602483bc2b7484dd13705"
  }, {
    "url": "icons/icon-512x512.png",
    "revision": "4d8ce60038077550f452f30389550703"
  }, {
    "url": "icons/icon-72x72.png",
    "revision": "977c9916c323295f6e340cc46ad59ba5"
  }, {
    "url": "icons/icon-96x96.png",
    "revision": "71beeec395f2dfa4399d5674bd8cf431"
  }, {
    "url": "manifest.webmanifest",
    "revision": "488ede29760db18dd15f4a2667e913f8"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("/offline.html"), {
    allowlist: [/^(?!\/__).*/],
    denylist: [/^\/api\//]
  }));
  workbox.registerRoute(/^https:\/\/api\.(deepseek|openai)\.com\/.*/i, new workbox.NetworkFirst({
    "cacheName": "api-cache",
    "networkTimeoutSeconds": 10,
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 50,
      maxAgeSeconds: 604800
    })]
  }), 'GET');
  workbox.registerRoute(/\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/i, new workbox.CacheFirst({
    "cacheName": "images-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 200,
      maxAgeSeconds: 2592000
    })]
  }), 'GET');
  workbox.registerRoute(/\.(?:css|js)$/i, new workbox.StaleWhileRevalidate({
    "cacheName": "static-assets",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 100,
      maxAgeSeconds: 2592000
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\/fonts\.googleapis\.com\/.*/i, new workbox.StaleWhileRevalidate({
    "cacheName": "google-fonts-stylesheets",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 30,
      maxAgeSeconds: 31536000
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\/fonts\.gstatic\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "google-fonts-webfonts",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 30,
      maxAgeSeconds: 31536000
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\/cdn\..*/i, new workbox.CacheFirst({
    "cacheName": "cdn-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 50,
      maxAgeSeconds: 2592000
    })]
  }), 'GET');

}));
