"""Temp: Get typecheck and remaining real lint details."""
import json
from pathlib import Path
from collections import Counter

p = Path(r"D:\logs\self-healing\report_20260215_122429.json")
r = json.loads(p.read_text(encoding="utf-8"))
loops = r.get("loops", [])

# Write results to file to avoid terminal truncation
out = Path(r"D:\logs\self-healing\_analysis.txt")
lines = []

for loop in loops:
    name = loop.get("loop_name", "?")
    details = loop.get("details", [])

    if name == "lint":
        # Get real issues by project + top rules
        build_markers = ["\\dist\\", "\\build\\", "\\package\\", "/dist/", "/build/", "/package/", "assets\\index-", "assets/index-", ".min.js", ".chunk."]
        real_issues = [d for d in details if not (d.get("file") and any(seg in d.get("file", "") for seg in build_markers))]

        lines.append(f"LINT TOTAL: {len(details)}")
        lines.append(f"BUILD ARTIFACT NOISE: {len(details) - len(real_issues)}")
        lines.append(f"REAL ISSUES: {len(real_issues)}")

        # By project
        real_proj = Counter(d.get("project", "?") for d in real_issues)
        lines.append("\nReal lint issues by project:")
        for proj, count in real_proj.most_common():
            lines.append(f"  {proj}: {count}")

        # Top rules
        rule_counter = Counter(d.get("rule", "?") for d in real_issues)
        lines.append("\nTop lint rules:")
        for rule, count in rule_counter.most_common(20):
            lines.append(f"  {rule}: {count}")

        # nova-agent deep dive (biggest offender)
        nova_issues = [d for d in real_issues if d.get("project") == "nova-agent"]
        nova_rules = Counter(d.get("rule", "?") for d in nova_issues)
        lines.append(f"\nnova-agent breakdown ({len(nova_issues)} issues):")
        for rule, count in nova_rules.most_common(10):
            lines.append(f"  {rule}: {count}")

        # Check if nova-agent has build artifact issues being missed
        nova_all = [d for d in details if d.get("project") == "nova-agent"]
        nova_files = set(d.get("file", "") for d in nova_all)
        lines.append(f"\nnova-agent unique files: {len(nova_files)}")
        # Sample file paths
        for f in sorted(nova_files)[:20]:
            lines.append(f"  {f}")

    elif name == "typecheck":
        lines.append(f"\nTYPECHECK TOTAL: {len(details)}")
        proj_counter = Counter(d.get("project", "?") for d in details)
        lines.append("\nAll typecheck projects:")
        for proj, count in proj_counter.most_common():
            lines.append(f"  {proj}: {count}")

        # Top error codes
        code_counter = Counter(d.get("code", "?") for d in details)
        lines.append("\nTop error codes:")
        for code, count in code_counter.most_common(15):
            lines.append(f"  {code}: {count}")

        # Sample errors grouped by project (first 3 per project, top 5 projects)
        for proj, _ in proj_counter.most_common(5):
            proj_issues = [d for d in details if d.get("project") == proj][:3]
            lines.append(f"\n  {proj} samples:")
            for d in proj_issues:
                lines.append(f"    {d.get('code','?')}: {d.get('message','')[:120]}")
                lines.append(f"      file: {d.get('file','?')}")

result = "\n".join(lines)
out.write_text(result, encoding="utf-8")
print(result)
