const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { Chess } = require('chess.js');

function loadTsExport(relativePath, exportName) {
  const sourcePath = path.join(__dirname, '..', relativePath);
  const source = fs.readFileSync(sourcePath, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;

  const sandbox = { exports: {} };
  sandbox.module = { exports: sandbox.exports };
  vm.runInNewContext(transpiled, sandbox, { filename: sourcePath });
  return sandbox.exports[exportName];
}

const LESSONS = loadTsExport(path.join('src', 'lib', 'lessons.ts'), 'LESSONS');
const PUZZLES = loadTsExport(path.join('src', 'lib', 'puzzles.ts'), 'PUZZLES');
let failures = 0;

for (const lesson of LESSONS) {
  let chess;

  try {
    chess = new Chess(lesson.initialFen);
  } catch (error) {
    failures += 1;
    console.error(`[${lesson.id}] invalid initialFen: ${error.message}`);
    continue;
  }

  const targetMoves = lesson.targetMoves ?? (lesson.targetMove ? [lesson.targetMove] : []);

  if (targetMoves.length === 0) {
    failures += 1;
    console.error(`[${lesson.id}] missing targetMove or targetMoves`);
    continue;
  }

  const legalMoves = chess.moves();

  for (const targetMove of targetMoves) {
    if (!legalMoves.includes(targetMove)) {
      failures += 1;
      console.error(
        `[${lesson.id}] illegal target move "${targetMove}" from FEN "${lesson.initialFen}"`,
      );
      continue;
    }

    const afterMove = new Chess(lesson.initialFen);
    afterMove.move(targetMove);

    if (targetMove.endsWith('#') && !afterMove.isCheckmate()) {
      failures += 1;
      console.error(`[${lesson.id}] "${targetMove}" is marked mate but is not checkmate`);
    }

    if (lesson.aiResponseMove) {
      const aiLegalMoves = afterMove.moves();

      if (!aiLegalMoves.includes(lesson.aiResponseMove)) {
        failures += 1;
        console.error(`[${lesson.id}] illegal aiResponseMove "${lesson.aiResponseMove}" after "${targetMove}"`);
      }
    }
  }
}

for (const puzzle of PUZZLES) {
  let chess;

  try {
    chess = new Chess(puzzle.initialFen);
  } catch (error) {
    failures += 1;
    console.error(`[${puzzle.id}] invalid puzzle initialFen: ${error.message}`);
    continue;
  }

  if (!chess.moves().includes(puzzle.targetMove)) {
    failures += 1;
    console.error(`[${puzzle.id}] illegal puzzle targetMove "${puzzle.targetMove}"`);
    continue;
  }

  chess.move(puzzle.targetMove);

  if (puzzle.targetMove.endsWith('#') && !chess.isCheckmate()) {
    failures += 1;
    console.error(`[${puzzle.id}] puzzle targetMove "${puzzle.targetMove}" is marked mate but is not checkmate`);
  }
}

if (failures > 0) {
  console.error(`Lesson validation failed with ${failures} problem(s).`);
  process.exit(1);
}

console.log(`Validated ${LESSONS.length} chess lessons and ${PUZZLES.length} puzzles.`);
