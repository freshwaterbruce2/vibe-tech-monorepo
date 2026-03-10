; Vibe Code Studio NSIS Installer Script
; Custom installation configuration for Windows
; December 2025

!macro preInit
  ; Set default installation directory
  ${If} ${RunningX64}
    SetRegView 64
    StrCpy $INSTDIR "$PROGRAMFILES64\Vibe Code Studio"
  ${Else}
    SetRegView 32
    StrCpy $INSTDIR "$PROGRAMFILES\Vibe Code Studio"
  ${EndIf}
!macroend

!macro customInstall
  ; Note: PATH manipulation removed - EnvVarUpdate plugin not bundled with electron-builder
  ; Users can manually add to PATH if needed, or we can add the plugin later
  
  DetailPrint "Installing Vibe Code Studio..."

  ; Create protocol handler for vscode:// URIs (compatibility)
  WriteRegStr HKCR "vscode" "" "URL:VSCode Protocol"
  WriteRegStr HKCR "vscode" "URL Protocol" ""
  WriteRegStr HKCR "vscode\DefaultIcon" "" "$INSTDIR\Vibe Code Studio.exe,0"
  WriteRegStr HKCR "vscode\shell\open\command" "" '"$INSTDIR\Vibe Code Studio.exe" "%1"'

  ; Create protocol handler for vibestudio:// URIs
  WriteRegStr HKCR "vibestudio" "" "URL:Vibe Studio Protocol"
  WriteRegStr HKCR "vibestudio" "URL Protocol" ""
  WriteRegStr HKCR "vibestudio\DefaultIcon" "" "$INSTDIR\Vibe Code Studio.exe,0"
  WriteRegStr HKCR "vibestudio\shell\open\command" "" '"$INSTDIR\Vibe Code Studio.exe" "%1"'

  ; Add context menu entries
  WriteRegStr HKCR "Directory\shell\VibeCodeStudio" "" "Open with Vibe Code Studio"
  WriteRegStr HKCR "Directory\shell\VibeCodeStudio" "Icon" "$INSTDIR\Vibe Code Studio.exe"
  WriteRegStr HKCR "Directory\shell\VibeCodeStudio\command" "" '"$INSTDIR\Vibe Code Studio.exe" "%V"'

  WriteRegStr HKCR "Directory\Background\shell\VibeCodeStudio" "" "Open with Vibe Code Studio"
  WriteRegStr HKCR "Directory\Background\shell\VibeCodeStudio" "Icon" "$INSTDIR\Vibe Code Studio.exe"
  WriteRegStr HKCR "Directory\Background\shell\VibeCodeStudio\command" "" '"$INSTDIR\Vibe Code Studio.exe" "%V"'

  ; File associations context menu
  WriteRegStr HKCR "*\shell\VibeCodeStudio" "" "Open with Vibe Code Studio"
  WriteRegStr HKCR "*\shell\VibeCodeStudio" "Icon" "$INSTDIR\Vibe Code Studio.exe"
  WriteRegStr HKCR "*\shell\VibeCodeStudio\command" "" '"$INSTDIR\Vibe Code Studio.exe" "%1"'

  ; Create command-line launcher
  CreateDirectory "$INSTDIR\bin"
  FileOpen $0 "$INSTDIR\bin\vibestudio.cmd" w
  FileWrite $0 '@echo off$\r$\n'
  FileWrite $0 'setlocal$\r$\n'
  FileWrite $0 'set VIBE_STUDIO_PATH=%~dp0\..$\r$\n'
  FileWrite $0 '"%VIBE_STUDIO_PATH%\Vibe Code Studio.exe" %*$\r$\n'
  FileClose $0

  ; Note: VC++ Redistributable installation removed - Electron bundles required runtime
  ; Modern Windows 10/11 systems include the necessary VC++ runtime
  DetailPrint "Installation complete"
!macroend

!macro customUninstall
  ; Note: PATH manipulation removed - EnvVarUpdate plugin not bundled with electron-builder
  
  ; Remove protocol handlers
  DeleteRegKey HKCR "vscode"
  DeleteRegKey HKCR "vibestudio"

  ; Remove context menu entries
  DeleteRegKey HKCR "Directory\shell\VibeCodeStudio"
  DeleteRegKey HKCR "Directory\Background\shell\VibeCodeStudio"
  DeleteRegKey HKCR "*\shell\VibeCodeStudio"

  ; Remove performance settings
  DeleteRegKey HKCU "Software\Microsoft\Windows NT\CurrentVersion\Image File Execution Options\Vibe Code Studio.exe"

  ; Remove application data (optional - based on user choice)
  MessageBox MB_YESNO "Do you want to remove all application data and settings?" IDNO SkipDataRemoval
    RMDir /r "$APPDATA\Vibe Code Studio"
    RMDir /r "$LOCALAPPDATA\Vibe Code Studio"
  SkipDataRemoval:
!macroend