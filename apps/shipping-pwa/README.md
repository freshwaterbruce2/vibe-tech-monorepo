# Walmart DC 8980 Shipping Department PWA

## Overview & Purpose

This Progressive Web Application (PWA) helps Walmart Distribution Center 8980's shipping department efficiently manage daily door schedules and pallet tracking. It is designed as a single-user tool for the shipping manager to streamline operations.

## Tech Stack

- **Framework**: React + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: React Context API
- **Data Persistence**: IndexedDB (for settings) & LocalStorage (for door/pallet data)
- **Testing**: Jest with React Testing Library

## Features

- **Door Schedule Management**: Enter and maintain daily door schedules including:
  - Door numbers (valid range: 332-454)
  - Destination DC (options: 6024, 6070, 6039, 6040, 7045)
  - Freight type (options: 23/43, 28, XD)
  - Trailer status (options: partial, empty, shipload)
- **Pallet Counter**: Manual "+/-" controls and swipe gestures for pallet counting per truck.
- **Voice Commands**: Use voice input to add doors and manage pallet counts. Includes customizable confidence levels and noise suppression.
- **Data Export**: One-click export of the complete setup data to CSV format or a ZIP archive containing multiple CSV files.
- **Installable PWA**: Works offline after the first load and can be installed on mobile devices and desktops for a native-like experience.
- **Settings Panel**: Configure voice recognition, interaction modes, and other preferences.
- **Responsive Design**: Adapts to various screen sizes (mobile, tablet, desktop).

## Getting Started

### Windows Development Environment

1.  **Prerequisites**:
    - Node.js (v18+ recommended) and npm
    - A modern web browser (Chrome/Edge recommended for best Web Speech API support)

2.  **Setup Project**:

    ```powershell
    # Navigate to project directory
    cd C:\dev\projects\web-apps\shipping-pwa

    # Install dependencies
    npm install
    ```

3.  **Development Commands**:

    ```powershell
    # Start development server (port 5173)
    npm run dev

    # Run tests with coverage
    npm test

    # Run linting
    npm run lint

    # Build for production
    npm run build

    # Preview production build
    npm run preview
    ```

### Cross-Platform Deployment

````bash
# For server deployment
npm run build    # Creates dist/ directory for deployment
npm run preview  # Test production build locally
    ```
5.  **Open the application**:
    Navigate to `http://localhost:5173` (or the port specified in the output) in your browser.

## Build & Deploy

1.  **Build for production**:
    ```bash
    npm run build
    # or if using bun
    # bun run build
    ```
    This command bundles the application and outputs the static files to the `dist/` directory.
2.  **Preview the production build locally**:
    ```bash
    npm run preview
    # or if using bun
    # bun run preview
    ```
3.  **Deploy**:
    *   Deploy the contents of the `dist/` folder to any static web hosting service (e.g., Netlify, Vercel, GitHub Pages, internal server).
    *   Ensure your hosting provider is configured for Single Page Applications (SPAs) by rewriting all navigation requests to `index.html`.
    *   Serve the application over HTTPS to enable PWA features like installation and service workers.

## Testing

1.  **Run unit tests**:
    ```bash
    npm test
    # or
    # npm run test:watch # To run in watch mode
    # or if using bun
    # bun test
    ```
    This executes the test suite using Jest.
2.  **Check test coverage**:
    ```bash
    npm run test:coverage
    # or if using bun
    # bun run test:coverage
    ```
    This generates a coverage report in the `coverage/` directory, showing which parts of the code are covered by tests. Open `coverage/lcov-report/index.html` in your browser to view the detailed report.

## Project Structure Overview

````

door-ship-flow-pwa/
├── public/ # Static assets (icons, manifest.json)
├── src/
│ ├── components/ # Reusable UI components (atoms, molecules, organisms)
│ │ ├── ui/ # General UI elements (often from shadcn/ui)
│ │ └── ... # Feature-specific components (pallets, shipping, voice, etc.)
│ ├── contexts/ # React Context providers (e.g., ShippingContext)
│ ├── hooks/ # Custom React Hooks (e.g., useVoiceCommand, useIndexedDB)
│ ├── lib/ # Core libraries or configurations (e.g., IndexedDB setup)
│ ├── pages/ # Top-level page components/views
│ ├── services/ # Business logic, data fetching/manipulation (currently minimal)
│ ├── styles/ # Global styles, Tailwind setup
│ ├── types/ # TypeScript type definitions and interfaces
│ └── utils/ # Utility functions (formatting, validation, etc.)
├── .env.example # Example environment variables
├── tailwind.config.ts # Tailwind CSS configuration
├── tsconfig.json # TypeScript configuration
├── vite.config.ts # Vite configuration (including PWA plugin)
├── package.json # Project metadata, dependencies, and scripts
└── README.md # This file

```
*(Refer to DEVELOPER_GUIDE.md for more details on conventions and architecture.)*

## Contributing

*(Refer to CONTRIBUTING.md if applicable, or add contribution guidelines here.)*

## License

Copyright © 2025 Walmart Inc. All rights reserved. *(Specify the actual license if different, e.g., MIT, Apache 2.0)*

---
# shipping-pwa
```
