import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#0B1120",
        card: "#111827",
        primary: "#2563EB",
        success: "#22C55E",
        warning: "#F59E0B",
        critical: "#EF4444",
        muted: "#9CA3AF",
        border: "#1F2937",
      },
      boxShadow: {
        card: "0 4px 24px rgba(0, 0, 0, 0.4)",
      },
    },
  },
  plugins: [],
};

export default config;
