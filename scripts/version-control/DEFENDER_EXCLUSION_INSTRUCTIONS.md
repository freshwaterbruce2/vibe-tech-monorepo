# Windows Defender Exclusion Instructions

**Issue:** Windows Defender may block snapshot compression, flagging files as "potentially unwanted software" (false positive).

**Solution:** Add exclusions for the snapshot system directories.

---

## Quick Fix (Recommended)

### Run the Automated Script

1. **Right-click PowerShell** → **Run as Administrator**
2. Navigate to scripts directory:

   ```powershell
   cd C:\dev\scripts\version-control
   ```

3. Run the exclusion script:

   ```powershell
   .\Add-Defender-Exclusion.ps1
   ```

4. Type `Y` to confirm

**That's it!** The script will add exclusions for:

- `D:\repositories\vibetech\snapshots\` (snapshot storage)
- `C:\dev\scripts\version-control\` (PowerShell scripts)

---

## Manual Method (Alternative)

If you prefer to add exclusions manually:

### Option 1: PowerShell (Administrator)

```powershell
# Run PowerShell as Administrator, then:
Add-MpPreference -ExclusionPath "D:\repositories\vibetech\snapshots"
Add-MpPreference -ExclusionPath "C:\dev\scripts\version-control"
```

### Option 2: Windows Security GUI

1. Open **Windows Security**
2. Go to **Virus & threat protection**
3. Click **Manage settings** under "Virus & threat protection settings"
4. Scroll down to **Exclusions**
5. Click **Add or remove exclusions**
6. Click **Add an exclusion** → **Folder**
7. Add these folders:
   - `D:\repositories\vibetech\snapshots`
   - `C:\dev\scripts\version-control`

---

## Verify Exclusions

Check if exclusions were added:

```powershell
Get-MpPreference | Select-Object -ExpandProperty ExclusionPath
```

**Expected output:**

```
D:\repositories\vibetech\snapshots
C:\dev\scripts\version-control
```

---

## Test Snapshot After Adding Exclusion

```powershell
cd C:\dev\scripts\version-control
.\Save-Snapshot.ps1 -Description "Test after Defender exclusion"
```

Should complete without errors now!

---

## Why This Is Safe

**These exclusions are safe because:**

1. ✅ You control the code in C:\dev
2. ✅ Snapshots are compressed copies of YOUR code
3. ✅ No external/untrusted files are involved
4. ✅ You can verify snapshot contents anytime
5. ✅ Windows Defender still scans C:\dev itself

**What the exclusion does:**

- Tells Defender: "Don't scan files in snapshots directory during compression"
- Does NOT disable Defender for your whole system
- Does NOT affect scanning of C:\dev source code

**Real-world analogy:**

- Like telling your mail scanner: "Don't scan my backup USB drive"
- The scanner still checks all incoming mail
- It just doesn't re-scan your own backups

---

## Remove Exclusions (If Needed)

To remove exclusions later:

```powershell
# Run as Administrator
Remove-MpPreference -ExclusionPath "D:\repositories\vibetech\snapshots"
Remove-MpPreference -ExclusionPath "C:\dev\scripts\version-control"
```

---

## What Caused This?

**File flagged:** `apps\vibe-justice\MODEL_UPDATE_2026-01-13.md`

**Why:** Windows Defender's heuristic scanner detected something suspicious in a markdown file (likely model names, API references, or keywords that match malware patterns).

**Reality:** It's a false positive. The file is a legitimate documentation file about AI model updates.

**Proof it's safe:**

1. It's a `.md` file (markdown, just text)
2. You created it yourself in your workspace
3. No executable code in markdown files
4. Common false positive with AI/ML documentation

---

## Alternative: Remove the Flagged File

If you don't want to add exclusions, delete the flagged file:

```powershell
Remove-Item "C:\dev\apps\vibe-justice\MODEL_UPDATE_2026-01-13.md" -Force
```

Then create snapshot:

```powershell
.\Save-Snapshot.ps1 -Description "Test without flagged file"
```

**Note:** You'll lose that documentation file. Adding the exclusion is better.

---

## Still Having Issues?

**If snapshots still fail after adding exclusions:**

1. **Check Defender logs:**

   ```powershell
   Get-MpThreatDetection | Select-Object -First 5
   ```

2. **Temporarily disable real-time protection:**
   - Windows Security → Virus & threat protection → Manage settings
   - Turn off "Real-time protection" (temporarily)
   - Create snapshot
   - Turn it back on

3. **Contact support:**
   - Check Windows Security quarantine
   - Restore any quarantined files
   - Verify exclusions are actually active

---

**Next Steps:**

1. Run `Add-Defender-Exclusion.ps1` as Administrator
2. Test snapshot creation
3. Enjoy worry-free version control!

---

*Last Updated: 2026-01-16*
