# GEMINI.md - Vibe Shop

## Project Type
E-commerce platform with modern React frontend

## Location
`C:\dev\apps\vibe-shop\`

## Tech Stack
- **Framework**: Next.js 14 / Vite + React
- **Language**: TypeScript
- **State**: Zustand
- **Styling**: Tailwind + shadcn/ui
- **Testing**: Vitest

## Key Commands
```bash
pnpm dev              # Start dev server
pnpm build            # Production build
pnpm test             # Run tests
pnpm test:coverage    # Coverage report
pnpm lint             # Lint code
```

## Architecture
```
src/
├── components/       # React components
│   ├── ui/           # Base UI (shadcn)
│   ├── product/      # Product components
│   ├── cart/         # Cart components
│   └── checkout/     # Checkout flow
├── hooks/            # Custom hooks
├── stores/           # Zustand stores
├── services/         # API clients
├── types/            # TypeScript types
└── utils/            # Helpers
```

## Critical Patterns

### Zustand Store
```typescript
import { create } from 'zustand';

interface CartStore {
  items: CartItem[];
  addItem: (item: Product) => void;
  removeItem: (id: string) => void;
  total: () => number;
}

export const useCart = create<CartStore>((set, get) => ({
  items: [],
  addItem: (item) => set((state) => ({
    items: [...state.items, { ...item, quantity: 1 }]
  })),
  removeItem: (id) => set((state) => ({
    items: state.items.filter(i => i.id !== id)
  })),
  total: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0)
}));
```

### Product Card Component
```typescript
export function ProductCard({ product }: { product: Product }) {
  const addItem = useCart(state => state.addItem);

  return (
    <Card>
      <CardImage src={product.image} alt={product.name} />
      <CardContent>
        <h3>{product.name}</h3>
        <p>${product.price}</p>
        <Button onClick={() => addItem(product)}>Add to Cart</Button>
      </CardContent>
    </Card>
  );
}
```

## Quality Checklist
- [ ] TypeScript compiles
- [ ] Tests pass (91%+ coverage)
- [ ] Responsive design
- [ ] Accessibility (a11y)
- [ ] Performance optimized

## Related Skills
- React patterns
- TypeScript expert
- Testing patterns
- Performance profiling
