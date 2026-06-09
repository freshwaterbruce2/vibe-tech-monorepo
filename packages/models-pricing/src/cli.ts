#!/usr/bin/env node
import { getModels, getModel, updateModelPrice, addModel, seedBaselineData, openDb } from './index.js';

const args = process.argv.slice(2);
const command = args[0];

function printHelp() {
  console.log('AI Models and Pricing Database CLI');
  console.log('Usage:');
  console.log('  models-pricing-cli list                                            List all models');
  console.log('  models-pricing-cli get <model-id>                                  Get a single model details');
  console.log('  models-pricing-cli update <model-id> --input <cost> --output <cost> [--cached <cost>]');
  console.log('                                                                     Update costs per 1M tokens');
  console.log('  models-pricing-cli add --id <id> --provider <provider> --name <name> --input <cost> --output <cost> [--cached <cost>]');
  console.log('                                                                     Add or upsert a new model');
  console.log('  models-pricing-cli seed                                            Force seed baseline models');
  process.exit(0);
}

function parseFlags(args: string[]): Record<string, string> {
  const flags: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg?.startsWith('--')) {
      const key = arg.slice(2);
      const val = args[i + 1];
      if (val && !val.startsWith('--')) {
        flags[key] = val;
        i++;
      } else {
        flags[key] = 'true';
      }
    }
  }
  return flags;
}

if (!command) {
  printHelp();
}

try {
  switch (command) {
    case 'list': {
      const models = getModels();
      console.log(`Found ${models.length} models:`);
      console.table(
        models.map((m) => ({
          ID: m.id,
          Name: m.name,
          Provider: m.provider,
          'Input Cost ($/1M)': m.inputCost,
          'Output Cost ($/1M)': m.outputCost,
          'Cached Cost ($/1M)': m.cachedInputCost ?? 0,
          Tier: m.tier,
          Recommended: m.recommended ? 'Yes' : 'No',
        }))
      );
      break;
    }
    case 'get': {
      const id = args[1];
      if (!id) {
        console.error('Error: model-id is required');
        process.exit(1);
      }
      const model = getModel(id);
      if (!model) {
        console.error(`Error: Model not found with ID "${id}"`);
        process.exit(1);
      }
      console.log(JSON.stringify(model, null, 2));
      break;
    }
    case 'update': {
      const id = args[1];
      if (!id || id.startsWith('--')) {
        console.error('Error: model-id is required as first argument');
        process.exit(1);
      }
      
      const flags = parseFlags(args.slice(2));
      
      // Fallback to positional arguments if flags are not provided
      const inputCostStr = flags['input'] ?? args[2];
      const outputCostStr = flags['output'] ?? args[3];
      const cachedCostStr = flags['cached'] ?? args[4];

      if (!inputCostStr || !outputCostStr) {
        console.error('Error: input cost and output cost are required (either as flags --input and --output or as positional arguments)');
        process.exit(1);
      }
      const inputCost = parseFloat(inputCostStr);
      const outputCost = parseFloat(outputCostStr);
      const cachedInputCost = cachedCostStr ? parseFloat(cachedCostStr) : undefined;
      
      if (isNaN(inputCost) || isNaN(outputCost) || (cachedInputCost !== undefined && isNaN(cachedInputCost))) {
        console.error('Error: Costs must be valid numbers');
        process.exit(1);
      }

      const success = updateModelPrice(id, { inputCost, outputCost, cachedInputCost });
      if (success) {
        let msg = `Successfully updated pricing for "${id}" (Input: $${inputCost}/1M, Output: $${outputCost}/1M`;
        if (cachedInputCost !== undefined) {
          msg += `, Cached Input: $${cachedInputCost}/1M`;
        }
        msg += ')';
        console.log(msg);
      } else {
        console.error(`Error: Model not found with ID "${id}"`);
        process.exit(1);
      }
      break;
    }
    case 'add': {
      const flags = parseFlags(args.slice(1));
      const id = flags['id'];
      const provider = flags['provider'];
      const name = flags['name'];
      const inputCostStr = flags['input'];
      const outputCostStr = flags['output'];
      const cachedCostStr = flags['cached'];
      
      if (!id || !provider || !name || !inputCostStr || !outputCostStr) {
        console.error('Error: --id, --provider, --name, --input, and --output are required');
        process.exit(1);
      }
      
      const inputCost = parseFloat(inputCostStr);
      const outputCost = parseFloat(outputCostStr);
      const cachedInputCost = cachedCostStr ? parseFloat(cachedCostStr) : 0;
      
      if (isNaN(inputCost) || isNaN(outputCost) || isNaN(cachedInputCost)) {
        console.error('Error: Costs must be valid numbers');
        process.exit(1);
      }
      
      const speed = (flags['speed'] ?? 'medium') as 'fast' | 'medium' | 'slow';
      const quality = parseInt(flags['quality'] ?? '3', 10) as 1 | 2 | 3 | 4 | 5;
      const bestFor = flags['bestFor'] ?? `Model ${name} by ${provider}`;
      const tier = (flags['tier'] ?? 'medium') as 'free' | 'low' | 'medium' | 'high';
      const recommended = flags['recommended'] === 'true' || flags['recommended'] === '1';
      const contextWindow = flags['context'] ?? '128K';

      const model = {
        id,
        name,
        provider,
        inputCost,
        outputCost,
        cachedInputCost,
        contextWindow,
        speed,
        quality,
        bestFor,
        tier,
        recommended
      };
      
      addModel(model);
      console.log(`Successfully added model "${id}" (Name: ${name}, Input: $${inputCost}/1M, Output: $${outputCost}/1M, Cached Input: $${cachedInputCost}/1M)`);
      break;
    }
    case 'seed': {
      const db = openDb();
      seedBaselineData(db);
      console.log('Seeding baseline models data successfully.');
      break;
    }
    default: {
      console.error(`Error: Unknown command "${command}"`);
      printHelp();
    }
  }
} catch (error) {
  console.error('Execution failed:', error);
  process.exit(1);
}
