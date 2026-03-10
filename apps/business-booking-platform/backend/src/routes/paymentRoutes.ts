import express from 'express';
import { processPayment } from '../services/squareService';

const router = express.Router();

router.post('/process-payment', async (req, res) => {
	const { sourceId, amount } = req.body;

	if (!sourceId || !amount) {
		return res
			.status(400)
			.json({ error: 'Missing required payment information.' });
	}

	try {
		const payment = await processPayment(sourceId, amount);
		res.status(200).json(payment);
	} catch (error) {
		res.status(500).json({ error: (error as Error).message });
	}
});

export default router;
