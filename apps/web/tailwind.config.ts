import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#07090f",
        panel: "#111522",
        brand: { 400: "#53e0b3", 500: "#26c99a", 600: "#14a77f" },
      },
      boxShadow: { glow: "0 0 60px rgba(38, 201, 154, .13)" },
    },
  },
  plugins: [],
} satisfies Config;
