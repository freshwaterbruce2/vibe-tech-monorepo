import { Router, type Request, type Response } from 'express';
import { promises as fs } from 'fs';
import path from 'path';

const router = Router();

const HISTORY_FILE = process.env.HISTORY_FILE ?? 'D:\\data\\prompt-engineer\\history.json';
const MAX_HISTORY = 50;

interface HistoryItem {
    id: string;
    timestamp: string;
    model: string;
    mode: string;
    inputPrompt: string;
    outputPrompt: string;
    extendedThinking: boolean;
}

// Ensure directory exists
async function ensureDir(filePath: string) {
    const dir = path.dirname(filePath);
    try {
        await fs.access(dir);
    } catch {
        await fs.mkdir(dir, { recursive: true });
    }
}

// Read history from file
async function readHistory(): Promise<HistoryItem[]> {
    try {
        await ensureDir(HISTORY_FILE);
        const data = await fs.readFile(HISTORY_FILE, 'utf-8');
        return JSON.parse(data);
    } catch {
        return [];
    }
}

// Write history to file
async function writeHistory(history: HistoryItem[]): Promise<void> {
    await ensureDir(HISTORY_FILE);
    await fs.writeFile(HISTORY_FILE, JSON.stringify(history, null, 2));
}

// GET /api/history - Get all history items
router.get('/', async (_req: Request, res: Response) => {
    try {
        const history = await readHistory();
        res.json(history);
    } catch (error) {
        console.error('Error reading history:', error);
        res.status(500).json({ error: 'Failed to read history' });
    }
});

// POST /api/history - Add a new history item
router.post('/', async (req: Request, res: Response) => {
    try {
        const item = req.body as HistoryItem;

        if (!item.id || !item.inputPrompt || !item.outputPrompt) {
            res.status(400).json({ error: 'Invalid history item' });
            return;
        }

        const history = await readHistory();

        // Add new item at the beginning
        history.unshift(item);

        // Keep only the last MAX_HISTORY items
        const trimmedHistory = history.slice(0, MAX_HISTORY);

        await writeHistory(trimmedHistory);
        res.status(201).json({ success: true });
    } catch (error) {
        console.error('Error saving history:', error);
        res.status(500).json({ error: 'Failed to save history' });
    }
});

// DELETE /api/history/:id - Delete a history item
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const history = await readHistory();
        const filtered = history.filter(item => item.id !== id);

        if (filtered.length === history.length) {
            res.status(404).json({ error: 'History item not found' });
            return;
        }

        await writeHistory(filtered);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting history:', error);
        res.status(500).json({ error: 'Failed to delete history' });
    }
});

// DELETE /api/history - Clear all history
router.delete('/', async (_req: Request, res: Response) => {
    try {
        await writeHistory([]);
        res.json({ success: true });
    } catch (error) {
        console.error('Error clearing history:', error);
        res.status(500).json({ error: 'Failed to clear history' });
    }
});

export { router as historyRouter };
