// Modern Minimalist Design System
export const theme = {
  colors: {
    // Primary palette - Modern blue gradient
    primary: {
      50: '#EFF6FF',
      100: '#DBEAFE',
      200: '#BFDBFE',
      300: '#93C5FD',
      400: '#60A5FA',
      500: '#3B82F6',
      600: '#2563EB',
      700: '#1D4ED8',
      800: '#1E40AF',
      900: '#1E3A8A',
    },
    
    // Neutral palette - Clean grays
    neutral: {
      50: '#FAFAFA',
      100: '#F4F4F5',
      200: '#E4E4E7',
      300: '#D4D4D8',
      400: '#A1A1AA',
      500: '#71717A',
      600: '#52525B',
      700: '#3F3F46',
      800: '#27272A',
      900: '#18181B',
    },
    
    // Semantic colors
    success: {
      light: '#D1FAE5',
      main: '#10B981',
      dark: '#059669',
    },
    warning: {
      light: '#FEF3C7',
      main: '#F59E0B',
      dark: '#D97706',
    },
    error: {
      light: '#FEE2E2',
      main: '#EF4444',
      dark: '#DC2626',
    },
    info: {
      light: '#DBEAFE',
      main: '#3B82F6',
      dark: '#2563EB',
    },
    
    // Background colors
    background: {
      primary: '#FFFFFF',
      secondary: '#FAFAFA',
      tertiary: '#F4F4F5',
      elevated: '#FFFFFF',
    },
    
    // Text colors
    text: {
      primary: '#18181B',
      secondary: '#52525B',
      tertiary: '#71717A',
      disabled: '#A1A1AA',
      inverse: '#FFFFFF',
    },
  },
  
  typography: {
    // Modern font families - Poppins primary, Inter fallback
    fontFamily: {
      regular: 'Poppins-Regular',
      medium: 'Poppins-Medium',
      semiBold: 'Poppins-SemiBold',
      bold: 'Poppins-Bold',
      light: 'Poppins-Light',
      extraBold: 'Poppins-ExtraBold',
    },
    
    // Modern font sizes with better hierarchy
    fontSize: {
      xs: 12,
      sm: 14,
      base: 16,
      lg: 18,
      xl: 20,
      '2xl': 24,
      '3xl': 30,
      '4xl': 36,
      '5xl': 48,
    },
    
    // Improved line heights for better readability
    lineHeight: {
      tight: 1.2,
      base: 1.5,
      relaxed: 1.7,
      loose: 1.8,
    },
    
    // Modern letter spacing
    letterSpacing: {
      tight: -0.5,
      normal: 0,
      wide: 0.5,
      wider: 1,
    },
  },
  
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 48,
    '3xl': 64,
  },
  
  borderRadius: {
    none: 0,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },
  
  shadows: {
    none: {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 5,
    },
    xl: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.16,
      shadowRadius: 24,
      elevation: 8,
    },
  },
  
  animation: {
    duration: {
      fast: 200,
      normal: 300,
      slow: 500,
    },
    easing: {
      easeIn: 'ease-in',
      easeOut: 'ease-out',
      easeInOut: 'ease-in-out',
    },
  },
};

// Helper functions for consistent styling
export const createShadow = (elevation: keyof typeof theme.shadows) => theme.shadows[elevation];

export const getColor = (path: string) => {
  const keys = path.split('.');
  let value: any = theme.colors;
  for (const key of keys) {
    value = value[key];
  }
  return value;
}; 