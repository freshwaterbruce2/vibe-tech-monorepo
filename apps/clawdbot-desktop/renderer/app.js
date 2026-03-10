import { createAppController } from './controller.js';

const controller = createAppController();

controller.init().catch((error) => {
  console.error('[Renderer] Initialization failed:', error);
});
