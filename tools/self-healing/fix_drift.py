"""One-shot script: align all project package.json versions to root canonical versions."""

import json
from pathlib import Path

# Canonical versions from root package.json
CANON = {
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "@types/node": "^25.2.0",
    "@types/react": "19.2.10",
    "@types/react-dom": "19.2.3",
    "@vitejs/plugin-react": "^5.1.3",
    "typescript": "5.9.3",
    "vite": "^7.3.1",
    "jsdom": "28.0.0",
    "electron": "40.1.0",
    "zod": "^4.3.6",
    "better-sqlite3": "12.6.2",
    "vitest": "^4.0.18",
    "globals": "^17.3.0",
    "eslint": "^9.39.2",
    "@eslint/js": "^9.39.2",
    "typescript-eslint": "^8.54.0",
    "eslint-plugin-react-refresh": "^0.5.0",
    "eslint-plugin-react-hooks": "^7.0.1",
    "framer-motion": "^12.31.0",
    "lucide-react": "0.563.0",
    "tailwindcss": "4.1.18",
}

root = Path(".")
fixes = []
projects_touched = set()

for pkg_path in sorted(root.rglob("package.json")):
    if "node_modules" in str(pkg_path):
        continue
    if str(pkg_path) == "package.json":
        continue

    with open(pkg_path, "r", encoding="utf-8") as f:
        pkg = json.load(f)

    changed = False
    for section in ["dependencies", "devDependencies"]:
        deps = pkg.get(section, {})
        for name, canon_ver in CANON.items():
            if name in deps and deps[name] != canon_ver:
                old = deps[name]
                deps[name] = canon_ver
                changed = True
                project_name = pkg_path.parent.name
                fixes.append(f"  {project_name}: {name} {old} -> {canon_ver}")
                projects_touched.add(project_name)

    if changed:
        with open(pkg_path, "w", encoding="utf-8") as f:
            json.dump(pkg, f, indent=2, ensure_ascii=False)
            f.write("\n")

print(f"Fixed {len(fixes)} version(s) across {len(projects_touched)} project(s):\n")
for fix in sorted(fixes):
    print(fix)
