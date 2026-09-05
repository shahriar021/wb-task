/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1B1F2A",
        paper: "#F6F5F2",
        line: "#DEDBD3",
        signal: "#2F5D50",
        "signal-light": "#E4EEE9",
        amber: "#B7791F",
      },
      fontFamily: {
        sans: ["'Inter'", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
