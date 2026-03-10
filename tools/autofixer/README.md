# Autofixer Agent

Automatically monitor and fix development server errors using Claude Agent SDK.

Built with **Claude Agent SDK v0.1.14** (latest as of Dec 9, 2025)

## Features

- **Real-time Log Monitoring** - Watch log files and auto-fix errors as they occur
- **Multi-Framework Support** - TypeScript, JavaScript, Python, Vite, ESLint, and more
- **Intelligent Error Parsing** - Extracts file paths, line numbers, and error context
- **Safe Auto-Fixing** - Creates backups, requires confirmation for risky operations
- **Dry-Run Mode** - Preview fixes before applying them
- **Session Management** - Maintains context across multiple fixes
- **Rich Console Output** - Beautiful terminal UI with progress tracking

## Installation

### 1. Clone or Copy

```bash
cd C:\dev\tools
# Directory already created with all files
```

### 2. Create Virtual Environment

```bash
cd autofixer
python -m venv .venv
```

### 3. Activate Virtual Environment

**Windows:**

```bash
.venv\Scripts\activate
```

**Linux/Mac:**

```bash
source .venv/bin/activate
```

### 4. Install Dependencies

```bash
pip install -r requirements.txt
```

### 5. Configure API Key

```bash
# Copy example env file
copy .env.example .env

# Edit .env and add your Anthropic API key
# ANTHROPIC_API_KEY=sk-ant-...
```

Get your API key from: <https://console.anthropic.com/>

## Usage

### One-Time Fix

Fix errors from a log file once and exit:

```bash
# Analyze and fix errors (with confirmation)
python fix_once.py error.log

# Dry-run mode (show fixes without applying)
python fix_once.py error.log --dry-run

# From stdin
cat vite.log | python fix_once.py --stdin

# Specify project root
python fix_once.py error.log --project-root C:\dev\my-project
```

### Continuous Monitoring

Watch a log file and auto-fix errors in real-time:

```bash
# Monitor vite dev server logs
python monitor_logs.py --log-file vite.log

# Dry-run mode
python monitor_logs.py --log-file vite.log --dry-run

# Custom check interval (default: 5 seconds)
python monitor_logs.py --log-file vite.log --interval 10

# Auto-apply fixes without confirmation
python monitor_logs.py --log-file vite.log --auto-apply
```

### Direct Usage (Advanced)

Use the main autofixer agent directly:

```bash
# From log file
python main.py --log-file error.log

# From log text
python main.py --log-text "src/App.tsx(15,12): error TS2304: Cannot find name 'React'"

# Options
python main.py --log-file error.log --dry-run --project-root C:\dev\project
```

## Supported Error Types

The autofixer can detect and fix:

- **TypeScript Errors** - Type errors, missing imports, syntax errors
- **JavaScript/Vite Errors** - Module resolution, syntax errors
- **Python Errors** - Import errors, syntax errors, tracebacks
- **ESLint Errors** - Linting issues, unused variables, missing types
- **Import Errors** - Missing modules, incorrect paths
- **Runtime Errors** - Type errors, undefined references

## Examples

### Example 1: Fix TypeScript Error

```bash
# Create a test error log
echo 'src/App.tsx(10,5): error TS2304: Cannot find name "React".' > test.log

# Fix it
python fix_once.py test.log
```

The agent will:

1. Parse the error (missing React import)
2. Read `src/App.tsx`
3. Add `import React from 'react'` at the top
4. Save the file (with backup created)

### Example 2: Monitor Vite Dev Server

```bash
# In terminal 1: Start your dev server
pnpm run dev > vite.log 2>&1

# In terminal 2: Start autofixer
python monitor_logs.py --log-file vite.log --auto-apply
```

Now whenever the Vite server logs an error, autofixer will automatically attempt to fix it!

### Example 3: CI/CD Integration

```bash
# In your CI pipeline
pnpm run build 2>&1 | tee build.log
python fix_once.py build.log --auto-apply

# Retry build after fixes
pnpm run build
```

## Configuration

### Environment Variables (.env)

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-...

# Optional
MODEL_NAME=claude-sonnet-4.5
LOG_FILE_PATH=/path/to/dev/server.log
CHECK_INTERVAL_SECONDS=5
DRY_RUN=false
CREATE_BACKUPS=true
AUTO_APPLY_FIXES=false
```

### Safety Features

The autofixer includes several safety mechanisms:

- **Backups**: Creates `.backup` files before modifying code
- **Dry-Run Mode**: Preview fixes without applying them
- **Confirmation**: Requires user confirmation for risky operations
- **Blocked Commands**: Prevents destructive operations like `rm -rf`
- **File Size Limits**: Refuses to modify very large files

## Project Structure

```
autofixer/
├── main.py              # Core autofixer agent
├── log_parser.py        # Advanced log parsing utilities
├── monitor_logs.py      # Continuous log monitoring
├── fix_once.py          # One-time fix script
├── requirements.txt     # Python dependencies
├── .env.example         # Environment template
├── .gitignore          # Git ignore rules
├── README.md           # This file
└── examples/
    ├── sample_error.log     # Test error logs
    └── sample_config.json   # Configuration examples
```

## How It Works

1. **Parse Logs** - Extract error information (type, file, line, message)
2. **Analyze Context** - Read the problematic file and understand the code
3. **Generate Fix** - Use Claude Agent SDK to determine the best fix
4. **Apply Changes** - Edit the file using safe file operations
5. **Verify** - Optionally re-run the build/tests to confirm the fix

## Troubleshooting

### API Key Not Found

```
Error: ANTHROPIC_API_KEY not found
```

**Solution**: Create a `.env` file with your API key:

```bash
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env
```

### Module Not Found

```
ModuleNotFoundError: No module named 'claude_sdk'
```

**Solution**: Install dependencies:

```bash
pip install -r requirements.txt
```

### Permission Denied

```
PermissionError: [Errno 13] Permission denied: 'src/App.tsx'
```

**Solution**: Ensure the file is not open in another program and you have write permissions.

### No Errors Detected

```
Could not parse error from log content
```

**Solution**: Check that the log contains error messages. See `examples/sample_error.log` for supported formats.

## Advanced Usage

### Custom Error Patterns

Edit `log_parser.py` to add custom error patterns:

```python
PATTERNS = {
    'my_custom_error': {
        'pattern': r'Custom: (.+?):(\d+) - (.+)',
        'groups': {
            'file': 1,
            'line': 2,
            'message': 3
        }
    }
}
```

### Integration with CI/CD

Add to your GitHub Actions workflow:

```yaml
- name: Fix Build Errors
  if: failure()
  run: |
    python -m pip install -r tools/autofixer/requirements.txt
    python tools/autofixer/fix_once.py build.log --auto-apply
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

## Resources

- **Claude Agent SDK Docs**: <https://platform.claude.com/docs/en/api/agent-sdk/python>
- **PyPI Package**: <https://pypi.org/project/claude-agent-sdk/>
- **Anthropic Console**: <https://console.anthropic.com/>
- **Get API Key**: <https://console.anthropic.com/settings/keys>

## License

MIT License - Built using Claude Agent SDK v0.1.14

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review the example files in `examples/`
3. Consult the Claude Agent SDK documentation
4. Verify your API key is valid and has sufficient credits
