/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        navy: { 950: "#142B4A", 900: "#1C3B61", 800: "#28517F" },
        brand: "#2563EB",
        success: "#16A36A",
        warning: "#F59E0B",
        danger: "#EF4444"
      }
    }
  },
  plugins: []
};
