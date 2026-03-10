# Contributing to DeepCode Editor

Thank you for your interest in contributing to DeepCode Editor! This guide will help you avoid common errors and maintain code quality.

## 🚀 Getting Started

1. **Fork and Clone**

   ```bash
   git clone https://github.com/yourusername/deepcode-editor.git
   cd deepcode-editor
   npm install
   ```

2. **Setup Development Environment**

   ```bash
   npm run prepare  # Sets up git hooks
   ```

3. **Verify Setup**

   ```bash
   npm run type-check  # Should pass without errors
   npm run lint        # Should pass without errors
   npm test           # All tests should pass
   ```

## 📋 Before You Code

### 1. **Check TypeScript Configuration**

Our project uses strict TypeScript settings. Before starting:

- Run `npm run type-check` to ensure no existing errors
- Review `tsconfig.json` for strict settings
- Use VS Code with recommended extensions

### 2. **Understand the Architecture**

- We're migrating to a modular structure
- Check `/src/modules/` for the new pattern
- Follow existing patterns in the codebase

## 🛡️ Error Prevention Guidelines

### TypeScript Best Practices

1. **Always Define Types**

   ```typescript
   // ❌ Bad
   function processData(data) { ... }

   // ✅ Good
   function processData(data: UserData): ProcessedData { ... }
   ```

2. **Handle Null/Undefined**

   ```typescript
   // ❌ Bad
   const value = object.property.nested;

   // ✅ Good
   const value = object?.property?.nested ?? defaultValue;
   ```

3. **Use Proper Type Guards**

   ```typescript
   // ❌ Bad
   catch (error) {
     console.log(error.message)
   }

   // ✅ Good
   catch (error) {
     const message = error instanceof Error ? error.message : 'Unknown error'
     console.log(message)
   }
   ```

4. **Avoid 'any' Type**

   ```typescript
   // ❌ Bad
   const config: any = { ... }

   // ✅ Good
   const config: Record<string, unknown> = { ... }
   // or better, define a proper interface
   ```

### Common Pitfalls to Avoid

1. **Theme Property Access**
   - Always check available properties in `src/styles/theme.ts`
   - Use TypeScript autocomplete to avoid typos

   ```typescript
   // ❌ Bad
   theme.fontSize.md; // 'md' doesn't exist

   // ✅ Good
   theme.fontSize.base;
   ```

2. **Electron API Usage**
   - Use `window.electronAPI`, not `window.electron`
   - Always check if running in Electron context

   ```typescript
   // ✅ Good
   if (window.electronAPI) {
     await window.electronAPI.someMethod();
   }
   ```

3. **Import Organization**
   - Imports are automatically sorted by ESLint
   - Don't manually organize imports
   - Let the tools handle it on save

4. **Unused Variables**
   - Remove truly unused code
   - Prefix intentionally unused params with `_`

   ```typescript
   // ✅ Good
   onClick={(_event) => handleClick()}
   ```

## 🧪 Testing Requirements

1. **Write Tests for New Features**
   - Unit tests for utilities and hooks
   - Component tests for UI components
   - Integration tests for complex flows

2. **Run Tests Before Committing**

   ```bash
   npm test              # Run all tests
   npm run test:watch    # Watch mode during development
   ```

3. **Test TypeScript Types**

   ```typescript
   // Use type assertions in tests
   expectTypeOf<ReturnType<typeof myFunction>>().toEqualTypeOf<ExpectedType>();
   ```

## 🔄 Development Workflow

1. **Start Development**

   ```bash
   npm run dev          # Start development server
   npm run type-watch   # Watch for type errors in another terminal
   ```

2. **Before Committing**
   - Save all files (auto-formats and fixes)
   - Check for TypeScript errors: `npm run type-check`
   - Run tests: `npm test`
   - The pre-commit hook will catch any remaining issues

3. **Commit Messages**
   Follow conventional commits:

   ```
   feat: add new feature
   fix: resolve bug
   docs: update documentation
   refactor: improve code structure
   test: add tests
   chore: update dependencies
   ```

## 📝 Code Review Checklist

Before submitting a PR, ensure:

- [ ] No TypeScript errors (`npm run type-check`)
- [ ] No ESLint errors (`npm run lint`)
- [ ] All tests pass (`npm test`)
- [ ] New code has tests
- [ ] Imports are properly typed
- [ ] No `any` types without justification
- [ ] Proper error handling with type guards
- [ ] Documentation for public APIs
- [ ] Commit messages follow convention

## 🚨 When You Encounter Errors

1. **TypeScript Errors**
   - Don't ignore them with `@ts-ignore`
   - Fix the root cause
   - Ask for help if needed

2. **Build Errors**
   - Run `npm run build` locally before pushing
   - Check import paths are correct
   - Ensure all dependencies are installed

3. **Test Failures**
   - Run failing tests in isolation
   - Check for timing issues
   - Update snapshots if UI legitimately changed

## 🛠️ Useful Commands

```bash
# Type checking
npm run type-check          # Check all files
npm run type-check:build    # Check with build config
npm run type-check:watch    # Watch mode

# Linting and formatting
npm run lint               # Run ESLint
npm run lint:fix          # Auto-fix issues
npm run format            # Run Prettier

# Testing
npm test                  # Run all tests
npm run test:watch        # Watch mode
npm run test:coverage     # With coverage

# Building
npm run build             # Production build
npm run preview          # Preview production build

# Git hooks (manual run)
npm run pre-commit        # Run pre-commit checks
npm run pre-push         # Run pre-push checks
```

## 📚 Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)
- [ESLint Rules](https://eslint.org/docs/rules/)
- [Conventional Commits](https://www.conventionalcommits.org/)

## 💬 Getting Help

- Check existing issues and PRs
- Ask in discussions
- Tag maintainers for code review

Remember: The tools are here to help you write better code. Don't fight them, work with them!
