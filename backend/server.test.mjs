// @ts-nocheck
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Set test DB path before importing server
const testDbPath = path.join(__dirname, 'data', 'test-backend.db');
process.env.TEST_DB_PATH = testDbPath;

// Dynamic import for CommonJS server
const { app, initDb, closeDb } = await import('./server.js');

describe('Backend API', () => {
    beforeAll(async () => {
        if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
        await initDb();
    });

    afterAll(async () => {
        await closeDb();
        if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
    });

    describe('GET /', () => {
        it('returns API info', async () => {
            const res = await request(app).get('/');
            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Vibe Tech Backend API');
        });
    });

    describe('GET /api/health', () => {
        it('returns health status', async () => {
            const res = await request(app).get('/api/health');
            expect(res.status).toBe(200);
            expect(res.body.status).toBe('ok');
        });

        it('returns uptime field', async () => {
            const res = await request(app).get('/api/health');
            expect(res.status).toBe(200);
            expect(res.body.uptime).toBeDefined();
            expect(typeof res.body.uptime).toBe('number');
            expect(res.body.uptime).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Customers API', () => {
        let customerId;

        it('POST creates customer', async () => {
            const res = await request(app)
                .post('/api/customers')
                .send({ email: 'test@example.com', full_name: 'Test User', phone: '555-1234' });
            expect(res.status).toBe(201);
            expect(res.body.email).toBe('test@example.com');
            customerId = res.body.id;
        });

        it('GET returns customers', async () => {
            const res = await request(app).get('/api/customers');
            expect(res.status).toBe(200);
            expect(res.body.length).toBeGreaterThan(0);
        });

        it('PUT updates customer', async () => {
            const res = await request(app)
                .put(`/api/customers/${customerId}`)
                .send({ email: 'updated@example.com', full_name: 'Updated', phone: '555-9999' });
            expect(res.status).toBe(200);
            expect(res.body.email).toBe('updated@example.com');
        });

        it('DELETE removes customer', async () => {
            const res = await request(app).delete(`/api/customers/${customerId}`);
            expect(res.status).toBe(204);
        });
    });

    describe('Leads API', () => {
        let leadId;

        it('POST creates lead', async () => {
            const res = await request(app)
                .post('/api/leads')
                .send({ company_name: 'Test Corp', contact_email: 'lead@test.com', contact_name: 'Lead' });
            expect(res.status).toBe(201);
            expect(res.body.status).toBe('new');
            leadId = res.body.id;
        });

        it('GET returns leads', async () => {
            const res = await request(app).get('/api/leads');
            expect(res.status).toBe(200);
        });

        it('PUT updates lead', async () => {
            const res = await request(app)
                .put(`/api/leads/${leadId}`)
                .send({ company_name: 'Updated Corp', contact_email: 'updated@test.com', contact_name: 'Updated Lead', status: 'qualified' });
            expect(res.status).toBe(200);
            expect(res.body.company_name).toBe('Updated Corp');
            expect(res.body.status).toBe('qualified');
        });

        it('DELETE removes lead', async () => {
            const res = await request(app).delete(`/api/leads/${leadId}`);
            expect(res.status).toBe(204);
        });
    });

    describe('Invoices API', () => {
        it('POST creates invoice', async () => {
            const res = await request(app)
                .post('/api/invoices')
                .send({ amount_cents: 10000, job_id: 'job-123' });
            expect(res.status).toBe(201);
            expect(res.body.amount_cents).toBe(10000);
        });

        it('GET returns invoices', async () => {
            const res = await request(app).get('/api/invoices');
            expect(res.status).toBe(200);
        });
    });

    describe('Blog API', () => {
        let postId;

        it('POST creates post', async () => {
            const res = await request(app)
                .post('/api/blog')
                .send({ title: 'Test Post', content: 'Content', category: 'tech', published: true });
            expect(res.status).toBe(201);
            expect(res.body.slug).toBe('test-post');
            postId = res.body.id;
        });

        it('POST requires title and content', async () => {
            const res = await request(app).post('/api/blog').send({ title: 'No content' });
            expect(res.status).toBe(400);
        });

        it('GET returns posts', async () => {
            const res = await request(app).get('/api/blog');
            expect(res.status).toBe(200);
        });

        it('GET by slug works', async () => {
            const res = await request(app).get('/api/blog/test-post');
            expect(res.status).toBe(200);
            expect(res.body.title).toBe('Test Post');
        });

        it('GET returns 404 for missing', async () => {
            const res = await request(app).get('/api/blog/nonexistent');
            expect(res.status).toBe(404);
        });

        it('DELETE removes post', async () => {
            const res = await request(app).delete(`/api/blog/${postId}`);
            expect(res.status).toBe(204);
        });
    });
});
