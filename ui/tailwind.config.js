/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0a0c10",
        card: "#12161f",
        border: "#1f2937",
        accent: "#3b82f6",
        success: "#10b981",
        warning: "#f59e0b",
        error: "#ef4444"
      }
    },
  },
  plugins: [],
}
