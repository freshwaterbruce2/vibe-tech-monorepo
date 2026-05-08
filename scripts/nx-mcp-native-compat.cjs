const fs = require('node:fs');
const Module = require('node:module');

const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function resolveNxNativeCompat(request, parent, isMain, options) {
  if (typeof request === 'string') {
    const normalizedRequest = request.replace(/\\/g, '/');
    const nxNativeSuffixes = [
      '/node_modules/nx/src/native',
      '/node_modules/nx/src/native/index',
      '/node_modules/nx/src/native/index.js',
    ];

    for (const suffix of nxNativeSuffixes) {
      if (normalizedRequest.endsWith(suffix)) {
        // nx-mcp dereferences Nx internals by path; Nx 22 publishes this module under dist.
        const nxRoot = normalizedRequest.slice(0, normalizedRequest.length - suffix.length);
        const distNative = `${nxRoot}/node_modules/nx/dist/src/native/index.js`;

        if (fs.existsSync(distNative)) {
          return distNative;
        }
      }
    }
  }

  return originalResolveFilename.call(this, request, parent, isMain, options);
};
