import { chooseAiMove } from './chessAi';

self.onmessage = (e: MessageEvent<{ fen: string; difficulty: any }>) => {
  const { fen, difficulty } = e.data;
  try {
    const move = chooseAiMove(fen, difficulty);
    self.postMessage({ move });
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : String(error) });
  }
};
