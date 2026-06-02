/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        teal: {
          dark: '#1F4D4F',
          DEFAULT: '#2E6F70',
        },

        sage: '#7FA89C',
        mint: '#A8C5B8',

        neutral: {
          50: '#F7F8F7',
          100: '#EAEDED',
          200: '#D6DADB',
          400: '#9AA3A3',
          900: '#1E1E1E',
        },

        success: '#7FA89C',
        info: '#5E8BBF',
        warning: '#E0B663',
        error: '#C9666B',
      },

      borderRadius: {
        card: '20px',
      },

      boxShadow: {
        card: '0 4px 10px rgba(0,0,0,0.05)',
      },
    },
  },
};
