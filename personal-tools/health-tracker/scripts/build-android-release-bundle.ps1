$ErrorActionPreference = 'Stop'

$appRoot = Split-Path -Parent $PSScriptRoot
$jbr = 'C:\Program Files\Android\Android Studio\jbr'
$localAppData = [Environment]::GetFolderPath('LocalApplicationData')
if (-not $localAppData) {
  $localAppData = Join-Path $env:USERPROFILE 'AppData\Local'
}
$sdk = Join-Path $localAppData 'Android\Sdk'

if (-not (Test-Path -Path (Join-Path $jbr 'bin\java.exe'))) {
  throw "Android Studio JBR was not found at $jbr"
}

if (-not (Test-Path -Path $sdk)) {
  throw "Android SDK was not found at $sdk"
}

$env:JAVA_HOME = $jbr
$env:ANDROID_HOME = $sdk
$env:ANDROID_SDK_ROOT = $sdk
$env:Path = "$jbr\bin;$sdk\platform-tools;$sdk\cmdline-tools\latest\bin;$env:Path"

Set-Location -Path $appRoot
pnpm run mobile:sync

Set-Location -Path (Join-Path $appRoot 'android')
.\gradlew.bat bundleRelease --console=plain --no-daemon --stacktrace
