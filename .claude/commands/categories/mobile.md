---
name: mobile-skill
description: Mobile application development - React Native, Expo, Capacitor, native modules
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
category: app-type
---

# Mobile Application Development Skill

> **For ALL mobile apps** in the monorepo: React Native, Expo, Capacitor

## Applies To

| Project | Framework |
|---------|-----------|
| `apps/nova-mobile-app` | React Native + Expo |
| `apps/vibe-tutor` | Capacitor (if mobile) |

## Tech Stack

- **Framework**: React Native 0.73+ / Expo SDK 50+
- **Language**: TypeScript (strict mode)
- **Navigation**: React Navigation v6
- **State**: Zustand + React Query
- **Styling**: NativeWind (Tailwind for RN)
- **Forms**: React Hook Form + Zod
- **Storage**: AsyncStorage, SecureStore

## Standard Commands

```bash
# Expo
pnpm start         # Expo dev server
pnpm ios           # iOS simulator
pnpm android       # Android emulator
pnpm build:ios     # iOS production build
pnpm build:android # Android production build

# Capacitor
pnpm build         # Build web assets
npx cap sync       # Sync to native
npx cap run ios    # Run on iOS
npx cap run android # Run on Android
```

## Architecture Pattern

```
apps/{mobile-app}/
├── src/
│   ├── components/
│   │   ├── ui/             # Base components
│   │   └── features/       # Feature components
│   ├── screens/            # Screen components
│   ├── navigation/         # Navigation config
│   │   ├── index.tsx
│   │   └── types.ts        # Navigation types
│   ├── hooks/              # Custom hooks
│   ├── services/           # API clients
│   ├── stores/             # Zustand stores
│   └── utils/              # Helpers
├── app.json                # Expo config
├── babel.config.js
└── metro.config.js
```

## Critical Patterns

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

### Screen Component
```typescript
import { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

export function ProfileScreen({ route, navigation }: Props) {
  const { userId } = route.params;
  const { data, isLoading } = useUser(userId);

  if (isLoading) return <LoadingSpinner />;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Text>{data?.name}</Text>
    </SafeAreaView>
  );
}
```

### Data Fetching
```typescript
export function useUser(userId: string) {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: () => api.getUser(userId),
    staleTime: 5 * 60 * 1000,
  });
}
```

### Secure Storage
```typescript
import * as SecureStore from 'expo-secure-store';

export async function saveToken(token: string) {
  await SecureStore.setItemAsync('auth_token', token);
}

export async function getToken() {
  return SecureStore.getItemAsync('auth_token');
}
```

## Performance Rules

### Lists
```typescript
// ✅ Good - FlatList for long lists
<FlatList
  data={items}
  renderItem={({ item }) => <ItemCard item={item} />}
  keyExtractor={item => item.id}
/>

// ❌ Bad - ScrollView with map
<ScrollView>
  {items.map(item => <ItemCard key={item.id} item={item} />)}
</ScrollView>
```

### Memoization
```typescript
// Memoize expensive components
const MemoizedCard = React.memo(ItemCard);

// Stable callbacks
const handlePress = useCallback(() => {
  navigation.navigate('Details', { id });
}, [id, navigation]);
```

## Quality Checklist

- [ ] TypeScript compiles
- [ ] Lint passes
- [ ] Tests pass
- [ ] Works on iOS simulator
- [ ] Works on Android emulator
- [ ] No console warnings
- [ ] Accessibility labels added
- [ ] Loading/error states handled
- [ ] Offline behavior handled

## Common Issues

### Metro Bundler
```bash
pnpm start --clear  # Clear cache
```

### Native Modules
```bash
cd ios && pod install && cd ..
pnpm android --clean
```

## Community Skills to Use

- `react-patterns` - Component design
- `testing-patterns` - Unit/integration tests
- `mobile-design` - UI/UX patterns
- `typescript-expert` - Type safety
