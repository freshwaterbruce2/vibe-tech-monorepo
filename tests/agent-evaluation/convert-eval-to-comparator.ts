import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

// Resolve current directory for ES Modules context
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define raw run JSON schemas
interface EvalCaseRaw {
  id: string;
  category: string;
  name: string;
  passed: boolean;
  score: number;
  trace?: {
    response?: string;
  };
}

interface RunOutput {
  suite: string;
  provider: string;
  cases: EvalCaseRaw[];
}

// Define the suite definitions from behavioral-suites.json
interface SuiteCase {
  id: string;
  category: string;
  name: string;
  input: string;
}

interface SuiteDefinition {
  id: string;
  name: string;
  cases: SuiteCase[];
}

interface BehavioralSuitesCollection {
  suites: SuiteDefinition[];
}

// Define the output schemas for LLM Comparator visualization
interface ComparatorExample {
  input_text: string;
  tags: string[];
  output_text_a: string;
  output_text_b: string;
  score: number; // 1.0 = A better, 0.0 = B better, 0.5 = tied
}

interface ComparatorOutput {
  metadata: {
    model_a: string;
    model_b: string;
    suite: string;
  };
  models: [string, string];
  examples: ComparatorExample[];
}

function loadJsonFile<T>(filePath: string): T {
  try {
    const raw = readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch (error) {
    throw new Error(`Failed to load and parse JSON file at ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function main(): void {
  const args = process.argv.slice(2);
  if (args.length < 3) {
    console.error('Usage: pnpm tsx convert-eval-to-comparator.ts <run_a.json> <run_b.json> <output.json> [suite_id]');
    process.exit(1);
  }

  const [runAPath, runBPath, outputPath, suiteIdArg] = args;
  const suiteId = suiteIdArg || 'behavioral-web-search-grounding';

  console.log(`Loading Run A from: ${runAPath}`);
  const runA = loadJsonFile<RunOutput>(resolve(runAPath));

  console.log(`Loading Run B from: ${runBPath}`);
  const runB = loadJsonFile<RunOutput>(resolve(runBPath));

  // Resolve and load behavioral-suites.json to match prompts
  const suitesPath = resolve(__dirname, 'behavioral-suites.json');
  console.log(`Loading prompts from: ${suitesPath}`);
  const suitesCollection = loadJsonFile<BehavioralSuitesCollection>(suitesPath);

  const suiteDef = suitesCollection.suites.find((s) => s.id === suiteId);
  if (!suiteDef) {
    throw new Error(`Suite ${suiteId} not found in behavioral-suites.json`);
  }

  // Create a map of prompt inputs by case ID
  const promptMap = new Map<string, string>();
  for (const c of suiteDef.cases) {
    promptMap.set(c.id, c.input);
  }

  // Map run details for comparisons
  const caseBMap = new Map<string, EvalCaseRaw>();
  for (const c of runB.cases) {
    caseBMap.set(c.id, c);
  }

  const examples: ComparatorExample[] = [];

  for (const caseA of runA.cases) {
    const caseB = caseBMap.get(caseA.id);
    if (!caseB) {
      console.warn(`Warning: Case ${caseA.id} found in Run A but not in Run B. Skipping.`);
      continue;
    }

    const inputPrompt = promptMap.get(caseA.id) || `[Prompt unknown for case ${caseA.id}]`;
    const responseA = caseA.trace?.response || 'No response generated.';
    const responseB = caseB.trace?.response || 'No response generated.';

    // Map comparative preference scores based on the evaluation assertion scores.
    // Score closer to 1.0 implies Run A (Model A) was better, 0.0 implies Run B (Model B) was better.
    let score = 0.5;
    if (caseA.score > caseB.score) {
      score = 0.8;
    } else if (caseB.score > caseA.score) {
      score = 0.2;
    }

    examples.push({
      input_text: inputPrompt,
      tags: [caseA.category, caseA.passed ? 'pass_a' : 'fail_a', caseB.passed ? 'pass_b' : 'fail_b'],
      output_text_a: responseA,
      output_text_b: responseB,
      score,
    });
  }

  const providerA = runA.provider || 'Model A';
  const providerB = runB.provider || 'Model B';

  const output: ComparatorOutput = {
    metadata: {
      model_a: providerA,
      model_b: providerB,
      suite: suiteId,
    },
    models: [providerA, providerB],
    examples,
  };

  // Ensure output directory exists (especially in D:\ drive contexts)
  const resolvedOutputPath = resolve(outputPath);
  const outputDir = dirname(resolvedOutputPath);
  try {
    mkdirSync(outputDir, { recursive: true });
  } catch (error) {
    console.warn(`Could not create directory ${outputDir}: ${String(error)}`);
  }

  console.log(`Writing LLM Comparator JSON to: ${resolvedOutputPath}`);
  writeFileSync(resolvedOutputPath, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`Successfully converted ${examples.length} evaluation examples.`);
}

main();
