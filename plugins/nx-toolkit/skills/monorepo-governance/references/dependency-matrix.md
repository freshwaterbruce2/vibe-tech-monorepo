# Dependency Allowance Matrix

## Tag-Based Dependency Rules

### Scope Dependencies

| Source \ Target | scope:app | scope:feature | scope:shared | scope:infra |
|-----------------|:---------:|:-------------:|:------------:|:-----------:|
| **scope:app**     | -       | allowed       | allowed      | allowed     |
| **scope:feature** | blocked | -             | allowed      | blocked     |
| **scope:shared**  | blocked | blocked       | allowed      | blocked     |
| **scope:infra**   | blocked | blocked       | allowed      | -           |

### Type Dependencies

| Source \ Target | type:ui | type:data | type:util | type:config |
|-----------------|:-------:|:---------:|:---------:|:-----------:|
| **type:ui**     | allowed | blocked   | allowed   | allowed     |
| **type:data**   | blocked | allowed   | allowed   | allowed     |
| **type:util**   | blocked | blocked   | allowed   | allowed     |
| **type:config** | blocked | blocked   | blocked   | allowed     |

### Platform Dependencies

| Source \ Target | platform:web | platform:desktop | platform:mobile | platform:node |
|-----------------|:------------:|:----------------:|:---------------:|:-------------:|
| **platform:web**     | allowed | blocked  | blocked | blocked |
| **platform:desktop** | allowed | allowed  | blocked | blocked |
| **platform:mobile**  | allowed | blocked  | allowed | blocked |
| **platform:node**    | blocked | blocked  | blocked | allowed |

Note: `platform:web` is the universal base - desktop and mobile may depend on web libraries (shared UI components).

## Complete Tag Taxonomy

### Scope Tags

```
scope:app       - Deployable applications (apps/ directory)
                  Examples: nova-agent, vibe-code-studio, crypto-enhanced

scope:feature   - Domain-specific feature libraries
                  Examples: feature-auth, feature-trading, feature-analytics

scope:shared    - Cross-cutting shared code (packages/ directory)
                  Examples: shared-utils, shared-config, ui-components

scope:infra     - Infrastructure, tooling, build support
                  Examples: testing-utils, build-scripts, mcp-servers
```

### Type Tags

```
type:ui         - Visual/presentational components
                  Examples: ui-components, shared-components, design-system

type:data       - State management, API clients, data access
                  Examples: data-api, stores, query-clients

type:util       - Pure utility functions, no side effects
                  Examples: shared-utils, date-helpers, formatters

type:config     - Configuration, constants, environment settings
                  Examples: shared-config, feature-flags, env-config

type:feature    - Full feature modules (UI + data + logic)
                  Examples: feature-auth, feature-dashboard
```

### Platform Tags

```
platform:web      - Browser-based applications and libraries
platform:desktop  - Electron/Tauri desktop applications
platform:mobile   - Capacitor/React Native mobile apps
platform:node     - Server-side Node.js/Python services
platform:universal - Platform-agnostic (pure logic, no platform APIs)
```

## VibeTech Project Tag Assignments

### Applications (scope:app)

| Project | Scope | Type | Platform |
|---------|-------|------|----------|
| nova-agent | scope:app | type:feature | platform:desktop |
| vibe-code-studio | scope:app | type:feature | platform:desktop |
| crypto-enhanced | scope:app | type:feature | platform:node |
| vibe-tutor | scope:app | type:feature | platform:mobile |
| digital-content-builder | scope:app | type:feature | platform:web |
| business-booking-platform | scope:app | type:feature | platform:web |
| shipping-pwa | scope:app | type:feature | platform:web |
| iconforge | scope:app | type:feature | platform:web |
| desktop-commander-v3 | scope:app | type:feature | platform:node |

### Shared Libraries (scope:shared)

| Project | Scope | Type | Platform |
|---------|-------|------|----------|
| shared-utils | scope:shared | type:util | platform:universal |
| shared-config | scope:shared | type:config | platform:universal |
| shared-components | scope:shared | type:ui | platform:web |
| ui-components | scope:shared | type:ui | platform:web |
| @nova/types | scope:shared | type:util | platform:universal |
| @nova/core | scope:shared | type:util | platform:universal |
| @nova/database | scope:shared | type:data | platform:node |
| testing-utils | scope:infra | type:util | platform:universal |
| feature-flags | scope:shared | type:config | platform:universal |

## Violation Examples

### Allowed

```typescript
// App importing shared library
// nova-agent (scope:app) → shared-utils (scope:shared)
import { formatDate } from '@vibetech/shared-utils';  // OK
```

### Blocked

```typescript
// Shared library importing app code
// shared-utils (scope:shared) → nova-agent (scope:app)
import { NovaConfig } from '@nova-agent/config';  // VIOLATION

// UI component importing data layer
// ui-components (type:ui) → data-api (type:data)
import { useApiClient } from '@vibetech/data-api';  // VIOLATION

// Desktop importing mobile code
// nova-agent (platform:desktop) → vibe-tutor (platform:mobile)
import { MobileNav } from '@vibe-tutor/components';  // VIOLATION
```
