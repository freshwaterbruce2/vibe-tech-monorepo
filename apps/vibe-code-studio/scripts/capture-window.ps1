param([string]$Name = "vcs-shot", [int]$Pid2 = 0)
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$sig = @"
using System;
using System.Runtime.InteropServices;
public class W {
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n);
  public struct RECT { public int Left, Top, Right, Bottom; }
}
"@
Add-Type -TypeDefinition $sig
if ($Pid2 -gt 0) { $p = Get-Process -Id $Pid2 -ErrorAction SilentlyContinue }
if (-not $p) { $p = Get-Process | Where-Object { $_.MainWindowTitle -match 'Vibe Code Studio' } | Select-Object -First 1 }
if (-not $p) { Write-Output "WINDOW_NOT_FOUND"; exit 1 }
[W]::ShowWindow($p.MainWindowHandle, 9) | Out-Null
[W]::SetForegroundWindow($p.MainWindowHandle) | Out-Null
Start-Sleep -Milliseconds 400
$r = New-Object W+RECT
[W]::GetWindowRect($p.MainWindowHandle, [ref]$r) | Out-Null
$w = $r.Right - $r.Left
$h = $r.Bottom - $r.Top
$bmp = New-Object System.Drawing.Bitmap($w, $h)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($r.Left, $r.Top, 0, 0, (New-Object System.Drawing.Size($w, $h)))
$path = "D:\screenshots\$Name.png"
$bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()
Write-Output "SAVED $path rect=L$($r.Left),T$($r.Top),R$($r.Right),B$($r.Bottom) w=$w h=$h"
