# Developer Guide: Walmart DC 8980 Shipping PWA

This guide provides information for developers working on or extending the Walmart DC 8980 Shipping PWA.

## Table of Contents

- [Project Structure](#project-structure)
- [Coding Conventions](#coding-conventions)
- [Context API (`ShippingContext`)](#context-api-shippingcontext)
- [Extending Voice Commands](#extending-voice-commands)

## Project Structure

The `src/` directory is organized as follows to promote modularity and separation of concerns:

```
src/
├── components/    # Reusable UI components (atoms, molecules, organisms)
│   ├── ui/        # General UI elements (often from shadcn/ui or primitives)
│   ├── export/    # Components related to data export
│   ├── pallets/   # Components for pallet counting/display
│   ├── pwa/       # PWA-specific components (install prompts, etc.)
│   ├── settings/  # Components for the settings panel
│   ├── shipping/  # Components for the main shipping table/door management
│   └── voice/     # Components related to voice input feedback
├── contexts/      # React Context providers (e.g., ShippingContext)
├── hooks/         # Custom React Hooks (e.g., useVoiceCommand, useIndexedDB, useLocalStorage)
├── lib/           # Core libraries, configurations, constants (e.g., IndexedDB setup, app constants)
├── pages/         # Top-level page components/views (currently just the main App layout)
├── services/      # Business logic, data transformations (e.g., CSV/ZIP generation)
├── styles/        # Global styles, Tailwind base configuration
├── types/         # TypeScript type definitions and interfaces (e.g., ShippingDoor, Pallet)
└── utils/         # General utility functions (formatting, validation, array manipulation)
```

- **`components/`**: Contains all React components, organized by feature or general UI purpose.
- **`contexts/`**: Holds application-wide state management logic using React Context.
- **`hooks/`**: Custom hooks encapsulate reusable logic (e.g., interacting with browser APIs, managing local state patterns).
- **`lib/`**: Non-React specific code, constants, or setup functions.
- **`pages/`**: Defines the main views or layouts of the application.
- **`services/`**: Encapsulates specific business logic operations, especially those involving data processing or external interactions (though currently minimal).
- **`styles/`**: Global CSS and Tailwind configuration.
- **`types/`**: Central location for shared TypeScript interfaces and types.
- **`utils/`**: Small, reusable helper functions.

## Coding Conventions

- **Language**: TypeScript is used throughout the project. Use strict mode and leverage types for clarity and safety.
- **Styling**: Tailwind CSS is the primary styling method. 
  - Utilize utility classes directly.
  - Leverage `shadcn/ui` components for common UI patterns (Button, Input, Dialog, etc.). Customize them via props or by extending their underlying Radix UI primitives.
  - Define custom colors, fonts, or complex styles in `tailwind.config.ts` and `src/styles/globals.css`.
  - Follow Tailwind's naming conventions for utilities.
- **Component Structure**: 
  - Prefer functional components with Hooks.
  - Keep components focused on a single responsibility.
  - Use descriptive names for components, props, and variables (PascalCase for components, camelCase for variables/functions).
  - Colocate component-specific types within the component file or in a nearby `types.ts` if complex.
- **Naming**: 
  - Components: `PascalCase.tsx` (e.g., `DoorRow.tsx`)
  - Hooks: `useCamelCase.ts` (e.g., `useLocalStorage.ts`)
  - Utilities/Services: `camelCase.ts` or `kebab-case.ts` (e.g., `csvExporter.ts`)
  - Types/Interfaces: `PascalCase.ts` (e.g., `ShippingData.ts`)
- **Adding New Components**:
  - If it's a general UI element, place it in `src/components/ui/`.
  - If it's specific to a feature (e.g., Pallets), place it in the corresponding feature directory (e.g., `src/components/pallets/`).
  - If using `shadcn/ui`'s CLI, ensure components are installed into the `src/components/ui/` directory.
- **Linting & Formatting**: ESLint and Prettier are configured. Run `npm run lint` and `npm run format` before committing.

## Context API (`ShippingContext`)

The primary application state is managed via `ShippingContext` located in `src/contexts/ShippingContext.tsx`.

- **Purpose**: Provides application-wide access to the shipping door data, pallet counts, and functions to modify them.
- **Shape (Simplified)**: The context likely provides an object with:

    ```typescript
    interface ShippingContextType {
      doors: ShippingDoor[];
      pallets: Pallet[];
      addDoor: (doorData: Omit<ShippingDoor, 'id'>) => void;
      updateDoor: (id: string, updates: Partial<ShippingDoor>) => void;
      removeDoor: (id: string) => void;
      addPallet: (palletData: Omit<Pallet, 'id'>) => void;
      updatePalletCount: (id: string, newCount: number) => void;
      removePallet: (id: string) => void;
      // ... potentially other state like filters, settings, etc.
    }
    ```

    *(Refer to `src/types/` and `src/contexts/ShippingContext.tsx` for the exact structure.)*
- **Consumption**: To use the context in a component:

    ```typescript
    import React, { useContext } from 'react';
    import { ShippingContext } from '@/contexts/ShippingContext';

    const MyComponent = () => {
      const { doors, addDoor } = useContext(ShippingContext);

      // Use doors state and addDoor function
      // ...
    };
    ```

- **Provider**: Ensure the component needing access is wrapped by `ShippingProvider` (likely done in `App.tsx` or a main layout component).

## Extending Voice Commands

Voice command logic is primarily managed within the `useVoiceCommand` hook (`src/hooks/useVoiceCommand.ts`).

1.  **Grammar Definition**: Commands are typically defined using a grammar format (like JSGF - JSpeech Grammar Format) if the hook supports it, or simple string matching.
    - If using JSGF, the grammar rules define the structure of recognizable phrases.
    - Look for a grammar definition file or string within the hook or its dependencies.
2.  **Registering Intents/Callbacks**: The hook likely maps recognized phrases (intents) to callback functions.
    - Find the section within `useVoiceCommand.ts` where commands/intents are registered or handled (e.g., in a `useEffect` hook listening to speech recognition results, or a configuration object passed to the hook).
3.  **Adding a New Command**:
    - **Define the phrase**: Determine the voice command phrase (e.g., "Filter by destination 6024").
    - **Update Grammar (if applicable)**: If using JSGF or similar, add a rule for the new phrase.
    - **Add Handler**: Add a new condition or mapping within the hook to check for the recognized phrase.
    - **Implement Action**: Call the appropriate context function or component logic when the new command is recognized. For example:

        ```typescript
        // Inside useVoiceCommand.ts or its handler logic
        if (transcript.includes('filter by destination 6024')) {
          // Call a function to update filters in ShippingContext
          applyFilter({ destination: '6024' }); 
        }
        ```

4.  **Testing**: Test thoroughly in different environments and with various accents if possible. Adjust the confidence threshold in settings if needed.

Refer directly to the `src/hooks/useVoiceCommand.ts` file for the specific implementation details. 
