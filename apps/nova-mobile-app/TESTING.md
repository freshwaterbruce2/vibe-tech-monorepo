# Nova Mobile App Testing Guide

## Prerequisites

- Nova Desktop running: `cd apps/nova-agent && pnpm start`
- Android: `adb reverse tcp:3000 tcp:3000` (for physical device)

## Unit Tests

```bash
pnpm test
```

## Integration Tests (requires desktop server)

```bash
# Terminal 1: Start desktop server
cd ../nova-agent && pnpm start

# Terminal 2: Run integration tests
pnpm test:integration
```

## Manual Testing Checklist

### Connection Test

1. [ ] Start Nova Desktop (`apps/nova-agent`)
2. [ ] Start Nova Mobile (`apps/nova-mobile-app`)
3. [ ] Verify green connection dot appears in header
4. [ ] If red dot, check console for errors

### Chat Test

1. [ ] Type "Hello" and send
2. [ ] Verify response appears from assistant
3. [ ] Check response is from actual Nova agent (not error message)

### Error Handling Test

1. [ ] Stop Nova Desktop while mobile is running
2. [ ] Send a message
3. [ ] Verify graceful error message appears
4. [ ] Restart desktop, verify reconnection

### Platform-Specific Tests

#### Android Emulator

- Uses `10.0.2.2:3000` automatically
- No additional setup needed

#### Android Physical Device

```bash
adb reverse tcp:3000 tcp:3000
```

#### iOS Simulator

- Uses `localhost:3000` automatically
- No additional setup needed

#### iOS Physical Device

- Update `OVERRIDE_API_URL` in `src/config.ts` to computer's IP
- Example: `const OVERRIDE_API_URL = "http://192.168.1.100:3000"`

## Troubleshooting

### "Connection failed" error

1. Check Nova Desktop is running
2. Check correct port (3000)
3. Android physical: run `adb reverse tcp:3000 tcp:3000`

### "Network request failed" on Android

- Ensure `android:usesCleartextTraffic="true"` in AndroidManifest.xml
- Or use HTTPS in production

### TypeScript errors

```bash
pnpm exec tsc --noEmit
```
