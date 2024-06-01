!macro customHeader
!macroend

!macro customInstall
  SetOutPath "$LOCALAPPDATA\okayucdn-desktop"
  SetShellVarContext current

  WriteRegStr SHELL_CONTEXT "Software\Classes\*\shell\Upload to OkayuCDN" "" "Upload to OkayuCDN"
  WriteRegStr SHELL_CONTEXT "Software\Classes\*\shell\Upload to OkayuCDN\command" "" '"$LOCALAPPDATA\Programs\okayucdn-desktop\okayucdn-desktop.exe" null "%1"'
!macroend

Section "MainSection" SEC01
  !insertmacro customInstall
SectionEnd