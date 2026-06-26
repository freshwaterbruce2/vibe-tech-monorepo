````yaml
---
name: ui-real-time-panel-creation
description: A skill for creating real-time UI panels in the VibeTech monorepo.
license: Apache-2.0
metadata:
  author: Auto-Generated
  version: "1.0.0"
  generated_from: learning_pattern__occurrences
  success_rate: 95.0%
  category: development
---

# UI Real-Time Panel Creation

**Auto-generated from successful patterns**

## Overview
This skill facilitates the creation of real-time user interface panels within VibeTech's monorepo structure, leveraging modern technologies such as React and Tailwind CSS. It ensures that UI components are dynamically updated in response to data changes, providing an interactive user experience.

## Core Capabilities
- Real-time data binding to UI components.
- Integration with backend services for live updates.
- Utilization of Tailwind for responsive and customizable designs.
- Support for multiple platforms (Web, Mobile, Desktop).

## Usage Examples
### Basic Setup
1. Navigate to your project directory:
   ```bash
   cd V:\monorepo\apps\web
````

2. Install necessary dependencies using pnpm:

   ```bash
   pnpm install @vibetech/ui
   ```

3. Create a new panel component:

   ```tsx
   // src/components/RealTimePanel.tsx
   import React, { useEffect, useState } from 'react';
   import { fetchData } from '@nova/data-service';

   const RealTimePanel = () => {
     const [data, setData] = useState([]);

     useEffect(() => {
       const interval = setInterval(() => {
         fetchData().then((response) => setData(response));
       }, 1000);
       return () => clearInterval(interval);
     }, []);

     return (
       <div className="p-4 bg-gray-100">
         {data.map((item) => (
           <div key={item.id} className="border-b py-2">
             {item.name}
           </div>
         ))}
       </div>
     );
   };

   export default RealTimePanel;
   ```

4. Integrate the panel into your application:

   ```tsx
   // src/App.tsx
   import RealTimePanel from './components/RealTimePanel';

   function App() {
     return (
       <div className="App">
         <h1>Real-Time Data Panel</h1>
         <RealTimePanel />
       </div>
     );
   }

   export default App;
   ```

## Integration with Monorepo

This skill is designed to align with VibeTech's monorepo structure, ensuring that all components and packages are utilized according to the pnpm package manager guidelines. It emphasizes the use of shared libraries such as `@nova/*` for consistent data fetching across different applications.

## Safety Measures

- **Data Snapshots**: Ensure regular snapshots of the D:\ drive are created to prevent data loss during development.
- **Validation**: Validate data integrity before rendering to the UI. Implement error boundaries to handle any exceptions gracefully.
- **Rollback**: Maintain a versioning strategy for your components to allow easy rollback if necessary.

## Related Skills

- [error-boundary-implementation](#)
- [database-schema-migration](#)
- [task-management-patterns](#)
