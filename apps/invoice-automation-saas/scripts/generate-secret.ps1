# Generate a secure AUTH_SECRET for InvoiceFlow
# Run: .\scripts\generate-secret.ps1

$bytes = New-Object byte[] 48
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
$secret = [Convert]::ToBase64String($bytes)

Write-Host ""
Write-Host "Your AUTH_SECRET:" -ForegroundColor Green
Write-Host $secret -ForegroundColor Cyan
Write-Host ""
Write-Host "Copy this into your .env.local file as:"
Write-Host "AUTH_SECRET=$secret" -ForegroundColor Yellow
Write-Host ""
Write-Host "This is a 64-character base64 secret (48 bytes of entropy)." -ForegroundColor Gray
Write-Host "Store it somewhere safe -- you cannot recover it if lost." -ForegroundColor Gray
Write-Host ""
