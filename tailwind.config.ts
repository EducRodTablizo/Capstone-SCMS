import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        pup: {
          maroon: {
            DEFAULT: '#580000',
            dark: '#430000',
            light: '#6E1414',
            surface: '#2C0000',
          },
          gold: {
            DEFAULT: '#C8960C',
            dark: '#A37708',
            light: '#F4B223',
            surface: '#FDF6E3',
          },
        },
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        serif: ['"DM Serif Display"', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
