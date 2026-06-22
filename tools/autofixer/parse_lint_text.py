import sys, re

path = sys.argv[1]
files = {}
cur = None
with open(path, encoding='utf-8', errors='replace') as fh:
    for line in fh:
        s = re.sub(r'\x1b\[[0-9;]*m', '', line).rstrip()
        t = s.strip()
        # file header line: ends in .ts/.tsx/.js/.jsx and looks like a path
        if re.search(r'\.(ts|tsx|js|jsx)$', t) and ('/' in t or '\\' in t) and 'error' not in t and 'warning' not in t:
            cur = t
            files.setdefault(cur, {'ml': 0, 'fn': 0, 'lines': 0, 'other': 0})
            continue
        if cur and ('error' in s or 'warning' in s):
            if 'max-len' in s:
                files[cur]['ml'] += 1
            elif 'max-lines-per-function' in s:
                files[cur]['fn'] += 1
            elif 'max-lines' in s:
                files[cur]['lines'] += 1
            elif re.search(r'\b\w[\w-]+/[\w-]+\s*$', s) or 'error' in s:
                files[cur]['other'] += 1

nonempty = {k: v for k, v in files.items() if sum(v.values()) > 0}
tot_ml = sum(v['ml'] for v in nonempty.values())
tot_fn = sum(v['fn'] for v in nonempty.values())
tot_lines = sum(v['lines'] for v in nonempty.values())
tot_other = sum(v['other'] for v in nonempty.values())
print(f'FILES={len(nonempty)} max-len={tot_ml} max-lines-per-function={tot_fn} max-lines(file)={tot_lines} other={tot_other}')
for k, v in sorted(nonempty.items(), key=lambda x: -sum(x[1].values())):
    short = k.split('vibe-code-studio/')[-1].split('nova-agent/')[-1]
    print(f"  ml={v['ml']:>2} fn={v['fn']:>2} other={v['other']:>2}  {short}")
