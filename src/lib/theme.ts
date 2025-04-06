// Theme configuration for the entire application
// This file serves as a single source of truth for color schemes and styling
// Inspired by Notion and Sanity UI

export const theme = {
  // Primary colors
  primary: {
    light: '#6366f1', // indigo-500
    DEFAULT: '#4f46e5', // indigo-600
    dark: '#4338ca', // indigo-700
  },
  
  // Background colors
  background: {
    light: '#f9fafb', // gray-50
    DEFAULT: '#111827', // gray-900
    dark: '#030712', // gray-950
  },
  
  // Text colors
  text: {
    light: '#f9fafb', // gray-50
    muted: '#9ca3af', // gray-400
    dark: '#1f2937', // gray-800
  },
  
  // Border colors
  border: {
    light: '#374151', // gray-700
    DEFAULT: '#1f2937', // gray-800
    dark: '#111827', // gray-900
  },
  
  // Component-specific colors
  card: {
    background: {
      light: '#1f2937', // gray-800
      dark: '#111827', // gray-900
    },
    border: {
      light: '#374151', // gray-700
      dark: '#1f2937', // gray-800
    },
    shadow: {
      light: '0 4px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px -1px rgba(0, 0, 0, 0.1)',
      dark: '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2)',
    },
  },
  
  // Chart colors
  chart: {
    primary: '#6366f1', // indigo-500
    secondary: '#10b981', // emerald-500
    tertiary: '#f59e0b', // amber-500
    quaternary: '#ef4444', // red-500
    grid: '#374151', // gray-700
    gridDark: '#1f2937', // gray-800
    text: '#9ca3af', // gray-400
    textDark: '#6b7280', // gray-500
  },
  
  // Spacing and sizing
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
  },
  
  // Breakpoints
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
  
  // Border radius
  borderRadius: {
    sm: '0.125rem',
    DEFAULT: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    '2xl': '1rem',
    full: '9999px',
  },
};

// Helper function to get theme values with proper typing
export function getThemeValue(path: string): string {
  const parts = path.split('.');
  let result: any = theme;
  
  for (const part of parts) {
    if (result[part] === undefined) {
      console.warn(`Theme value not found: ${path}`);
      return '';
    }
    result = result[part];
  }
  
  if (typeof result !== 'string') {
    console.warn(`Theme value is not a string: ${path}`);
    return '';
  }
  
  return result;
}

// CSS variables for use in styled-components or inline styles
export const cssVariables = {
  '--color-primary': theme.primary.DEFAULT,
  '--color-primary-light': theme.primary.light,
  '--color-primary-dark': theme.primary.dark,
  '--color-background': theme.background.DEFAULT,
  '--color-background-dark': theme.background.dark,
  '--color-text': theme.text.light,
  '--color-text-dark': theme.text.dark,
  '--color-text-muted': theme.text.muted,
  '--color-border': theme.border.DEFAULT,
  '--color-border-dark': theme.border.dark,
};

// Function to get CSS variables as a string
export function getCssVariables(): string {
  return Object.entries(cssVariables)
    .map(([key, value]) => `${key}: ${value};`)
    .join('\n');
}

// Tailwind utility class generator for dark mode by default
export const tw = {
  // Background colors
  bg: {
    primary: 'bg-indigo-600 hover:bg-indigo-700',
    secondary: 'bg-gray-700 hover:bg-gray-600',
    card: 'bg-gray-800 border border-gray-700',
    page: 'bg-gray-900',
    input: 'bg-gray-800 border border-gray-700',
  },
  
  // Text colors
  text: {
    primary: 'text-indigo-400',
    secondary: 'text-gray-300',
    muted: 'text-gray-400',
    inverted: 'text-gray-900',
  },
  
  // Border colors
  border: {
    primary: 'border-indigo-600',
    secondary: 'border-gray-700',
    muted: 'border-gray-800',
  },
  
  // Common component classes
  button: {
    primary: 'bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-600 rounded-md px-4 py-2 font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900',
    secondary: 'bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 rounded-md px-4 py-2 font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-700 focus:ring-offset-2 focus:ring-offset-gray-900',
    danger: 'bg-red-600 hover:bg-red-700 text-white border border-red-600 rounded-md px-4 py-2 font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900',
    icon: 'p-2 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500',
  },
  
  card: 'bg-gray-800 border border-gray-700 rounded-lg shadow-md p-6',
  
  input: 'block w-full rounded-md border-0 py-1.5 px-3 bg-gray-800 text-gray-100 shadow-sm ring-1 ring-inset ring-gray-700 placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm',
  
  select: 'block w-full rounded-md border-0 py-1.5 pl-3 pr-10 bg-gray-800 text-gray-100 shadow-sm ring-1 ring-inset ring-gray-700 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm',
  
  label: 'block text-sm font-medium text-gray-300 mb-2',
  
  // Table styles
  table: {
    container: 'min-w-full divide-y divide-gray-700',
    header: 'bg-gray-900',
    headerCell: 'px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400',
    body: 'divide-y divide-gray-800 bg-gray-800',
    row: 'hover:bg-gray-700',
    cell: 'whitespace-nowrap px-6 py-4 text-sm text-gray-300',
  },
  
  // Layout
  layout: {
    page: 'min-h-screen bg-gray-900 pb-10',
    container: 'mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6',
    header: 'mb-6 flex items-center justify-between',
    section: 'mb-8',
  },
};

export default theme;
