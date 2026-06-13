import { GoogleGenAI } from '@google/genai';
import { Chess } from 'chess.js';
import dotenv from 'dotenv';
import express from 'express';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: fileURLToPath(new URL('.env', import.meta.url)) });

const app = express();
const PORT = Number(process.env.PORT || 3107);
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const allowedOrigins = new Set(
  [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    'http://localhost',
    'capacitor://localhost',
    'ionic://localhost',
    ...(process.env.ALLOWED_ORIGINS || '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  ],
);

const gemini = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

const rateLimit = new Map();
const RATE_WINDOW_MS = 60_000;
const MAX_REQUESTS = 30;

app.use(express.json({ limit: '32kb' }));

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!origin || allowedOrigins.has(origin) || origin.startsWith('capacitor://')) {
    if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
    return;
  }

  res.status(403).json({ error: 'Origin not allowed' });
});

app.use((req, res, next) => {
  const now = Date.now();
  const key = req.ip || 'unknown';
  const current = rateLimit.get(key);

  if (!current || now > current.resetAt) {
    rateLimit.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    next();
    return;
  }

  if (current.count >= MAX_REQUESTS) {
    res.status(429).json({ error: 'Too many requests. Please try again shortly.' });
    return;
  }

  current.count += 1;
  next();
});

function buildPrompt(fen, question, legalMoves) {
  return `You are ChessMaster Academy's expert chess tutor for a beginner chess app.

Current board FEN: "${fen}"
Legal SAN moves from this exact FEN: ${legalMoves.join(', ') || '(none)'}

User asks: "${question}"

Rules:
- Give accurate, beginner-friendly chess advice.
- Do not claim illegal moves.
- If you suggest a move, it must appear in the legal SAN move list above.
- If checkmate, stalemate, or draw is already present, say that clearly.
- Keep the answer concise and formatted in Markdown.`;
}

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    geminiConfigured: Boolean(gemini),
    model: GEMINI_MODEL,
  });
});

app.post('/api/chess/advice', async (req, res) => {
  if (!gemini) {
    res.status(503).json({ error: 'Gemini API key is not configured on the server.' });
    return;
  }

  const { fen, question } = req.body || {};
  if (typeof fen !== 'string' || typeof question !== 'string') {
    res.status(400).json({ error: 'Expected JSON body with string fields: fen, question.' });
    return;
  }

  if (fen.length > 120 || question.length > 800) {
    res.status(400).json({ error: 'Request is too large.' });
    return;
  }

  let legalMoves;
  try {
    legalMoves = new Chess(fen).moves();
  } catch {
    res.status(400).json({ error: 'Invalid FEN.' });
    return;
  }

  try {
    const response = await gemini.models.generateContent({
      model: GEMINI_MODEL,
      contents: buildPrompt(fen, question, legalMoves),
      config: {
        temperature: 0.35,
        maxOutputTokens: 700,
      },
    });

    res.json({ advice: response.text || "I couldn't generate advice for this position." });
  } catch (error) {
    console.error('[Gemini] chess advice failed:', error?.message || error);
    res.status(502).json({ error: 'Gemini analysis failed. Please try again.' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[OK] ChessMaster Academy API listening on port ${PORT}`);
  console.log(`[OK] Gemini configured: ${gemini ? 'yes' : 'no'}`);
});
