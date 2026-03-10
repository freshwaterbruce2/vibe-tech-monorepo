# VS Code Extension Cleanup Script
# Keeps: Augment, essential dev tools
# Removes: Competing AI, Java, heavy enterprise tools

$toDisable = @(
    # AI COMPETITORS (keep only Augment)
    "github.copilot",
    "github.copilot-chat",
    "google.geminicodeassist",
    "google.gemini-cli-vscode-ide-companion",
    "printfn.gemini-improved",
    
    # JAVA ECOSYSTEM (not using)
    "redhat.java",
    "vscjava.vscode-gradle",
    "vscjava.vscode-java-debug",
    "vscjava.vscode-java-dependency",
    "vscjava.vscode-java-pack",
    "vscjava.vscode-java-test",
    "vscjava.vscode-maven",
    
    # SQL SERVER (use SQLite tools instead)
    "ms-mssql.data-workspace-vscode",
    "ms-mssql.mssql",
    "ms-mssql.sql-bindings-vscode",
    "ms-mssql.sql-database-projects-vscode",
    
    # JUPYTER (heavy, use separate if needed)
    "ms-toolsai.jupyter",
    "ms-toolsai.jupyter-keymap",
    "ms-toolsai.jupyter-renderers",
    "ms-toolsai.vscode-jupyter-cell-tags",
    "ms-toolsai.vscode-jupyter-slideshow",
    
    # REMOTE TOOLS (not using remote dev)
    "ms-vscode-remote.remote-containers",
    "ms-vscode-remote.remote-ssh",
    "ms-vscode-remote.remote-ssh-edit",
    "ms-vscode-remote.remote-wsl",
    "ms-vscode.remote-explorer",
    "ms-vscode.remote-repositories",
    "ms-vscode.remote-server",
    "github.remotehub",
    "github.codespaces",
    
    # HEAVY LINTING (SonarLint is enterprise-grade)
    "sonarsource.sonarlint-vscode",
    
    # REDUNDANT/HEAVY
    "ms-edgedevtools.vscode-edge-devtools",
    "firefox-devtools.vscode-firefox-debug",
    "ms-vscode.cmake-tools",
    "ms-azuretools.vscode-azureresourcegroups"
)

Write-Host "=== VS Code Extension Cleanup ===" -ForegroundColor Cyan
Write-Host "Disabling $($toDisable.Count) heavy/redundant extensions...`n"

foreach ($ext in $toDisable) {
    Write-Host "Disabling: $ext" -ForegroundColor Yellow
    code --disable-extension $ext 2>$null
}

Write-Host "`n✅ Done! Restart VS Code to apply changes." -ForegroundColor Green
Write-Host "To re-enable any extension: code --enable-extension <name>"
