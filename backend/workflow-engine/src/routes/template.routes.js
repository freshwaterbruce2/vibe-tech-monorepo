// @ts-nocheck
const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Get all templates
router.get('/', async (req, res) => {
    try {
        const templates = await db.all('SELECT * FROM workflow_templates ORDER BY category, name');
        res.json({
            templates: templates.map(t => ({
                ...t,
                steps: JSON.parse(t.steps)
            })),
            count: templates.length
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
