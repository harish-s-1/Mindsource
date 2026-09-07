import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Base surfaces (dark, borders do elevation — no shadows)
        bg: "#0B0D10",
        surface: "#12151A",
        "surface-2": "#171B21",
        "surface-3": "#1C2027",
        border: "#242A32",
        "border-strong": "#2E3540",
        // Text
        "text-primary": "#E6E9ED",
        "text-secondary": "#9BA5B1",
        "text-muted": "#6B7480",
        // Single accent — primary actions, active nav, links only
        accent: "#37B5A8",
        "accent-hover": "#43C7B9",
        "accent-muted": "#1C3A38",
        // Status (meaning only, never decorative)
        healthy: "#3FB950",
        "healthy-bg": "#132A16",
        warning: "#D29922",
        "warning-bg": "#2B2410",
        critical: "#F0603A",
        "critical-bg": "#2E1611",
        idle: "#6E7681",
        "idle-bg": "#1C2027",
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
      fontSize: {
        "2xs": ["11px", "16px"],
        xs: ["12px", "16px"],
        sm: ["13px", "18px"],
        base: ["14px", "20px"],
        md: ["15px", "22px"],
        lg: ["16px", "24px"],
        xl: ["18px", "26px"],
        "2xl": ["22px", "30px"],
      },
      borderRadius: {
        DEFAULT: "3px",
        sm: "2px",
        md: "4px",
        lg: "6px",
      },
      maxWidth: {
        content: "1600px",
      },
    },
  },
  plugins: [],
};

export default config;
