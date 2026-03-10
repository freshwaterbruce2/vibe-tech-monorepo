/**
 * Performance Monitor Hook
 * Runs performance profiling and generates reports
 */

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const APP_DIR = path.join(__dirname, '..');
const REPORTS_DIR = path.join(APP_DIR, 'performance-reports');

// Ensure reports directory exists
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

console.log('🚀 Starting Performance Profiling...\n');

// Run Vite bundle analysis
console.log('📊 Analyzing bundle size...');
const analyze = spawn('npm', ['run', 'build:analyze'], {
  cwd: APP_DIR,
  shell: true,
  stdio: 'inherit'
});

analyze.on('close', (code) => {
  if (code === 0) {
    console.log('✅ Bundle analysis complete');
    console.log(`📁 Check stats.html in project root\n`);
  } else {
    console.warn(`⚠️  Bundle analysis failed with code ${code}\n`);
  }

  // Generate performance report
  generateReport();
});

function generateReport() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(REPORTS_DIR, `performance-${timestamp}.md`);

  const report = `# Performance Profiling Report
**Generated:** ${new Date().toLocaleString()}
**Node Version:** ${process.version}

## Bundle Size Analysis
Run \`npm run build:analyze\` and check \`stats.html\` for detailed bundle visualization.

## Memory Profiling
Run the app with \`npm run hook:memory\` for memory monitoring.

## Performance Metrics
To collect real-time metrics:
1. Start app: \`npm run dev\`
2. In DevTools Console, run:
   \`\`\`javascript
   window.electron.performance.startRecording()
   // Use the app for ~60 seconds
   window.electron.performance.stopRecording()
   \`\`\`
3. Check traces in: \`${path.join(process.env.APPDATA || '', 'vibe-code-studio', 'traces')}\`

## Optimization Recommendations
- ✅ Lazy load Monaco editor
- ✅ Code splitting by route
- ⏳ Analyze and reduce bundle size
- ⏳ Optimize re-renders with React.memo
- ⏳ Implement virtual scrolling for large lists
- ⏳ Defer non-critical JS loading

## Performance Targets (2026 Standards)
- **Time to Interactive (TTI):** < 3s
- **First Contentful Paint (FCP):** < 1.5s
- **Largest Contentful Paint (LCP):** < 2.5s
- **Total Blocking Time (TBT):** < 300ms
- **Cumulative Layout Shift (CLS):** < 0.1

## Next Steps
1. Identify largest bundle chunks
2. Implement code splitting for routes
3. Lazy load heavy dependencies (Monaco, AI services)
4. Optimize component re-renders
5. Run Lighthouse audit for detailed metrics
`;

  fs.writeFileSync(reportPath, report, 'utf-8');
  console.log(`✅ Performance report generated: ${reportPath}\n`);
  console.log('📝 To view: code ' + reportPath);
}
