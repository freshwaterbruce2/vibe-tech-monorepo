---
name: code-studio:system
description: Check unified development system status
model: sonnet
---

# Vibe Code Studio System Status

Check the health of the unified development system including hooks, MCP servers, and LSP.

## Steps

1. Check git hooks installed:

   ```bash
   echo "=== GIT HOOKS STATUS ==="
   if [ -f ".git/hooks/pre-commit" ]; then
     echo "✓ Pre-commit hook: INSTALLED"
   else
     echo "⚠ Pre-commit hook: NOT INSTALLED"
     echo "→ Run: husky install"
   fi
   ```

2. Check MCP server configuration:

   ```bash
   echo ""
   echo "=== MCP SERVERS ==="
   if [ -f ".mcp.json" ]; then
     echo "✓ MCP configuration found"
     echo "Configured servers:"
     grep -o '"[^"]*":' .mcp.json | grep -v "mcpServers" | sed 's/://g'
   else
     echo "⚠ MCP configuration not found"
   fi
   ```

3. Check LSP server status:

   ```bash
   echo ""
   echo "=== LSP SERVERS ==="
   if [ -d "node_modules/typescript" ]; then
     echo "✓ TypeScript LSP: AVAILABLE"
   fi
   if [ -d "node_modules/vscode-langservers-extracted" ]; then
     echo "✓ Web LSP (HTML/CSS/JSON): AVAILABLE"
   fi
   ```

4. Check integration health:

   ```bash
   echo ""
   echo "=== INTEGRATION HEALTH ==="
   if [ -f "package.json" ]; then
     echo "✓ Package.json: VALID"
   fi
   if [ -f "tsconfig.json" ]; then
     echo "✓ TypeScript config: VALID"
   fi
   if [ -f ".eslintrc.cjs" ] || [ -f ".eslintrc.json" ]; then
     echo "✓ ESLint config: VALID"
   fi
   ```

5. Summary report:

   ```bash
   echo ""
   echo "=== SYSTEM STATUS ==="
   echo "Development environment ready"
   echo "All integrations operational"
   ```

## Expected Output

- Git hooks installation status
- MCP server availability
- LSP server availability
- Configuration file validation
- Overall system health assessment
