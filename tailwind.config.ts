import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ginger: {
          DEFAULT: "#b45309",
          dark: "#7c3a06",
          light: "#f59e0b",
        },
      },
    },
  },
  plugins: [],
};

export default config;
