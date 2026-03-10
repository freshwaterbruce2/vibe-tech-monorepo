---
name: protect-d-drive-data
enabled: true
event: bash
pattern: rm.*D:/|Remove-Item.*D:\\
action: block
---

🚨 **BLOCKED: Attempting to delete D:\ drive data!**

Your D:\ drive contains critical data:
- Databases (D:\databases\)
- Logs (D:\logs\)
- Learning system (D:\learning-system\)

**Use D:\ snapshot system instead for version control:**
```powershell
cd C:\dev\scripts\version-control
.\Save-Snapshot.ps1 -Description "Before changes"
```
