import subprocess

# (file, [(old, new), ...]) - applied after stripping U+FE0F variation selectors
EXPLICIT = {
    'apps/vtde/src-tauri/src/auth.rs': [
        ('<h1>✅ Authenticated!</h1>', '<h1>Authenticated!</h1>'),
    ],
    'apps/vtde/src/desktop/Desktop.tsx': [
        ("cycle.dry_run ? '\U0001F512 Dry Run' : '⚡ Live'", "cycle.dry_run ? 'Dry Run' : 'Live'"),
        ("icon: '\U0001F6E1',", "icon: '[heal]',"),
        ("icon: '\U0001F680',", "icon: '[ok]',"),
        ("icon: '❌',", "icon: '[err]',"),
        ("icon: '\U0001F6D1',", "icon: '[stop]',"),
        ("icon: '⚠',", "icon: '[warn]',"),
        ("terminal: '⚡',", "terminal: '>_',"),
        ("memory: '\U0001F9E0',", "memory: 'M',"),
        ("app: '\U0001F310',", "app: 'W',"),
        ("explorer: '\U0001F4C1',", "explorer: 'E',"),
        ("orchestrator: '\U0001F39B',", "orchestrator: 'O',"),
        ("database: '\U0001F5C4',", "database: 'D',"),
        ("'memory-viz': '\U0001F578',", "'memory-viz': 'V',"),
        ("affected: '\U0001F4C8',", "affected: 'A',"),
        ("?? '\U0001F310'", "?? 'W'"),
    ],
    'apps/vtde/src/desktop/Launcher.tsx': [
        ("emoji: '✅'", "emoji: 'OK'"),
        ("emoji: '⚠'", "emoji: '!'"),
    ],
    'apps/vtde/src/desktop/Taskbar.tsx': [
        ("{ id: 'nova-agent', title: 'Nova Agent', icon: '\U0001F9E0' }",
         "{ id: 'nova-agent', title: 'Nova Agent', icon: 'N' }"),
        ("{ id: 'vibe-code-studio', title: 'Vibe Code Studio', icon: '⚡' }",
         "{ id: 'vibe-code-studio', title: 'Vibe Code Studio', icon: '</>' }"),
        ("{ id: 'terminal', title: 'Terminal', icon: '\U0001F4BB' }",
         "{ id: 'terminal', title: 'Terminal', icon: '>_' }"),
        ("{ id: 'orchestrator', title: 'Control Plane', icon: '\U0001F39B' }",
         "{ id: 'orchestrator', title: 'Control Plane', icon: 'O' }"),
        ("{ id: 'database', title: 'Databases', icon: '\U0001F5C4' }",
         "{ id: 'database', title: 'Databases', icon: 'D' }"),
        ("{ id: 'memory-viz', title: 'Memory', icon: '\U0001F578' }",
         "{ id: 'memory-viz', title: 'Memory', icon: 'M' }"),
        ("{ id: 'affected', title: 'Affected', icon: '\U0001F4C8' }",
         "{ id: 'affected', title: 'Affected', icon: 'A' }"),
        ("healing?.running ? '\U0001F504' : '\U0001F6E1'", "healing?.running ? '~' : '+'"),
        ("'Healed ✓'", "'Healed'"),
        ("? '⚡'", "? '>_'"),
        ("? '\U0001F9E0'", "? 'M'"),
        ("? '\U0001F4C1'", "? 'E'"),
        ("? '\U0001F39B'", "? 'O'"),
        ("? '\U0001F5C4'", "? 'D'"),
        ("? '\U0001F4C8'", "? 'A'"),
        (": '\U0001F310';", ": 'W';"),
        ('⏻', 'O'),
    ],
    'apps/vtde/src/desktop/apps/AffectedVisualizer.tsx': [
        ('<span>\U0001F4C8</span>', '<span>A</span>'),
        ('\U0001F525 Build Affected', 'Build Affected'),
    ],
    'apps/vtde/src/desktop/apps/AgentOrchestrator.tsx': [
        ('<span>\U0001F39B</span>', '<span>O</span>'),
        ('`\U0001F504 Healing', '`Healing'),
        ("'\U0001F6E1 Run Self-Healing'", "'Run Self-Healing'"),
    ],
    'apps/vtde/src/desktop/apps/DatabaseExplorer.tsx': [
        ('<span>\U0001F5C4</span>', '<span>D</span>'),
    ],
    'apps/vtde/src/desktop/apps/MemoryVisualizer.tsx': [
        ('<span>\U0001F578</span>', '<span>M</span>'),
    ],
    'apps/vtde/src/widgets/HealingDashboard.tsx': [
        ("cycle.dry_run ? '\U0001F512 Dry Run' : '⚡ Live'", "cycle.dry_run ? 'Dry Run' : 'Live'"),
        ('\U0001F6E1 Self-Healing Monitor', 'Self-Healing Monitor'),
    ],
    'apps/vtde/src/widgets/MemoryPanel.tsx': [
        ('\U0001F9E0 Neural Memory', 'Neural Memory'),
    ],
    'apps/vtde/src/widgets/NovaQuickChat.tsx': [
        ('\U0001F916 Nova', 'Nova'),
        ('>\U0001F9E0</span>', '>mem</span>'),
        ('\U0001F511 Sign in', 'Sign in'),
    ],
    'apps/vtde/src/widgets/SystemMonitor.tsx': [
        ('⚡ System Monitor', 'System Monitor'),
    ],
    'apps/vtde/src/widgets/WindowFrame.tsx': [
        ("'❐' : '□'", "'#' : '[]'"),
    ],
    'scripts/run-hooks-e2e-tests.ps1': [
        ('✅ E2E Hook Testing PASSED.', 'E2E Hook Testing PASSED.'),
    ],
}

GLOBAL = {
    '─': '-',    # box drawing
    '—': '-',    # em dash
    '…': '...',  # ellipsis
    '→': '->',   # right arrow
    '↔': '<->',  # left-right arrow
    '·': '-',    # middle dot separator
    '✕': 'x',    # close glyph
    '▼': 'v',    # down triangle
    '▶': '>',    # right triangle
    '●': '*',    # dot indicator
}

out = subprocess.run(['git', 'status', '--porcelain', '--untracked-files=all'],
                     capture_output=True, text=True).stdout
files = [l[3:].strip('"') for l in out.splitlines() if l.startswith('??')]
exts = ('.ts', '.tsx', '.js', '.jsx', '.py', '.rs', '.ps1', '.sh', '.toml',
        '.json', '.yaml', '.yml', '.css', '.html', '.mjs')
files = [f for f in files if f.endswith(exts) and not f.startswith('apps/vibe-shop/')]

unresolved = []
for f in files:
    s = open(f, encoding='utf-8', newline='').read()
    orig = s
    s = s.replace('️', '')              # strip emoji variation selectors
    for old, new in EXPLICIT.get(f, []):
        if old not in s:
            print('MISS %s :: %r' % (f, old[:60]))
        s = s.replace(old, new)
    for old, new in GLOBAL.items():
        s = s.replace(old, new)
    if s != orig:
        open(f, 'w', encoding='utf-8', newline='').write(s)
    for i, l in enumerate(s.splitlines(), 1):
        for ch in l:
            if ord(ch) > 127 and not (i == 1 and ch == '﻿'):
                unresolved.append('%s:%d U+%04X %r' % (f, i, ord(ch), l.strip()[:70]))
                break

print('unresolved:', len(unresolved))
for u in unresolved[:20]:
    print(' ', u)
