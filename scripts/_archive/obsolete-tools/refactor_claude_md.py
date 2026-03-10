import os
import re

SOURCE_FILE = r"C:\dev\CLAUDE.md"
OUTPUT_DIR = r"C:\dev\claude-prompts"

# Mapping of Headers to Filenames
# Keys are regex patterns for the headers (without the ## prefix)
# Values are the target filenames
CATEGORY_MAPPING = {
    r"⚡ Quickstart Guardrails": "01-core-guidelines.md",
    r"📦 Monorepo Philosophy": "01-core-guidelines.md",
    r"Architecture Overview": "01-core-guidelines.md",
    r"High-Level Architecture": "01-core-guidelines.md",
    r"Important Notes": "01-core-guidelines.md",
    r"General Guidelines for working with Nx": "01-core-guidelines.md",
    r"🔄 Git Workflow": "02-workflows.md",
    r"💾 D:\\ Drive Version Control": "02-workflows.md",
    r"Active Development Patterns": "02-workflows.md",
    r"Current State Tracking": "02-workflows.md",
    r"Phase 1.5 Memory System": "03-systems-architecture.md",
    r"Learning System": "03-systems-architecture.md",
    r"CI/CD Pipeline Optimizations": "03-systems-architecture.md",
    r"Self-Healing CI": "03-systems-architecture.md",
    r"Key Commands": "04-commands-reference.md",
    r"Custom Slash Commands": "04-commands-reference.md",
    r"Database Operations": "04-commands-reference.md",
    r"Cleanup & Maintenance": "04-commands-reference.md",
    r"Testing Approach": "05-testing-qa.md",
    r"Test Priority Areas": "05-testing-qa.md",
    r"Git Hooks & Pre-commit Quality Gates": "05-testing-qa.md",
    r"MCP Server Configuration & Troubleshooting": "06-troubleshooting.md",
    r"Critical Configuration": "07-project-specifics.md",
    r"WebSocket V2 Integration": "07-project-specifics.md",
    r"Recent System Updates": "08-legacy-updates.md",
}

DEFAULT_FILE = "99-misc.md"


def split_claude_md():
    if not os.path.exists(SOURCE_FILE):
        print(f"Error: Source file {SOURCE_FILE} not found.")
        return

    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)
        print(f"Created directory: {OUTPUT_DIR}")

    with open(SOURCE_FILE, "r", encoding="utf-8") as f:
        content = f.read()

    # Split by H2 headers (## )
    # We use a lookahead to keep the delimiter
    # Pattern: Split exactly at "\n## " or "^## "
    # But we need to handle the first block which might need special handling

    # Simple approach: Read line by line state machine
    lines = content.splitlines()

    sections = {}
    current_header = "Intro"  # Default for content before first H2
    sections[current_header] = []

    for line in lines:
        match = re.match(r"^##\s+(.+)", line)
        if match:
            current_header = match.group(1).strip()
            # Clean up header text for matching (remove emojis if consistent regex matches)
            # But the mapping keys include emojis where present, so raw string is fine.
            sections[current_header] = []
            sections[current_header].append(line)
        else:
            sections[current_header].append(line)

    # Distribute sections to files
    file_contents = {}

    for header, section_lines in sections.items():
        if header == "Intro":
            target_file = "01-core-guidelines.md"  # Put title and intro in core
        else:
            target_file = DEFAULT_FILE
            found_match = False
            for pattern, filename in CATEGORY_MAPPING.items():
                if re.search(pattern, header):
                    target_file = filename
                    found_match = True
                    break

            if not found_match:
                print(
                    f"Warning: No mapping found for header '{header}'. Using {DEFAULT_FILE}"
                )

        if target_file not in file_contents:
            file_contents[target_file] = []

        file_contents[target_file].extend(section_lines)
        file_contents[target_file].append("")  # Add newline between sections

    # Write files
    created_files = []
    for filename, content_lines in file_contents.items():
        full_path = os.path.join(OUTPUT_DIR, filename)
        with open(full_path, "w", encoding="utf-8") as f:
            f.write("\n".join(content_lines))
        created_files.append(filename)
        print(f"Written: {filename}")

    # Create README.md Index
    readme_path = os.path.join(OUTPUT_DIR, "README.md")
    with open(readme_path, "w", encoding="utf-8") as f:
        f.write("# Claude Prompts & Context\n\n")
        f.write("Modularized documentation refactored from CLAUDE.md.\n\n")
        created_files.sort()
        for filename in created_files:
            if filename == "README.md":
                continue
            f.write(f"- [{filename}]({filename})\n")

    print(f"Created Index: README.md")


if __name__ == "__main__":
    split_claude_md()
