const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');

async function runLighthouse() {
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
  const options = {
    logLevel: 'info',
    output: 'html',
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo', 'pwa'],
    port: chrome.port
  };

  const runnerResult = await lighthouse('http://localhost:3000', options);
  const reportHtml = runnerResult.report;
  require('fs').writeFileSync('lighthouse-report.html', reportHtml);

  await chrome.kill();
}

runLighthouse(); 