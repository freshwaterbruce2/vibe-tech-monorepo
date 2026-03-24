Submit all changed code files for async batch review using the Anthropic Batch API (50% cheaper than real-time).

## Steps

1. Navigate to the API tools directory:

   ```
   cd C:\dev\tools\anthropic-api
   ```

2. Install dependencies if not already installed:

   ```
   pnpm install
   ```

3. Run the batch review against the specified base branch (default: main):

   ```
   pnpm tsx src/batch-review.ts $ARGUMENTS
   ```

4. Report the batch ID and instructions for checking results.

## Arguments

- First argument: base branch to diff against (default: `main`)
- `--status <batch-id>`: Check status and retrieve results of a previous batch

## Examples

- `/api:batch-review` - Review all changes vs main
- `/api:batch-review develop` - Review all changes vs develop
- `/api:batch-review --status batch_abc123` - Check batch results

## Requirements

- `ANTHROPIC_API_KEY` environment variable must be set
