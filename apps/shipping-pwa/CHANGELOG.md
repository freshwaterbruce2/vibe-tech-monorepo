# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - YYYY-MM-DD

### Added

- Initial release of the Walmart DC 8980 Shipping PWA.
- Core feature: Door Schedule Management (Doors 332-454, Destination DC, Freight Type, Trailer Status).
- Core feature: Pallet Counter with manual +/- controls and swipe gestures.
- Core feature: Voice Commands for adding doors and managing pallet counts.
- Core feature: Data Export to CSV and ZIP formats.
- Core feature: Progressive Web App (PWA) capabilities for offline use and installation.
- Settings panel for configuring voice confidence, interaction modes, etc.
- Responsive design for mobile, tablet, and desktop use.
- IndexedDB storage for settings persistence.
- LocalStorage for primary door and pallet data persistence.
- Basic filtering and sorting for the door list.
- Unit tests using Jest and React Testing Library.

### Changed

- Optimized performance for Lighthouse scores ≥ 90.
- Refined UI with consistent styling based on shadcn/ui and Tailwind CSS.
- Improved accessibility with ARIA attributes and keyboard navigation.

### Fixed

- Add any specific bug fixes made just before the 1.0.0 release here.
  - Example: Fixed issue where voice command confidence was too strict by default.
  - Example: Ensured CSV export handles special characters correctly.

*(Note: Replace YYYY-MM-DD with the actual release date.)* 
