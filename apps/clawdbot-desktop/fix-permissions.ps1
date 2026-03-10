# Fix ClawdBot file permissions
$clawdbotPath = "$env:USERPROFILE\.clawdbot"

Write-Host "Fixing permissions for: $clawdbotPath"

# Take ownership
takeown /F $clawdbotPath /R /D Y

# Reset permissions to inherited
icacls $clawdbotPath /reset /T

# Grant full control to current user
icacls $clawdbotPath /grant "$($env:USERNAME):(OI)(CI)F" /T

Write-Host "Done! Try running clawdbot now."
