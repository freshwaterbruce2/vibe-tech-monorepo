# Claude Desktop Project Knowledge

This directory contains comprehensive documentation for the C:\dev monorepo, specifically designed for use with Claude Desktop's project knowledge feature.

## 📚 Documentation Overview

### Essential Reading

1. **[CLAUDE_DESKTOP_INSTRUCTIONS.md](CLAUDE_DESKTOP_INSTRUCTIONS.md)** - START HERE
   - Primary instruction set for Claude Desktop
   - Safety protocols (especially for trading bot)
   - Quick reference commands
   - When to ask vs. execute
   - Core principles

2. **[MONOREPO_ARCHITECTURE.md](MONOREPO_ARCHITECTURE.md)**
   - Complete architectural overview
   - Technology stacks for each project
   - Directory structure
   - Component interactions
   - Deployment information

3. **[TRADING_BOT_GUIDE.md](TRADING_BOT_GUIDE.md)** ⚠️ CRITICAL
   - Live trading system specifics
   - Safety mechanisms
   - Kraken API integration
   - Risk parameters
   - Testing requirements
   - Emergency procedures

### Reference Guides

1. **[COMMON_WORKFLOWS.md](COMMON_WORKFLOWS.md)**
   - Daily development tasks
   - Making changes (web app, trading bot, backend)
   - Testing workflows
   - Dependency management
   - Debugging procedures
   - Database operations
   - Deployment processes

2. **[QUALITY_STANDARDS.md](QUALITY_STANDARDS.md)**
   - TypeScript/React best practices
   - Python async patterns
   - Testing standards
   - Code style guidelines
   - Security requirements
   - Performance considerations

3. **[TROUBLESHOOTING_GUIDE.md](TROUBLESHOOTING_GUIDE.md)**
   - Common issues and solutions
   - Web app problems
   - Trading bot errors
   - Environment issues
   - Performance debugging
   - Emergency procedures

## 🎯 How to Use This Knowledge Base

### For Claude Desktop Users

These files are designed to be used with Claude Desktop's project knowledge feature:

1. **Add this directory to your project**:
   - Open Claude Desktop
   - Add the C:\dev directory as a project
   - Claude will automatically have access to these guides

2. **Claude will automatically reference these files**:
   - When working on web app features
   - When reviewing trading bot code
   - When troubleshooting issues
   - When answering architecture questions

3. **You can explicitly reference them**:
   - "Check the trading bot guide before changing that"
   - "What does the troubleshooting guide say about port conflicts?"
   - "Follow the quality standards for this PR"

### For Developers

Even without Claude Desktop, these guides are valuable:

1. **Onboarding**: Read in order (1-6) to understand the monorepo
2. **Daily Work**: Keep COMMON_WORKFLOWS.md handy
3. **Code Reviews**: Use QUALITY_STANDARDS.md as checklist
4. **Debugging**: TROUBLESHOOTING_GUIDE.md for common issues
5. **Trading Bot**: Read TRADING_BOT_GUIDE.md before ANY changes

## 🚨 Critical Warnings

### Trading Bot Safety

The trading bot in `apps/crypto-enhanced/` can trade with REAL MONEY when a
human operator starts it:

- Do not start, restart, or auto-confirm live trading from an agent workflow
- Use status, logs, and tests for review work unless the user explicitly takes over
- Verify balance and open positions from the runtime before quoting values
- Read TRADING_BOT_GUIDE.md BEFORE making ANY changes
- When in doubt, ASK FIRST

### Security

NEVER commit:

- `.env` files
- API keys or secrets
- Database credentials
- Trading bot configuration with real keys

All sensitive files are in `.gitignore`, but double-check before committing.

## 📊 Quick Reference

### Most Common Commands

