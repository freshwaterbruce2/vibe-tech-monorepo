// @ts-check
// Production-ready Express server for Vibe Tech

require('dotenv').config();

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const compression = require('compression');

const { getDatabaseConfig } = require('./config/database');
const { logger, requestLogger } = require('./config/logger');
const {
  securityHeaders,
  authRateLimit,
  apiRateLimit,
  validateRequest,
  blogValidation,
  leadValidation,
  errorHandler,
} = require('./middleware/security');

/** @typedef {{ id: string; title?: string }} BlogRow */
/** @typedef {{ id: string }} LeadRow */
/** @typedef {{ message?: string }} ErrorLike */
/** @typedef {(err: Error | null, allow?: boolean) => void} CorsCallback */
/** @typedef {import('sqlite3').Database} SqliteDatabase */
/** @typedef {import('sqlite3').RunResult} SqliteRunResult */

const app = express();

/**
 * @param {string | number | undefined} value
 * @param {number} fallback
 * @returns {number}
 */
function parsePort(value, fallback) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

/**
 * @param {unknown} error
 * @returns {string}
 */
function getErrorMessage(error) {
  return typeof error === 'object' && error !== null && 'message' in error
    ? String((/** @type {ErrorLike} */ (error)).message)
    : 'Unknown error';
}

/**
 * @returns {SqliteDatabase}
 */
