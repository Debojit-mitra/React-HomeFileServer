/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "dark-bg": "#1a1b1e",
        "dark-surface": "#25262b",
        "dark-border": "#2c2e33",
      },
    },
  },
  plugins: [],
};