```powershell
# Web App Development
pnpm run dev              # Start dev server
pnpm run quality          # Run all quality checks

# Trading Bot (CAUTION)
cd apps\crypto-enhanced
.venv\Scripts\activate
python scripts\check_status.py  # Check status
# Human operator only: live start/restart commands are intentionally omitted

# Monorepo Management
pnpm install             # Install dependencies
nx run-many -t quality   # Quality check all projects
```

### File Structure

```
.claude/
├── README.md                        # This file
├── CLAUDE_DESKTOP_INSTRUCTIONS.md   # Main instructions
├── MONOREPO_ARCHITECTURE.md         # Architecture details
├── TRADING_BOT_GUIDE.md             # ⚠️ Critical safety guide
├── COMMON_WORKFLOWS.md              # Day-to-day tasks
├── QUALITY_STANDARDS.md             # Code standards
└── TROUBLESHOOTING_GUIDE.md         # Problem solutions
```

## 🔄 Keeping Documentation Updated

### When to Update These Files

- **Architecture changes**: Update MONOREPO_ARCHITECTURE.md
- **New workflows**: Update COMMON_WORKFLOWS.md
- **New quality rules**: Update QUALITY_STANDARDS.md
- **New problems solved**: Update TROUBLESHOOTING_GUIDE.md
- **Trading bot changes**: Update TRADING_BOT_GUIDE.md
- **Claude behavior changes**: Update CLAUDE_DESKTOP_INSTRUCTIONS.md

### How to Update

1. Make changes to the relevant .md file
2. Test that the guidance is accurate
3. Commit with descriptive message:

   ```bash
   git add .claude/
   git commit -m "docs: update trading bot guide with new API changes"
   ```

## 🎓 Learning Path

### For New Developers

1. **Day 1**: Read CLAUDE_DESKTOP_INSTRUCTIONS.md and MONOREPO_ARCHITECTURE.md
2. **Day 2-3**: Follow COMMON_WORKFLOWS.md to make first changes
3. **Week 1**: Study QUALITY_STANDARDS.md, write code following standards
4. **Ongoing**: Reference TROUBLESHOOTING_GUIDE.md as issues arise
5. **Before Trading Bot**: Read TRADING_BOT_GUIDE.md multiple times

### For Claude Desktop

Claude automatically reads these files when working on the project. The guides are designed to:

- Prevent common mistakes
- Ensure consistent code quality
- Maintain safety (especially for trading bot)
- Provide quick reference for commands and patterns

## 🛠️ Maintenance

### Review Schedule

- **Weekly**: Check if any guides need minor updates
- **Monthly**: Review all guides for accuracy
- **After major changes**: Update relevant documentation immediately
- **When onboarding**: Use as opportunity to improve clarity

### Quality Checks

Documentation should be:

- ✅ Accurate and up-to-date
- ✅ Clear and concise
- ✅ Practical with real examples
- ✅ Comprehensive but not overwhelming
- ✅ Easy to navigate and search

## 🤝 Contributing

If you find:

- Inaccuracies
- Missing information
- Unclear explanations
- Better ways to do things

Please update the relevant file and commit the changes!

## 📞 Support

For questions not covered in these guides:

1. Check the actual code and configurations
2. Review git history for context
3. Ask team members
4. Update documentation with what you learned

---

**Remember**: These guides are living documents. Keep them updated as the monorepo evolves!

---

## 🎯 Quick Links

- [Main Instructions](CLAUDE_DESKTOP_INSTRUCTIONS.md) - Start here
- [Architecture](MONOREPO_ARCHITECTURE.md) - How everything fits together
- [Trading Bot Safety](TRADING_BOT_GUIDE.md) - ⚠️ Read before touching crypto code
- [Daily Workflows](COMMON_WORKFLOWS.md) - How to get things done
- [Code Quality](QUALITY_STANDARDS.md) - Standards and best practices
- [Troubleshooting](TROUBLESHOOTING_GUIDE.md) - Fix common problems

---

**Last Updated**: October 12, 2025
**Monorepo Version**: C:\dev (React 19.2.4, TypeScript 5.9.3, Python 3.12+)
