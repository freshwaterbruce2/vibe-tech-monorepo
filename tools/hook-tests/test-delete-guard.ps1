# Self-contained tester for the delete-guard hook. Run via: pwsh -File D:\temp\test-delete-guard.ps1
$hook = 'V:\monorepo\.claude\hooks\delete-guard.ps1'
$cases = @(
  @{ d='rm -rf <root>';              exp='BLOCK'; j='{"tool_input":{"command":"rm -rf V:\\monorepo"}}' }
  @{ d='Remove-Item <root> -Recurse';exp='BLOCK'; j='{"tool_input":{"command":"Remove-Item V:/monorepo -Recurse -Force"}}' }
  @{ d='rm -rf apps (rel,in repo)';  exp='BLOCK'; j='{"tool_input":{"command":"rm -rf apps"},"cwd":"V:\\monorepo"}' }
  @{ d='git clean -fdx (in repo)';   exp='BLOCK'; j='{"tool_input":{"command":"git clean -fdx"},"cwd":"V:\\monorepo"}' }
  @{ d='rm -rf . (in repo)';         exp='BLOCK'; j='{"tool_input":{"command":"rm -rf ."},"cwd":"V:\\monorepo"}' }
  @{ d='del /s <root>\packages';     exp='BLOCK'; j='{"tool_input":{"command":"del /s V:\\monorepo\\packages"}}' }
  @{ d='rm -rf node_modules';        exp='ALLOW'; j='{"tool_input":{"command":"rm -rf node_modules"},"cwd":"V:\\monorepo"}' }
  @{ d='rm -rf apps/x/dist (artif)'; exp='ALLOW'; j='{"tool_input":{"command":"rm -rf apps/vibe-tutor/dist"},"cwd":"V:\\monorepo"}' }
  @{ d='rm -rf <root>\apps\x\dist';  exp='ALLOW'; j='{"tool_input":{"command":"rm -rf V:\\monorepo\\apps\\x\\dist"}}' }
  @{ d='pnpm build (non-destruct)';  exp='ALLOW'; j='{"tool_input":{"command":"pnpm nx build memory-mcp"},"cwd":"V:\\monorepo"}' }
  @{ d='rm -rf <root>.old backup';   exp='ALLOW'; j='{"tool_input":{"command":"rm -rf V:/monorepo.old_20260617"}}' }
)
$fail = 0
foreach ($c in $cases) {
  $c.j | & pwsh -NoProfile -ExecutionPolicy Bypass -File $hook 2>$null | Out-Null
  $got = if ($LASTEXITCODE -eq 2) { 'BLOCK' } else { 'ALLOW' }
  $mark = if ($got -eq $c.exp) { 'PASS' } else { $fail++; '**FAIL**' }
  '{0,-8} exp={1,-5} got={2,-5} {3}' -f $mark, $c.exp, $got, $c.d
}
"`n$($cases.Count - $fail)/$($cases.Count) passed"
