// @ts-nocheck
/* eslint-disable consistent-return */
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Create Express app
const app = express();
const PORT = process.env.PORT || 9001;

// Middleware
app.use(cors());
app.use(express.json());

// Database setup - use test DB path if TEST_DB_PATH is set
const dbDir = process.env.TEST_DB_PATH
  ? path.dirname(process.env.TEST_DB_PATH)
  : 'D:\\vibe-tech-data';
const dbPath = process.env.TEST_DB_PATH || path.join(dbDir, 'vibetech.db');

// Create directory if it doesn't exist
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize SQLite database
let db;

function initDb() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        reject(err);
      } else {
        initializeDatabase()
          .then(() => {
            resolve(db);
          })
          .catch(reject);
      }
    });
  });
}

// Initialize database tables
function initializeDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS customers (
          id TEXT PRIMARY KEY,
          email TEXT NOT NULL,
          full_name TEXT NOT NULL,
          phone TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS invoices (
          id TEXT PRIMARY KEY,
          amount_cents INTEGER NOT NULL,
          issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          job_id TEXT,
          paid BOOLEAN DEFAULT 0
        )
      `);

      db.run(`
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
      `);

      db.run(
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
        (err) => {
          if (err) reject(err);
          else resolve();
        },
      );
    });
  });
}

// Helper functions
function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// API Routes
app.get('/', (req, res) => {
  return res.json({
    message: 'Vibe Tech Backend API',
    status: 'running',
    endpoints: {
      health: '/api/health',
      customers: '/api/customers',
      invoices: '/api/invoices',
      leads: '/api/leads',
      blog: '/api/blog',
    },
  });
});

app.get('/api/health', (req, res) => {
  return res.json({ status: 'ok', uptime: process.uptime() });
});

// Customers CRUD
app.get('/api/customers', (req, res) => {
  db.all('SELECT * FROM customers ORDER BY created_at DESC', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    return res.json(rows || []);
  });
});

app.post('/api/customers', (req, res) => {
  const { email, full_name, phone } = req.body;
  const id = generateId();

  db.run(
    'INSERT INTO customers (id, email, full_name, phone) VALUES (?, ?, ?, ?)',
    [id, email, full_name, phone],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      db.get('SELECT * FROM customers WHERE id = ?', [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        return res.status(201).json(row);
      });
    },
  );
});

app.put('/api/customers/:id', (req, res) => {
  const { id } = req.params;
  const { email, full_name, phone } = req.body;

  db.run(
    'UPDATE customers SET email = ?, full_name = ?, phone = ? WHERE id = ?',
    [email, full_name, phone, id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      db.get('SELECT * FROM customers WHERE id = ?', [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        return res.json(row);
      });
    },
  );
});

app.delete('/api/customers/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM customers WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    return res.status(204).send();
  });
});

// Invoices
app.get('/api/invoices', (req, res) => {
  db.all('SELECT * FROM invoices ORDER BY issued_at DESC', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    return res.json(rows || []);
  });
});

app.post('/api/invoices', (req, res) => {
  const { amount_cents, job_id, paid } = req.body;
  const id = generateId();

  db.run(
    'INSERT INTO invoices (id, amount_cents, job_id, paid) VALUES (?, ?, ?, ?)',
    [id, amount_cents, job_id, paid || 0],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      db.get('SELECT * FROM invoices WHERE id = ?', [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        return res.status(201).json(row);
      });
    },
  );
});

// Leads CRUD
app.get('/api/leads', (req, res) => {
  db.all('SELECT * FROM leads ORDER BY created_at DESC', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    return res.json(rows || []);
  });
});

app.post('/api/leads', (req, res) => {
  const { company_name, contact_email, contact_name, notes, phone, status } = req.body;
  const id = generateId();

  db.run(
    'INSERT INTO leads (id, company_name, contact_email, contact_name, notes, phone, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, company_name, contact_email, contact_name, notes, phone, status || 'new'],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      db.get('SELECT * FROM leads WHERE id = ?', [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        return res.status(201).json(row);
      });
    },
  );
});

app.put('/api/leads/:id', (req, res) => {
  const { id } = req.params;
  const { company_name, contact_email, contact_name, notes, phone, status } = req.body;

  db.run(
    'UPDATE leads SET company_name = ?, contact_email = ?, contact_name = ?, notes = ?, phone = ?, status = ? WHERE id = ?',
    [company_name, contact_email, contact_name, notes, phone, status, id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      db.get('SELECT * FROM leads WHERE id = ?', [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        return res.json(row);
      });
    },
  );
});

app.delete('/api/leads/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM leads WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    return res.status(204).send();
  });
});

// Blog Posts
function parseBlogPost(row) {
  return {
    ...row,
    tags: row.tags ? JSON.parse(row.tags) : [],
    affiliate_recommendations: row.affiliate_recommendations
      ? JSON.parse(row.affiliate_recommendations)
      : [],
    featured: Boolean(row.featured),
    published: Boolean(row.published),
    no_index: Boolean(row.no_index),
    no_follow: Boolean(row.no_follow),
  };
}

app.get('/api/blog', (req, res) => {
  const { published_only = 'true' } = req.query;
  let query = 'SELECT * FROM blog_posts';
  if (published_only === 'true') query += ' WHERE published = 1';
  query += ' ORDER BY created_at DESC';

  db.all(query, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    return res.json((rows || []).map(parseBlogPost));
  });
});

app.get('/api/blog/:identifier', (req, res) => {
  const { identifier } = req.params;
  db.get(
    'SELECT * FROM blog_posts WHERE slug = ? OR id = ?',
    [identifier, identifier],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: 'Blog post not found' });
      return res.json(parseBlogPost(row));
    },
  );
});

app.post('/api/blog', (req, res) => {
  const {
    title,
    excerpt,
    content,
    category,
    author = 'Vibe Tech',
    image,
    tags = [],
    featured = false,
    published = false,
    seo_title,
    seo_description,
    focus_keyword,
    canonical_url,
    no_index = false,
    no_follow = false,
    affiliate_recommendations = [],
  } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required' });
  }

  const id = generateId();
  const slug = req.body.slug || generateSlug(title);
  const published_at = published ? new Date().toISOString() : null;

  db.run(
    `
    INSERT INTO blog_posts (
      id, title, slug, excerpt, content, category, author, image, tags,
      featured, published, seo_title, seo_description, focus_keyword,
      canonical_url, no_index, no_follow, affiliate_recommendations, published_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
    [
      id,
      title,
      slug,
      excerpt,
      content,
      category,
      author,
      image,
      JSON.stringify(tags),
      featured ? 1 : 0,
      published ? 1 : 0,
      seo_title,
      seo_description,
      focus_keyword,
      canonical_url,
      no_index ? 1 : 0,
      no_follow ? 1 : 0,
      JSON.stringify(affiliate_recommendations),
      published_at,
    ],
    (err) => {
      if (err) {
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
          return res.status(400).json({ error: 'A blog post with this slug already exists' });
        }
        return res.status(500).json({ error: err.message });
      }
      db.get('SELECT * FROM blog_posts WHERE id = ?', [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        return res.status(201).json(parseBlogPost(row));
      });
    },
  );
});

app.delete('/api/blog/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM blog_posts WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Blog post not found' });
    return res.status(204).send();
  });
});

// Close database
function closeDb() {
  return new Promise((resolve) => {
    if (db) {
      db.close((err) => {
        if (err) console.error('Error closing database:', err);
        resolve();
      });
    } else {
      resolve();
    }
  });
}

// Start server only if run directly
if (require.main === module) {
  initDb()
    .then(() => {
      app.listen(PORT, () => {
        console.warn(`Backend server running on http://localhost:${PORT}`);
        console.warn(`Database location: ${dbPath}`);
      });
    })
    .catch((err) => {
      console.error('Failed to initialize database:', err);
      process.exit(1);
    });

  process.on('SIGINT', () => {
    console.warn('Shutting down gracefully...');
    closeDb().then(() => process.exit(0));
  });
}

// Export for testing
module.exports = { app, initDb, closeDb };
