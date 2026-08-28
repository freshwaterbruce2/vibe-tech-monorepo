function Enter-VsBuildToolsEnv {
    $bat = '"C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat"'
    cmd /c "$bat && set" | ForEach-Object {
        if ($_ -match '^(\w+)=(.*)$') {
            $name = $matches[1]
            $value = $matches[2]
            $current = [Environment]::GetEnvironmentVariable($name, 'Process')
            if ($current -ne $value) {
                [Environment]::SetEnvironmentVariable($name, $value, 'Process')
            }
        }
    }
    Write-Host "Visual Studio 2022 BuildTools x64 environment loaded." -ForegroundColor Green
}
