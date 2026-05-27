# User Guide: Walmart DC 8980 Shipping PWA

Welcome to the Walmart DC 8980 Shipping PWA! This guide explains how to use the application to manage door assignments and track pallets.

## Table of Contents

- [Getting Started: Installation](#getting-started-installation)
- [Using the Application](#using-the-application)
  - [Main Interface Overview](#main-interface-overview)
  - [Adding a New Door](#adding-a-new-door)
  - [Updating Door Information](#updating-door-information)
  - [Adding/Removing Pallets](#addingremoving-pallets)
  - [Filtering and Sorting Doors](#filtering-and-sorting-doors)
  - [Using Voice Commands](#using-voice-commands)
  - [Exporting Data](#exporting-data)
  - [Settings](#settings)
- [Troubleshooting](#troubleshooting)

## Getting Started: Installation

This application is a Progressive Web App (PWA), meaning you can install it directly from your browser for a more native-like experience and offline access.

1.  **Access the App**: Open the application URL provided to you in a modern web browser (like Chrome, Edge, or Safari) on your computer or mobile device.
2.  **Install Prompt**: You should see an "Install" button or prompt appear, usually in the address bar or a browser menu.
    -   **Desktop**: Look for an icon like a computer screen with a down arrow in the address bar.
    -   **Mobile (iOS)**: Tap the "Share" button, then scroll down and select "Add to Home Screen".
    -   **Mobile (Android)**: Look for a prompt at the bottom of the screen or in the browser menu saying "Add to Home screen".
    -   `[Screenshot: Browser install prompt]`
3.  **Confirm Installation**: Follow the prompts to confirm the installation.
4.  **Launch**: The app will now appear as an icon on your home screen or desktop, just like a native app. Launch it from there for future use.

*(Note: Installation requires serving the app over HTTPS or using localhost.)*

## Using the Application

### Main Interface Overview

The main screen displays a table or list of assigned shipping doors. Key elements include:

- **Door List**: Shows each assigned door with its details (Number, Destination, Freight Type, Status).
- **Pallet Counts**: Displays the current pallet count for each door.
- **Action Buttons**: Buttons for adding new doors, exporting data, and accessing settings.
- **Filter/Sort Controls**: Options to filter the list (e.g., by Destination) or sort it.
- `[Screenshot: Main application interface with door list]`

### Adding a New Door

1.  Click the "Add Door" button (often a '+' icon).
2.  A form or dialog will appear.
3.  Enter the Door Number (must be between 332-454).
4.  Select the Destination DC (e.g., 6024, 6070).
5.  Select the Freight Type (e.g., 23/43, 28, XD).
6.  Select the initial Trailer Status (e.g., Empty, Partial).
7.  Click "Save" or "Confirm". The new door will appear in the list.

- `[Screenshot: Add door dialog/form]`

### Updating Door Information

1.  Click on the specific field you want to change within a door's row (e.g., click on the current Destination DC).
2.  A picker or input field will appear.
3.  Select the new value (e.g., choose a different Destination DC).
4.  The change is typically saved automatically.

### Adding/Removing Pallets

- **Increment**: Click the '+' button next to the pallet count for a specific door.
- **Decrement**: Click the '-' button next to the pallet count.
- **Swipe (Mobile)**: Depending on settings, you might be able to swipe right on a door row to increment the count and swipe left to decrement.
- **Direct Input (Optional)**: Some views might allow clicking the number to type in a specific count directly or use a quick-input keypad.
- `[Screenshot: Pallet count controls (+/- buttons or swipe action)]`

### Filtering and Sorting Doors

- Look for dropdown menus or buttons typically located above the door list.
- **Filtering**: Select a Destination DC or Freight Type to show only matching doors.
- **Sorting**: Click on column headers (like "Door Number") to sort the list ascending or descending.
- `[Screenshot: Filter/Sort controls above the door list]`

### Using Voice Commands

1.  Ensure your microphone is enabled and permissions are granted.
2.  Click the microphone icon (if available) or the feature might be always listening (check settings).
3.  Speak clearly. Common commands include:
    -   "Add door [Number] destination [DC] freight [Type] status [Status]" (e.g., "Add door 350 destination 6024 freight 28 status empty")
    -   "Add pallet to door [Number]" or "Increment door [Number]"
    -   "Remove pallet from door [Number]" or "Decrement door [Number]"
    -   "Set door [Number] count to [Count]"
4.  The app should provide visual feedback (e.g., "Listening...", "Command recognized").
5.  Refer to the Settings panel for more specific command structures if needed.

### Exporting Data

1.  Click the "Export" button.
2.  You may be prompted to choose a format (CSV or ZIP).
    -   **CSV**: Exports all current door and pallet data into a single Comma Separated Values file, suitable for spreadsheets.
    -   **ZIP**: Exports data into multiple CSV files (e.g., one for doors, one for pallets) packaged within a single ZIP archive.
3.  Confirm the export. The file will be downloaded to your device's default download location.

- `[Screenshot: Export button and format selection dialog]`

### Settings

- Access the Settings panel (often via a gear icon).
- **Voice Confidence**: Adjust how accurately the app needs to understand your voice commands (lower value means less strict).
- **Interaction Mode**: Choose between tap controls (+/- buttons) or swipe gestures for pallet counting on mobile.
- **Other Preferences**: Configure any other available options like themes or auto-export settings.
- `[Screenshot: Settings panel with options]`

## Troubleshooting

- **Voice Recognition Not Working**:
  - **Check Browser Support**: Ensure you're using a browser that supports the Web Speech API (Chrome, Edge are best).
  - **Grant Permissions**: Make sure you have allowed the site to access your microphone.
  - **Check Microphone**: Ensure your microphone is connected, enabled, and not muted at the system level.
  - **Speak Clearly**: Reduce background noise and speak directly towards the microphone.
  - **Adjust Confidence**: Try lowering the "Voice Confidence" setting in the app.
- **App Not Installing (PWA)**:
  - **Use HTTPS**: PWAs usually require a secure connection (HTTPS) or localhost.
  - **Browser Support**: Ensure your browser supports PWA installation.
  - **Clear Cache**: Sometimes clearing browser cache and site data can help. Try accessing the app again.
- **Data Not Saving**: 
  - **Storage Full**: Check if your browser's storage limit has been reached (unlikely with this app's data size, but possible).
  - **Private Browsing**: Data might not persist correctly in private/incognito modes.
- **Export Fails**: 
  - **Permissions**: Ensure your browser hasn't blocked downloads from the site.
  - **Pop-up Blockers**: Temporarily disable pop-up blockers if they interfere.

If you encounter persistent issues, please contact the development team or your supervisor. 
