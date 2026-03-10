Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win32Helper {
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
}
"@

$proc = Get-Process -Name "electron" | Where-Object { $_.MainWindowTitle -like "*Vibe Code Studio*" }
if ($proc) {
    Write-Host "Found window: $($proc.MainWindowTitle)"
    [Win32Helper]::ShowWindow($proc.MainWindowHandle, 9)
    [Win32Helper]::SetForegroundWindow($proc.MainWindowHandle)
    Write-Host "Window brought to foreground"
} else {
    Write-Host "Window not found"
}
