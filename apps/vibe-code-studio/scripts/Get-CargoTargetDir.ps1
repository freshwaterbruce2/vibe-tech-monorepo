function Get-CargoTargetDir {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ProjectRoot
    )

    $manifestPath = Join-Path $ProjectRoot 'src-tauri\Cargo.toml'
    if (Test-Path $manifestPath) {
        try {
            $metadataJson = cargo metadata --format-version 1 --no-deps --manifest-path $manifestPath 2>$null
            if ($LASTEXITCODE -eq 0 -and $metadataJson) {
                $metadata = $metadataJson | ConvertFrom-Json
                if ($metadata.target_directory) {
                    return [System.IO.Path]::GetFullPath([string]$metadata.target_directory)
                }
            }
        } catch {
            # Fall through to environment/default fallback below.
        }
    }

    if ($env:CARGO_TARGET_DIR) {
        return [System.IO.Path]::GetFullPath([string]$env:CARGO_TARGET_DIR)
    }

    return (Join-Path $ProjectRoot 'src-tauri\target')
}
