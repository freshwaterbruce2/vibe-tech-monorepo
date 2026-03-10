# Workspace Dependency Graph

> **Last Updated**: 2026-02-13
>
> Maps which apps consume which `@vibetech/*` and `@dev/*` workspace packages.

## Package → Consumers

| Package                       | Consumers                                                |
| ----------------------------- | -------------------------------------------------------- |
| `@vibetech/shared-ipc`        | `vibe-code-studio`, `ipc-bridge`, `nova-agent`           |
| `@vibetech/ui`                | `business-booking-platform`, `shipping-pwa`, `vibe-shop` |
| `@vibetech/shared-utils`      | Multiple apps                                            |
| `@vibetech/shared-config`     | Multiple apps                                            |
| `@vibetech/testing-utils`     | Multiple apps (devDependency)                            |
| `@vibetech/nova-core`         | `nova-agent`, `nova-mobile-app`                          |
| `@vibetech/nova-types`        | `nova-agent`, `nova-mobile-app`                          |
| `@vibetech/nova-database`     | `nova-agent`                                             |
| `@vibetech/logger`            | Multiple apps                                            |
| `@vibetech/vibetech-hooks`    | React apps                                               |
| `@vibetech/vibetech-shared`   | Multiple apps                                            |
| `@vibetech/vibetech-types`    | Multiple apps                                            |
| `@dev/feature-flags-sdk-node` | `vibe-code-studio`, `nova-agent`, `crypto-enhanced`      |

## Impact Radius Guide

When modifying a workspace package, these are the apps that may be affected:

### High Impact (3+ consumers)

- `@vibetech/shared-utils` — Used across most apps
- `@vibetech/ui` — Shared UI components
- `@vibetech/testing-utils` — Test infrastructure

### Medium Impact (2 consumers)

- `@vibetech/shared-ipc` — IPC Bridge + Code Studio + Nova
- `@vibetech/nova-core` — Nova Agent + Mobile
- `@vibetech/nova-types` — Nova Agent + Mobile

### Low Impact (1 consumer)

- `@vibetech/nova-database` — Nova Agent only

## Dependency Chains

```
nova-agent
  └─ @vibetech/nova-core
  └─ @vibetech/nova-types
  └─ @vibetech/nova-database
  └─ @vibetech/shared-ipc
  └─ @dev/feature-flags-sdk-node

vibe-code-studio
  └─ @vibetech/shared-ipc
  └─ @dev/feature-flags-sdk-node

ipc-bridge (backend)
  └─ @vibetech/shared-ipc
```
