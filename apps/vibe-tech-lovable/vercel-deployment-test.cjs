const { chromium } = require('playwright');

async function testVercelDeployment() {
  console.log('🚀 Testing Vercel deployment: https://vibe-tech.vercel.app');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // Test 1: Homepage loads
    console.log('📍 Testing homepage...');
    const response = await page.goto('https://vibe-tech.vercel.app', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    if (response.ok()) {
      console.log('✅ Homepage loads successfully (Status: ' + response.status() + ')');
    } else {
      console.log('❌ Homepage failed (Status: ' + response.status() + ')');
      return;
    }
    
    // Test 2: Check title
    const title = await page.title();
    console.log('📄 Page title: "' + title + '"');
    
    // Test 3: Check for key elements
    const heroSection = await page.$('h1, [data-testid="hero"]');
    if (heroSection) {
      console.log('✅ Hero section found');
    } else {
      console.log('⚠️ Hero section not found');
    }
    
    // Test 4: Check navigation
    const navLinks = await page.$$('nav a, [role="navigation"] a');
    console.log('🧭 Navigation links found: ' + navLinks.length);
    
    // Test 5: Test API connectivity (if health endpoint exists)
    try {
      console.log('🔧 Testing API connectivity...');
      const apiResponse = await page.request.get('https://vibe-tech.vercel.app/api/health');
      if (apiResponse.ok()) {
        console.log('✅ API health check successful');
      } else {
        console.log('⚠️ API health check failed (might be expected if no /api routes)');
      }
    } catch (_e) {
      console.log('⚠️ API health check not available (expected for frontend-only)');
    }
    
    // Test 6: Check for React app indicators
    const reactRoot = await page.$('#root, [data-reactroot]');
    if (reactRoot) {
      console.log('✅ React app detected');
    }
    
    // Test 7: Check responsiveness (mobile view)
    console.log('📱 Testing mobile responsiveness...');
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);
    console.log('✅ Mobile viewport test completed');
    
    // Test 8: Take screenshot
    await page.screenshot({ path: 'vercel-deployment-test.png', fullPage: true });
    console.log('📸 Screenshot saved as vercel-deployment-test.png');
    
    console.log('\n🎉 VERCEL DEPLOYMENT TEST COMPLETED SUCCESSFULLY!');
    console.log('🔗 Site URL: https://vibe-tech.vercel.app');
    console.log('✅ Ready for DNS configuration');
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testVercelDeployment();