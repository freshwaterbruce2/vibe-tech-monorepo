Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bmp = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
$graphics = [System.Drawing.Graphics]::FromImage($bmp)
$graphics.CopyFromScreen(0, 0, 0, 0, $bmp.Size)
$bmp.Save("C:\Users\fresh_zxae3v6\.gemini\antigravity-cli\brain\ac8b2442-bac9-4d7f-9260-8ccb85b9fa6a\screenshot4.png")
$graphics.Dispose()
$bmp.Dispose()
Write-Output "Screenshot saved!"
