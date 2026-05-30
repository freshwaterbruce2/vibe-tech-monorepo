/**
 * Auto-generated OpenAPI MCP Server Bridge.
 * Maps openapi.json routes to type-safe MCP tools.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export const server = new McpServer({
  name: 'monetized-mcp-openapi-bridge',
  version: '1.0.0',
});


// Tool: api_health_get
server.tool(
  'api_health_get',
  `GET request to /api/health`,
  {
    params: z.record(z.string(), z.any()).optional().describe('JSON parameters for request body/query'),
  },
  async ({ params }) => {
    try {
      const url = 'http://127.0.0.1:5300' + '/api/health';
      const isGet = true;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        body: isGet ? undefined : JSON.stringify(params || {}),
      });
      
      const text = await response.text();
      return {
        content: [{ type: 'text', text }],
      };
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `Error calling endpoint: ${error.message}` }],
        isError: true,
      };
    }
  }
);

// Tool: api_webhooks_stripe_post
server.tool(
  'api_webhooks_stripe_post',
  `POST request to /api/webhooks/stripe`,
  {
    params: z.record(z.string(), z.any()).optional().describe('JSON parameters for request body/query'),
  },
  async ({ params }) => {
    try {
      const url = 'http://127.0.0.1:5300' + '/api/webhooks/stripe';
      const isGet = false;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: isGet ? undefined : JSON.stringify(params || {}),
      });
      
      const text = await response.text();
      return {
        content: [{ type: 'text', text }],
      };
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `Error calling endpoint: ${error.message}` }],
        isError: true,
      };
    }
  }
);

// Tool: api_auth_me_get
server.tool(
  'api_auth_me_get',
  `GET request to /api/auth/me`,
  {
    params: z.record(z.string(), z.any()).optional().describe('JSON parameters for request body/query'),
  },
  async ({ params }) => {
    try {
      const url = 'http://127.0.0.1:5300' + '/api/auth/me';
      const isGet = true;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        body: isGet ? undefined : JSON.stringify(params || {}),
      });
      
      const text = await response.text();
      return {
        content: [{ type: 'text', text }],
      };
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `Error calling endpoint: ${error.message}` }],
        isError: true,
      };
    }
  }
);

// Tool: api_auth_login_post
server.tool(
  'api_auth_login_post',
  `POST request to /api/auth/login`,
  {
    params: z.record(z.string(), z.any()).optional().describe('JSON parameters for request body/query'),
  },
  async ({ params }) => {
    try {
      const url = 'http://127.0.0.1:5300' + '/api/auth/login';
      const isGet = false;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: isGet ? undefined : JSON.stringify(params || {}),
      });
      
      const text = await response.text();
      return {
        content: [{ type: 'text', text }],
      };
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `Error calling endpoint: ${error.message}` }],
        isError: true,
      };
    }
  }
);

// Tool: api_auth_logout_post
server.tool(
  'api_auth_logout_post',
  `POST request to /api/auth/logout`,
  {
    params: z.record(z.string(), z.any()).optional().describe('JSON parameters for request body/query'),
  },
  async ({ params }) => {
    try {
      const url = 'http://127.0.0.1:5300' + '/api/auth/logout';
      const isGet = false;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: isGet ? undefined : JSON.stringify(params || {}),
      });
      
      const text = await response.text();
      return {
        content: [{ type: 'text', text }],
      };
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `Error calling endpoint: ${error.message}` }],
        isError: true,
      };
    }
  }
);

// Tool: api_pro_get
server.tool(
  'api_pro_get',
  `GET request to /api/pro`,
  {
    params: z.record(z.string(), z.any()).optional().describe('JSON parameters for request body/query'),
  },
  async ({ params }) => {
    try {
      const url = 'http://127.0.0.1:5300' + '/api/pro';
      const isGet = true;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        body: isGet ? undefined : JSON.stringify(params || {}),
      });
      
      const text = await response.text();
      return {
        content: [{ type: 'text', text }],
      };
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `Error calling endpoint: ${error.message}` }],
        isError: true,
      };
    }
  }
);

// Tool: api_emails_demo_receipt_get
server.tool(
  'api_emails_demo_receipt_get',
  `GET request to /api/emails/demo-receipt`,
  {
    params: z.record(z.string(), z.any()).optional().describe('JSON parameters for request body/query'),
  },
  async ({ params }) => {
    try {
      const url = 'http://127.0.0.1:5300' + '/api/emails/demo-receipt';
      const isGet = true;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        body: isGet ? undefined : JSON.stringify(params || {}),
      });
      
      const text = await response.text();
      return {
        content: [{ type: 'text', text }],
      };
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `Error calling endpoint: ${error.message}` }],
        isError: true,
      };
    }
  }
);

// Tool: api_pro_rewrite_post
server.tool(
  'api_pro_rewrite_post',
  `POST request to /api/pro/rewrite`,
  {
    params: z.record(z.string(), z.any()).optional().describe('JSON parameters for request body/query'),
  },
  async ({ params }) => {
    try {
      const url = 'http://127.0.0.1:5300' + '/api/pro/rewrite';
      const isGet = false;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: isGet ? undefined : JSON.stringify(params || {}),
      });
      
      const text = await response.text();
      return {
        content: [{ type: 'text', text }],
      };
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `Error calling endpoint: ${error.message}` }],
        isError: true,
      };
    }
  }
);

// Tool: api_billing_demo_checkout_get
server.tool(
  'api_billing_demo_checkout_get',
  `GET request to /api/billing/demo-checkout`,
  {
    params: z.record(z.string(), z.any()).optional().describe('JSON parameters for request body/query'),
  },
  async ({ params }) => {
    try {
      const url = 'http://127.0.0.1:5300' + '/api/billing/demo-checkout';
      const isGet = true;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        body: isGet ? undefined : JSON.stringify(params || {}),
      });
      
      const text = await response.text();
      return {
        content: [{ type: 'text', text }],
      };
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `Error calling endpoint: ${error.message}` }],
        isError: true,
      };
    }
  }
);

// Tool: api_ai_demo_usage_post
server.tool(
  'api_ai_demo_usage_post',
  `POST request to /api/ai/demo-usage`,
  {
    params: z.record(z.string(), z.any()).optional().describe('JSON parameters for request body/query'),
  },
  async ({ params }) => {
    try {
      const url = 'http://127.0.0.1:5300' + '/api/ai/demo-usage';
      const isGet = false;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: isGet ? undefined : JSON.stringify(params || {}),
      });
      
      const text = await response.text();
      return {
        content: [{ type: 'text', text }],
      };
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `Error calling endpoint: ${error.message}` }],
        isError: true,
      };
    }
  }
);

