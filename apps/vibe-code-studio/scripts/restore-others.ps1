Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class R { [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n);
[DllImport("user32.dll")] public static extern bool IsWindow(IntPtr h); }
"@
$statePath = Join-Path $env:TEMP 'vibe-code-studio-minimized.json'
if (-not (Test-Path $statePath)) { "NO_MINIMIZED_LIST"; exit 0 }
$list = Get-Content $statePath -Raw | ConvertFrom-Json
$n = 0
foreach ($w in $list) {
  $h = [IntPtr][long]$w.hwnd
  if ([R]::IsWindow($h)) {
    # SW_RESTORE = 9
    [R]::ShowWindow($h, 9) | Out-Null
    $n++
  }
}
"RESTORED $n windows"