function getDbOrThrow() {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

const PORT = parsePort(process.env.PORT, 3000);

app.set('trust proxy', 1);
app.use(securityHeaders);
app.use(compression());

const corsOptions = {
  /** @param {string | undefined} origin @param {CorsCallback} callback */
  origin(origin, callback) {
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:8082')
      .split(',')
      .map((url) => url.trim());

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    logger.warn('CORS blocked request', { origin, allowedOrigins });
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestLogger);
app.use('/api/', apiRateLimit);

/** @type {SqliteDatabase | null} */
let db = null;

function initializeDatabase() {
  const dbConfig = getDatabaseConfig();

  logger.info('Initializing database', {
    path: dbConfig.path,
    directory: dbConfig.directory,
    isProduction: dbConfig.isProduction,
  });

  db = new sqlite3.Database(
    dbConfig.path,
    /** @param {Error | null} err */
    (err) => {
      if (err) {
        logger.error('Database connection failed', { error: err.message, path: dbConfig.path });
        process.exit(1);
        return;
      }

      logger.info('Database connected successfully', { path: dbConfig.path });
      createTables();
    }
  );
}

function createTables() {
  const database = getDbOrThrow();
  database.serialize(() => {
    database.run(
      `
      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        full_name TEXT NOT NULL,
        phone TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `,
      /** @param {Error | null} err */
      (err) => {
        if (err) logger.error('Failed to create customers table', { error: err.message });
      }
    );

    database.run(
      `
      CREATE TABLE IF NOT EXISTS invoices (
        id TEXT PRIMARY KEY,
        amount_cents INTEGER NOT NULL,
        issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        job_id TEXT,
        paid BOOLEAN DEFAULT 0
      )
    `,
      /** @param {Error | null} err */
      (err) => {
        if (err) logger.error('Failed to create invoices table', { error: err.message });
      }
    );

    database.run(
      `
      CREATE TABLE IF NOT EXISTS leads (
        id TEXT PRIMARY KEY,
        company_name TEXT NOT NULL,
        contact_email TEXT NOT NULL,
        contact_name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        phone TEXT,
        status TEXT DEFAULT 'new'
      )
    `,
      /** @param {Error | null} err */
      (err) => {
        if (err) logger.error('Failed to create leads table', { error: err.message });
      }
    );

    database.run(
      `
      CREATE TABLE IF NOT EXISTS blog_posts (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        excerpt TEXT,
        content TEXT NOT NULL,
        category TEXT NOT NULL,
        author TEXT DEFAULT 'Vibe Tech',
        image TEXT,
        tags TEXT,
        featured BOOLEAN DEFAULT 0,
        published BOOLEAN DEFAULT 0,
        seo_title TEXT,
        seo_description TEXT,
        focus_keyword TEXT,
        canonical_url TEXT,
        no_index BOOLEAN DEFAULT 0,
        no_follow BOOLEAN DEFAULT 0,
        affiliate_recommendations TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        published_at DATETIME
      )
    `,
      /** @param {Error | null} err */
      (err) => {
        if (err) {
          logger.error('Failed to create blog_posts table', { error: err.message });
          return;
        }
        logger.info('Database tables initialized successfully');
      }
    );
  });
}

app.get('/health', (_req, res) => {
  const healthCheck = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: Date.now(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
  };

  try {
    return res.status(200).json(healthCheck);
  } catch (error) {
    healthCheck.message = getErrorMessage(error);
    return res.status(503).json(healthCheck);
  }
});

app.post('/api/auth', authRateLimit, (req, res) => {
  const { password } = req.body;

  if (!password) {
    logger.warn('Authentication attempt without password', { ip: req.ip });
    return res.status(400).json({ error: 'Password is required' });
  }

  if (password === process.env.ADMIN_PASSWORD) {
    logger.info('Successful authentication', { ip: req.ip });
    return res.json({ success: true, message: 'Authentication successful' });
  }

  logger.warn('Failed authentication attempt', { ip: req.ip });
  return res.status(401).json({ error: 'Invalid password' });
});

app.get('/api/blog', (req, res) => {
  const { published } = req.query;
  let query = 'SELECT * FROM blog_posts';
  /** @type {unknown[]} */
  const params = [];

  if (published === 'true') {
    query += ' WHERE published = 1';
  }
  query += ' ORDER BY created_at DESC';

  getDbOrThrow().all(
    query,
    params,
    /** @param {Error | null} err @param {BlogRow[]} rows */
    (err, rows = []) => {
      if (err) {
        logger.error('Failed to fetch blog posts', { error: err.message, query });
        return res.status(500).json({ error: 'Failed to fetch blog posts' });
      }

      logger.debug('Blog posts fetched', { count: rows.length, published });
      return res.json(rows);
    }
  );
});

app.get('/api/blog/:id', (req, res) => {
  const { id } = req.params;

  getDbOrThrow().get(
    'SELECT * FROM blog_posts WHERE id = ? OR slug = ?',
    [id, id],
    /** @param {Error | null} err @param {BlogRow | undefined} row */
    (err, row) => {
      if (err) {
        logger.error('Failed to fetch blog post', { error: err.message, id });
        return res.status(500).json({ error: 'Failed to fetch blog post' });
      }
      if (!row) {
        return res.status(404).json({ error: 'Blog post not found' });
      }
      logger.debug('Blog post fetched', { id: row.id, title: row.title });
      return res.json(row);
    }
  );
});

app.post(
  '/api/blog',
  blogValidation,
  validateRequest,
  /** @param {import('express').Request} req @param {import('express').Response} res */
  (req, res) => {
    const {
      id,
      title,
      slug,
      excerpt,
      content,
      category,
      author,
      image,
      tags,
      featured,
      published,
      seo_title,
      seo_description,
      focus_keyword,
      canonical_url,
      no_index,
      no_follow,
      affiliate_recommendations,
    } = req.body;

    const now = new Date().toISOString();
    const publishedAt = published ? now : null;

    const query = `
    INSERT OR REPLACE INTO blog_posts (
      id, title, slug, excerpt, content, category, author, image, tags,
      featured, published, seo_title, seo_description, focus_keyword,
      canonical_url, no_index, no_follow, affiliate_recommendations,
      updated_at, published_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

    const params = [
      id,
      title,
      slug,
      excerpt,
      content,
      category,
      author || 'Vibe Tech',
      image,
      typeof tags === 'string' ? tags : JSON.stringify(tags || []),
      featured ? 1 : 0,
      published ? 1 : 0,
      seo_title,
      seo_description,
      focus_keyword,
      canonical_url,
      no_index ? 1 : 0,
      no_follow ? 1 : 0,
      typeof affiliate_recommendations === 'string'
        ? affiliate_recommendations
        : JSON.stringify(affiliate_recommendations || []),
      now,
      publishedAt,
    ];

    getDbOrThrow().run(
      query,
      params,
      /** @param {Error | null} err */
      (err) => {
        if (err) {
          logger.error('Failed to save blog post', { error: err.message, title });
          return res.status(500).json({ error: 'Failed to save blog post' });
        }

        logger.info('Blog post saved', { id, title, published: !!published });
        return res.json({ success: true, id, message: 'Blog post saved successfully' });
      }
    );
  }
);

app.get('/api/leads', (_req, res) => {
  getDbOrThrow().all(
    'SELECT * FROM leads ORDER BY created_at DESC',
    /** @param {Error | null} err @param {LeadRow[]} rows */
    (err, rows = []) => {
      if (err) {
        logger.error('Failed to fetch leads', { error: err.message });
        return res.status(500).json({ error: 'Failed to fetch leads' });
      }
      logger.debug('Leads fetched', { count: rows.length });
      return res.json(rows);
    }
  );
});

app.post(
  '/api/leads',
  leadValidation,
  validateRequest,
  /** @param {import('express').Request} req @param {import('express').Response} res */
  (req, res) => {
    const { id, company_name, contact_email, contact_name, phone, notes } = req.body;
    const query = `
    INSERT INTO leads (id, company_name, contact_email, contact_name, phone, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

    getDbOrThrow().run(
      query,
      [id, company_name, contact_email, contact_name, phone, notes],
      /** @this {SqliteRunResult} @param {Error | null} err */
      function onInsertLead(err) {
        if (err) {
          logger.error('Failed to create lead', { error: err.message, company_name });
          return res.status(500).json({ error: 'Failed to create lead' });
        }
        logger.info('Lead created', { id, company_name, contact_email });
        return res.json({ success: true, id: this.lastID });
      }
    );
  }
);

app.use(errorHandler);

app.use('*', (req, res) => {
  logger.warn('404 Not Found', { url: req.originalUrl, method: req.method, ip: req.ip });
  return res.status(404).json({ error: 'Not found' });
});

function gracefulShutdown() {
  logger.info('Received shutdown signal, closing database connection...');

  if (!db) {
    process.exit(0);
    return;
  }

  db.close(
    /** @param {Error | null} err */
    (err) => {
      if (err) {
        logger.error('Error closing database', { error: err.message });
      } else {
        logger.info('Database connection closed successfully');
      }
      process.exit(0);
    }
  );
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

initializeDatabase();

const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info('Server started successfully', {
    port: PORT,
    environment: process.env.NODE_ENV,
    pid: process.pid,
  });
});

server.on('error', (error) => {
  /** @type {NodeJS.ErrnoException} */
  const listenError = error;

  if (listenError.syscall !== 'listen') {
    throw error;
  }

  switch (listenError.code) {
    case 'EACCES':
      logger.error(`Port ${PORT} requires elevated privileges`);
      process.exit(1);
      return;
    case 'EADDRINUSE':
      logger.error(`Port ${PORT} is already in use`);
      process.exit(1);
      return;
    default:
      throw error;
  }
});

module.exports = app;
