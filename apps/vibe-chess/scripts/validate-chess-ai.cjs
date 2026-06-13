const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { performance } = require('node:perf_hooks');
const ts = require('typescript');
const { Chess } = require('chess.js');

function loadTsModule(relativePath) {
  const sourcePath = path.isAbsolute(relativePath)
    ? relativePath
    : path.join(__dirname, '..', relativePath);
  const source = fs.readFileSync(sourcePath, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;

  const sandbox = { exports: {}, require };
  sandbox.module = { exports: sandbox.exports };
  vm.runInNewContext(transpiled, sandbox, { filename: sourcePath });
  return sandbox.module.exports;
}

const repoRoot = path.resolve(__dirname, '..', '..', '..');
const { chooseAiMove } = loadTsModule(
  path.join(repoRoot, 'packages', 'games', 'src', 'chess', 'lib', 'chessAi.ts'),
);

const positions = [
  new Chess().fen(),
  'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
  'r3k2r/pppq1ppp/2npbn2/4p3/2B1P3/2NP1N2/PPPQ1PPP/R3K2R w KQkq - 4 8',
  '8/5pk1/6p1/2P1p3/1P2P3/5P2/6K1/8 w - - 0 38',
];

const maxAverageMs = {
  easy: 75,
  medium: 650,
  hard: 650,
};

let failures = 0;

for (const difficulty of ['easy', 'medium', 'hard']) {
  const start = performance.now();

  for (const fen of positions) {
    const chess = new Chess(fen);
    const legalSans = new Set(chess.moves());
    const move = chooseAiMove(fen, difficulty);

    if (!move) {
      failures += 1;
      console.error(`[${difficulty}] expected a legal move for "${fen}"`);
      continue;
    }

    if (!legalSans.has(move.san)) {
      failures += 1;
      console.error(`[${difficulty}] returned illegal move "${move.san}" for "${fen}"`);
    }

    const repeatedMove = chooseAiMove(fen, difficulty);
    if (repeatedMove?.san !== move.san) {
      failures += 1;
      console.error(`[${difficulty}] returned a non-deterministic move for "${fen}"`);
    }
  }

  const averageMs = (performance.now() - start) / positions.length;
  if (averageMs > maxAverageMs[difficulty]) {
    failures += 1;
    console.error(
      `[${difficulty}] average move selection took ${averageMs.toFixed(1)}ms; limit is ${maxAverageMs[difficulty]}ms`,
    );
  }
}

const checkmatedFen = 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3';
if (chooseAiMove(checkmatedFen, 'hard') !== null) {
  failures += 1;
  console.error('Expected no AI move from a checkmated position.');
}

if (failures > 0) {
  console.error(`Chess AI validation failed with ${failures} problem(s).`);
  process.exit(1);
}

console.log(`Validated chess AI legality, determinism, and speed across ${positions.length} positions.`);
