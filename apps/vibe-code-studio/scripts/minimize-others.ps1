$sig = @"
using System;
using System.Text;
using System.Collections.Generic;
using System.Runtime.InteropServices;
public class M {
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc cb, IntPtr l);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n);
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  public struct RECT { public int Left, Top, Right, Bottom; }
  public static List<string> Collect() {
    var res = new List<string>();
    EnumWindows((h, l) => {
      if (!IsWindowVisible(h) || IsIconic(h)) return true;
      var sb = new StringBuilder(300);
      GetWindowText(h, sb, 300);
      string t = sb.ToString();
      if (t.Length == 0) return true;
      RECT r; GetWindowRect(h, out r);
      if ((r.Right - r.Left) <= 0 || r.Left <= -30000) return true;
      res.Add(h.ToInt64() + "`t" + t);
      return true;
    }, IntPtr.Zero);
    return res;
  }
  public static void Minimize(long hl) { ShowWindow((IntPtr)hl, 6); }
}
"@
Add-Type -TypeDefinition $sig

$excludePatterns = @(
  'Program Manager',
  'NVIDIA GeForce Overlay',
  'Windows Input Experience',
  'Wispr Flow'
)

$rows = [M]::Collect()
$minimized = @()
foreach ($row in $rows) {
  $parts = $row -split "`t", 2
  $hl = [long]$parts[0]
  $title = $parts[1]
  if ($title -eq 'Vibe Code Studio') { continue }
  $skip = $false
  foreach ($pat in $excludePatterns) { if ($title -match $pat) { $skip = $true; break } }
  if ($skip) { continue }
  [M]::Minimize($hl)
  $minimized += [pscustomobject]@{ hwnd = $hl; title = $title }
}
$statePath = Join-Path $env:TEMP 'vibe-code-studio-minimized.json'
$minimized | ConvertTo-Json -Depth 3 | Set-Content -Path $statePath -Encoding UTF8
"MINIMIZED $($minimized.Count) windows:"
$minimized | ForEach-Object { " - [$($_.hwnd)] $($_.title)" }
