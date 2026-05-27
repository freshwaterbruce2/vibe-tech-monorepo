// Workbox configuration for service worker generation
module.exports = {
  globDirectory: 'dist/',
  globPatterns: ['**/*.{html,js,css}'],
  swDest: 'dist/serviceWorker.js'
}; 