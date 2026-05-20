import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { URL } from 'node:url';

const PORT = Number.parseInt(process.env.PORT ?? '9001', 10);
const HOST = process.env.HOST ?? (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1');

const nowIso = () => new Date().toISOString();

const state = {
  customers: [],
  leads: [],
  invoices: [],
  contacts: [],
};

const sendJson = (res, statusCode, payload, origin = '*') => {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  });
  res.end(JSON.stringify(payload));
};

const sendNoContent = (res, origin = '*') => {
  res.writeHead(204, {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  });
  res.end();
};

const readJsonBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  if (chunks.length === 0) {
    return {};
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const extractId = (pathname, prefix) => {
  if (!pathname.startsWith(prefix)) {
    return null;
  }
  const value = pathname.slice(prefix.length).trim();
  return value.length > 0 ? value : null;
};

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin ?? '*';
  const method = req.method ?? 'GET';
  const parsedUrl = new URL(req.url ?? '/', `http://${HOST}:${PORT}`);
  const { pathname } = parsedUrl;

  if (method === 'OPTIONS') {
    return sendNoContent(res, origin);
  }

  if (method === 'GET' && pathname === '/api/health') {
    return sendJson(
      res,
      200,
      {
        ok: true,
        app: 'vibe-tech-lovable',
        status: 'ok',
        database: 'D:\\vibe-tech-data\\vibetech.db',
        service: 'vibe-tech-lovable-local-backend',
        timestamp: nowIso(),
      },
      origin
    );
  }

  if (method === 'GET' && pathname === '/api/customers') {
    return sendJson(res, 200, state.customers, origin);
  }

  if (method === 'POST' && pathname === '/api/customers') {
    const body = await readJsonBody(req);
    if (!body) {
      return sendJson(res, 400, { error: 'Invalid JSON body' }, origin);
    }

    const customer = {
      id: randomUUID(),
      email: body.email ?? '',
      full_name: body.full_name ?? '',
      phone: body.phone ?? null,
      created_at: nowIso(),
    };
    state.customers.push(customer);
    return sendJson(res, 200, customer, origin);
  }

  if (method === 'PUT' && pathname.startsWith('/api/customers/')) {
    const customerId = extractId(pathname, '/api/customers/');
    const body = await readJsonBody(req);
    if (!customerId || !body) {
      return sendJson(res, 400, { error: 'Invalid request' }, origin);
    }

    const idx = state.customers.findIndex((item) => item.id === customerId);
    if (idx < 0) {
      return sendJson(res, 404, { error: 'Customer not found' }, origin);
    }

    state.customers[idx] = {
      ...state.customers[idx],
      ...body,
    };
    return sendJson(res, 200, state.customers[idx], origin);
  }

  if (method === 'DELETE' && pathname.startsWith('/api/customers/')) {
    const customerId = extractId(pathname, '/api/customers/');
    const idx = state.customers.findIndex((item) => item.id === customerId);
    if (!customerId || idx < 0) {
      return sendJson(res, 404, { error: 'Customer not found' }, origin);
    }
    state.customers.splice(idx, 1);
    return sendNoContent(res, origin);
  }

  if (method === 'GET' && pathname === '/api/leads') {
    return sendJson(res, 200, state.leads, origin);
  }

  if (method === 'POST' && pathname === '/api/leads') {
    const body = await readJsonBody(req);
    if (!body) {
      return sendJson(res, 400, { error: 'Invalid JSON body' }, origin);
    }

    const lead = {
      id: randomUUID(),
      company_name: body.company_name ?? '',
      contact_email: body.contact_email ?? '',
      contact_name: body.contact_name ?? '',
      phone: body.phone ?? null,
      notes: body.notes ?? null,
      status: body.status ?? 'new',
      created_at: nowIso(),
    };
    state.leads.push(lead);
    return sendJson(res, 200, lead, origin);
  }

  if (method === 'PUT' && pathname.startsWith('/api/leads/')) {
    const leadId = extractId(pathname, '/api/leads/');
    const body = await readJsonBody(req);
    if (!leadId || !body) {
      return sendJson(res, 400, { error: 'Invalid request' }, origin);
    }

    const idx = state.leads.findIndex((item) => item.id === leadId);
    if (idx < 0) {
      return sendJson(res, 404, { error: 'Lead not found' }, origin);
    }

    state.leads[idx] = {
      ...state.leads[idx],
      ...body,
    };
    return sendJson(res, 200, state.leads[idx], origin);
  }

  if (method === 'DELETE' && pathname.startsWith('/api/leads/')) {
    const leadId = extractId(pathname, '/api/leads/');
    const idx = state.leads.findIndex((item) => item.id === leadId);
    if (!leadId || idx < 0) {
      return sendJson(res, 404, { error: 'Lead not found' }, origin);
    }
    state.leads.splice(idx, 1);
    return sendNoContent(res, origin);
  }

  if (method === 'GET' && pathname === '/api/invoices') {
    return sendJson(res, 200, state.invoices, origin);
  }

  if (method === 'POST' && pathname === '/api/invoices') {
    const body = await readJsonBody(req);
    if (!body) {
      return sendJson(res, 400, { error: 'Invalid JSON body' }, origin);
    }

    const invoice = {
      id: randomUUID(),
      amount_cents: Number(body.amount_cents ?? 0),
      job_id: body.job_id ?? null,
      paid: Boolean(body.paid ?? false),
      issued_at: nowIso(),
    };
    state.invoices.push(invoice);
    return sendJson(res, 200, invoice, origin);
  }

  if (method === 'POST' && pathname === '/api/contact') {
    const body = await readJsonBody(req);
    if (!body) {
      return sendJson(res, 400, { error: 'Invalid JSON body' }, origin);
    }

    const name = String(body.name ?? '').trim();
    const email = String(body.email ?? '').trim();
    const message = String(body.message ?? '').trim();

    if (!name || !email || !message) {
      return sendJson(res, 400, { error: 'name, email, and message are required' }, origin);
    }

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return sendJson(res, 400, { error: 'Please provide a valid email address' }, origin);
    }

    const contact = {
      id: randomUUID(),
      name,
      email,
      subject: String(body.subject ?? '').trim(),
      message,
      created_at: nowIso(),
    };
    state.contacts.push(contact);
    return sendJson(res, 200, { success: true, id: contact.id }, origin);
  }

  return sendJson(res, 404, { error: 'Not found', path: pathname }, origin);
});

server.listen(PORT, HOST, () => {
  console.log(`vibe-tech-lovable local backend listening on http://${HOST}:${PORT}`);
});

