export const config = {
  runtime: 'edge',
};

interface ScanRequest {
  url: string;
  email: string;
}

interface CheckResult {
  status: 'pass' | 'fail' | 'unknown';
  details?: string;
}

interface ScanResult {
  url: string;
  timestamp: string;
  checks: {
    robotsTxt: CheckResult;
    sitemapXml: CheckResult;
    llmsTxt: CheckResult;
    jsonLd: CheckResult;
    mcpWellKnown: CheckResult;
    mcpJson: CheckResult;
    mcpPath: CheckResult;
    homepageAccess: CheckResult;
  };
  score: number;
}

async function checkUrl(url: string): Promise<CheckResult> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'User-Agent': 'WebMCP-Scanner/1.0' },
      signal: AbortSignal.timeout(5000),
    });

    if (response.status === 401 || response.status === 403) {
      return { status: 'fail', details: `HTTP ${response.status}` };
    }

    if (response.ok) {
      return { status: 'pass', details: `HTTP ${response.status}` };
    }

    return { status: 'fail', details: `HTTP ${response.status}` };
  } catch (error) {
    return { status: 'unknown', details: 'Request failed or timed out' };
  }
}

async function checkRobotsTxt(baseUrl: string): Promise<CheckResult> {
  try {
    const response = await fetch(`${baseUrl}/robots.txt`, {
      method: 'GET',
      headers: { 'User-Agent': 'WebMCP-Scanner/1.0' },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return { status: 'fail', details: 'Not found' };
    }

    const text = await response.text();
    const hasDisallow = /Disallow:/i.test(text);

    if (hasDisallow) {
      return { status: 'pass', details: 'Found with Disallow rules' };
    }

    return { status: 'pass', details: 'Found' };
  } catch (error) {
    return { status: 'unknown', details: 'Request failed' };
  }
}

async function checkJsonLd(baseUrl: string): Promise<CheckResult> {
  try {
    const response = await fetch(baseUrl, {
      method: 'GET',
      headers: { 'User-Agent': 'WebMCP-Scanner/1.0' },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return { status: 'unknown', details: 'Could not fetch homepage' };
    }

    const html = await response.text();
    const hasJsonLd = /<script[^>]*type=["']application\/ld\+json["'][^>]*>/i.test(html);
    const hasSchemaOrg = /schema\.org/i.test(html);

    if (hasJsonLd || hasSchemaOrg) {
      return { status: 'pass', details: 'Found structured data' };
    }

    return { status: 'fail', details: 'No structured data found' };
  } catch (error) {
    return { status: 'unknown', details: 'Request failed' };
  }
}

export default async function handler(request: Request) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = (await request.json()) as ScanRequest;
    const { url, email } = body;

    if (!url || !email) {
      return new Response(JSON.stringify({ error: 'URL and email required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate URL
    let baseUrl: string;
    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
        throw new Error('Invalid protocol');
      }
      baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Invalid URL' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Run all checks
    const [
      homepageAccess,
      robotsTxt,
      sitemapXml,
      llmsTxt,
      jsonLd,
      mcpWellKnown,
      mcpJson,
      mcpPath,
    ] = await Promise.all([
      checkUrl(baseUrl),
      checkRobotsTxt(baseUrl),
      checkUrl(`${baseUrl}/sitemap.xml`),
      checkUrl(`${baseUrl}/llms.txt`),
      checkJsonLd(baseUrl),
      checkUrl(`${baseUrl}/.well-known/mcp.json`),
      checkUrl(`${baseUrl}/mcp.json`),
      checkUrl(`${baseUrl}/mcp`),
    ]);

    // Calculate score
    const checks = {
      homepageAccess,
      robotsTxt,
      sitemapXml,
      llmsTxt,
      jsonLd,
      mcpWellKnown,
      mcpJson,
      mcpPath,
    };

    const score = Object.values(checks).filter((check) => check.status === 'pass').length;

    const result: ScanResult = {
      url: baseUrl,
      timestamp: new Date().toISOString(),
      checks,
      score,
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
