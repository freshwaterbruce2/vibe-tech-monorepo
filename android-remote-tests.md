# Remote Execution Tests for Android Command Center

## Goal
Configure and run remote location retrieval tests from the Android client to the local desktop bridge, repairing any hanging PowerShell execution in the bridge daemon.

## Tasks
- [x] Task 1: Modify `desktop-bridge` to use `-NoProfile -NonInteractive` and end `stdin` on spawned PowerShell processes → Verify: Review `index.js` edits
- [x] Task 2: Restart `desktop-bridge` server with the updated configuration → Verify: Port 8743 responds to health checks
- [x] Task 3: Run the test script `test-android-node.ts` → Verify: Script connects, executes, and returns location payload without hanging
- [x] Task 4: Verify payload values match actual device metadata → Verify: Output shows correct SM_A546U1 device and coordinates

## Done When
- [x] Test script `test-android-node.ts` successfully completes in under 30 seconds and outputs `[android-node] SUCCESS location.get payload` with correct GPS coordinates.

## Notes
- PowerShell hangs are avoided by passing `-NoProfile -NonInteractive` and calling `child.stdin.end()` on the spawned process.
