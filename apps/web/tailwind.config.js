import foragerPreset from "@forager/design-tokens";
import tailwindAnimate from "tailwindcss-animate";

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  presets: [foragerPreset],
  theme: {
    extend: {
      // shadcn/ui CSS variable references — wired to Forager tokens
      colors: {
        border: "var(--color-neutral-200)",
        input: "var(--color-neutral-200)",
        ring: "var(--color-brand-primary)",
        background: "var(--color-surface-background)",
        foreground: "var(--color-neutral-950)",
        primary: {
          DEFAULT: "var(--color-brand-primary)",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "var(--color-neutral-100)",
          foreground: "var(--color-neutral-900)",
        },
        destructive: {
          DEFAULT: "var(--color-semantic-error)",
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "var(--color-neutral-100)",
          foreground: "var(--color-neutral-500)",
        },
        accent: {
          DEFAULT: "var(--color-brand-accent)",
          foreground: "var(--color-neutral-950)",
        },
        popover: {
          DEFAULT: "var(--color-surface-card)",
          foreground: "var(--color-neutral-950)",
        },
        card: {
          DEFAULT: "var(--color-surface-card)",
          foreground: "var(--color-neutral-950)",
        },
      },
    },
  },
  plugins: [tailwindAnimate],
};
