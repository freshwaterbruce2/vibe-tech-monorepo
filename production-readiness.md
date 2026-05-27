# Vibe-Tech Monorepo Production Readiness Plan

## Goal
Verify and transition the workspace applications from development status to production-ready status with automated testing, branding alignment (Vibe-Tech / vibe-tech.org), and production build confirmation.

## Tasks
- [x] Task 1: Update client-portal branding (companyName, product names, owner references) to Vibe-Tech → Verify: Grep search returns no unbranded 'Client Portal Owner' occurrences.
- [x] Task 2: Build and compile client-portal client assets and fastify backend server → Verify: `pnpm nx run client-portal:ship:check` passes 100% of all API health and checkout tests.
- [x] Task 3: Lock client-portal workspace metadata to production → Verify: Display name is 'Vibe-Tech' and status is 'production' in WORKSPACE.json.
- [x] Task 4: Audit dental-scheduler branding for Vibe-Tech alignment → Verify: Verify companyName is 'Vibe-Tech' and website matches vibe-tech.org.
- [x] Task 5: Build and compile dental-scheduler backend and frontend assets → Verify: `pnpm nx run dental-scheduler:ship:check` passes 100% of all API health and checkout tests.
- [ ] Task 6: Audit and align OpenClaw gateway status and phone pairing → Verify: Run `openclaw gateway probe --timeout 15000` to confirm green health status.

## Done When
- [ ] All primary workspace applications (client-portal, dental-scheduler) pass full shipping verification checks.
- [ ] Brand colors, business name ('Vibe-Tech'), and website ('vibe-tech.org') are hardcoded across configurations.
- [ ] OpenClaw gateway is fully paired and healthy.

## Notes
- Web search confirms Vibe-Tech (vibe-tech.org) is our primary digital agency and software brand.
- Production environment configurations and Stripe connected checks are loaded via dotenv profiles on startup.
