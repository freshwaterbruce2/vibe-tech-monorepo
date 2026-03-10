# Workspace Structure

`C:\dev` is the local workspace root for source code. It is not a storage location for live databases, generated releases, or machine-specific tool state.

## Keep In Git

- `apps/`
- `backend/`
- `docs/`
- `packages/`
- `plugins/`
- `projects/`
- `scripts/`
- `tests/`
- `tools/`
- `types/`
- root config files such as `package.json`, `nx.json`, `pnpm-workspace.yaml`, and `.github/`

## Keep Local Only

- `D:\databases\`
- learning-system data on `D:\`
- `.env*` files other than examples/templates
- `node_modules/`, `dist/`, `build/`, `release/`, `target/`
- `_backups/`, `output/`, screenshots, logs, and test artifacts
- local AI/tool state such as `.agent/`, `.agents/`, `.codex-home/`, `.pnpm/`, `.serena/`

## Repo Rules

- Do not use submodules for active monorepo projects.
- If a nested project has its own historical `.git` directory, archive that metadata and track the folder contents from the root repo instead.
- Do not commit live databases, packaged binaries, or generated media.
- Use `.env.example` or templates for configuration samples.
