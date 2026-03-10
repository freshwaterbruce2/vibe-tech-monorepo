import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface ThemeContextType {
  theme: 'dark' | 'light';
  projectName: string;
  setProjectName: (name: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme] = useState<'dark' | 'light'>('dark');
  const [projectName, setProjectName] = useState('Untitled App');

  return (
    <ThemeContext.Provider value={{ theme, projectName, setProjectName }}>
      <div className={`${theme} min-h-screen bg-zinc-950 text-foreground font-sans selection:bg-electric-violet/30 antialiased`}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
