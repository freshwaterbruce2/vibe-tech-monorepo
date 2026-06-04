import { createBot } from './bot.js';
import { loadConfig, loadLocalEnv } from './config.js';

loadLocalEnv(new URL('../.env', import.meta.url));
loadLocalEnv(new URL('../../.env', import.meta.url));


const config = loadConfig();
const bot = createBot(config);
await bot.launch();
console.log('Vibe IT Specialist Bot started in polling mode.');
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
