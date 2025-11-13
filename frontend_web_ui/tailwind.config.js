/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ocean: {
          primary: "#2563EB",
          secondary: "#F59E0B",
          error: "#EF4444",
          surface: "#ffffff",
          background: "#f9fafb"
        }
      },
      boxShadow: {
        glow: "0 0 25px rgba(37, 99, 235, 0.35)",
        inset: "inset 0 1px 0 rgba(255,255,255,.04)"
      },
      backdropBlur: {
        xs: '2px',
      }
    }
  },
  plugins: []
};
