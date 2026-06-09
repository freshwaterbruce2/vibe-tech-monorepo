# @vibetech/models-pricing

AI Models and Pricing Database Service for the VibeTech monorepo.

## Installation

```bash
pnpm add @vibetech/models-pricing
```

## Usage

```typescript
import { 
  getModels, 
  getModel, 
  updateModelPrice, 
  addModel 
} from '@vibetech/models-pricing';

// Fetch all models
const models = getModels();

// Fetch a single model
const model = getModel('gemini-3.5-flash');

// Update model prices
updateModelPrice('gemini-3.5-flash', {
  inputPricePerM: 0.075,
  outputPricePerM: 0.30
});
```

## CLI Usage

A CLI tool is provided to query and manage the SQLite pricing data:

```bash
pnpm models-pricing-cli list
pnpm models-pricing-cli get <model-id>
pnpm models-pricing-cli update <model-id> <input-price-per-m> <output-price-per-m>
```

## Development

```bash
# Build
pnpm nx run @vibetech/models-pricing:build

# Test
pnpm nx run @vibetech/models-pricing:test

# Type check
pnpm nx run @vibetech/models-pricing:typecheck
```
