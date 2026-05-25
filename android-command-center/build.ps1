$env:JAVA_HOME = "C:\Java\jdk-21"
$env:PATH = "C:\Java\jdk-21\bin;" + $env:PATH
$env:ANDROID_HOME = "C:\Users\fresh_zxae3v6\AppData\Local\Android\Sdk"
$env:ANDROID_SDK_ROOT = "C:\Users\fresh_zxae3v6\AppData\Local\Android\Sdk"

Set-Location "C:\Dev\android-command-center"
[System.IO.Directory]::SetCurrentDirectory("C:\Dev\android-command-center")

Write-Host "Stopping existing daemons..."
cmd.exe /c "gradlew.bat --stop"

Write-Host "Starting optimized Android Command Center compilation..."
cmd.exe /c "gradlew.bat :app:assembleDebug"
