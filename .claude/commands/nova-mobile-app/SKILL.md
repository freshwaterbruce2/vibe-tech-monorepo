---
name: nova-mobile-app-skill
description: React Native mobile app development - Expo, navigation, native modules, app store deployment
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Nova Mobile App Skill

> **React Native Mobile Application** - Cross-platform iOS/Android

## Project Context

| Aspect | Details |
|--------|---------|
| **Location** | `C:\dev\apps\nova-mobile-app` |
| **Framework** | React Native + Expo |
| **Navigation** | React Navigation v6 |
| **State** | Zustand + React Query |
| **Styling** | NativeWind (Tailwind) |
| **Backend** | Nova Agent API |

## Tech Stack

- **Framework**: React Native 0.73+ with Expo
- **Language**: TypeScript strict mode
- **Navigation**: @react-navigation/native
- **Data Fetching**: TanStack Query (React Query)
- **Forms**: React Hook Form + Zod
- **Storage**: AsyncStorage, SecureStore

## Required Community Skills

| Skill | Use Case |
|-------|----------|
| `react-patterns` | Component design, hooks |
| `typescript-expert` | Type safety |
| `testing-patterns` | Unit/integration tests |
| `systematic-debugging` | Bug investigation |
| `mobile-design` | UI/UX patterns |

## Architecture

```
nova-mobile-app/
├── src/
│   ├── components/     # Reusable UI components
│   │   ├── ui/         # Base components
│   │   └── features/   # Feature-specific
│   ├── screens/        # Screen components
│   ├── navigation/     # Navigation config
│   ├── hooks/          # Custom hooks
│   ├── services/       # API clients
│   ├── stores/         # Zustand stores
│   └── utils/          # Helpers
├── app.json            # Expo config
└── babel.config.js
```

## Development Workflow

### Start Development

```bash
cd apps/nova-mobile-app
pnpm start           # Expo dev server
pnpm ios             # iOS simulator
pnpm android         # Android emulator
```

### Run Tests

```bash
pnpm test            # Jest tests
pnpm test:watch      # Watch mode
```

### Build for Release

```bash
pnpm build:ios       # iOS build
pnpm build:android   # Android APK/AAB
```

## Critical Patterns

### API Service Pattern

```typescript
// services/api.ts
import { useQuery, useMutation } from '@tanstack/react-query';

export const useUser = (userId: string) => {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: () => api.get(`/users/${userId}`),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateUserInput) => api.patch('/users/me', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });
};
```

### Screen Component Pattern

```typescript
// screens/HomeScreen.tsx
import { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export const HomeScreen = ({ navigation }: Props) => {
  const { data, isLoading, error } = useUser();

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorView error={error} />;

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Content */}
    </SafeAreaView>
  );
};
```

### Navigation Type Safety

```typescript
// navigation/types.ts
export type RootStackParamList = {
  Home: undefined;
  Profile: { userId: string };
  Settings: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
```

## Quality Checklist

Before completing ANY task:

- [ ] TypeScript compiles: `pnpm typecheck`
- [ ] Lint passes: `pnpm lint`
- [ ] Tests pass: `pnpm test`
- [ ] Works on iOS simulator
- [ ] Works on Android emulator
- [ ] No console warnings
- [ ] Accessibility labels added
- [ ] Loading/error states handled

## Common Issues

### Metro Bundler

```bash
# Clear cache if weird errors
pnpm start --clear
```

### Native Module Issues

```bash
# Rebuild native modules
cd ios && pod install && cd ..
pnpm android --clean
```

### Performance

- Use FlatList for long lists (not ScrollView)
- Memoize expensive components
- Avoid inline styles in loops
- Use useCallback for event handlers

## Related Commands

- `/mobile:sync-capacitor` - Sync native assets
- `/mobile:build-android` - Build Android APK
