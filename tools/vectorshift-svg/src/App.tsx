/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { VectorShiftDashboard } from './components/VectorShiftDashboard';
import { Toaster } from './lib/toast';

export default function App() {
  return (
    <>
      <VectorShiftDashboard />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#0A0A0A',
            color: '#F0F0F0',
            border: '1px solid #333',
            borderRadius: '0',
            fontFamily: 'monospace',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            fontSize: '12px'
          },
          success: {
            iconTheme: {
              primary: '#CCFF00',
              secondary: '#0A0A0A',
            },
            style: {
              border: '1px solid #CCFF00',
            }
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#0A0A0A',
            },
            style: {
              border: '1px solid #ef4444',
            }
          }
        }}
      />
    </>
  );
}
