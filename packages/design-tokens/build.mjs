/**
 * build.mjs — Compiles design-tokens/tokens.json into:
 *   1. tokens.css  (CSS custom properties)
 *   2. tokens.tailwind.js (Tailwind preset)
 *
 * Run: node build.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const tokens = JSON.parse(
  readFileSync(resolve(__dirname, "../../design-tokens/tokens.json"), "utf-8")
);

// ── CSS Generation ──────────────────────────────────────────────

function flattenTokens(obj, prefix = "") {
  const entries = [];
  for (const [key, value] of Object.entries(obj)) {
    const varName = prefix ? `${prefix}-${key}` : key;
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      entries.push(...flattenTokens(value, varName));
    } else {
      entries.push([varName, value]);
    }
  }
  return entries;
}

function generateCSS(tokens) {
  const lines = [
    "/*",
    " * Forager Design Tokens — Auto-generated CSS Custom Properties",
    " * Source: design-tokens/tokens.json",
    " * DO NOT EDIT MANUALLY — run `node build.mjs` to regenerate",
    " */",
    "",
    ":root {",
  ];

  // Colors
  for (const [group, colors] of Object.entries(tokens.color)) {
    lines.push(`  /* ${group} */`);
    for (const [name, value] of Object.entries(colors)) {
      lines.push(`  --color-${group}-${name}: ${value};`);
    }
    lines.push("");
  }

  // Typography
  for (const [prop, values] of Object.entries(tokens.typography)) {
    const prefix = prop.replace("font-", "").replace("line-", "leading-").replace("letter-", "tracking-");
    const cssPrefix = prop === "font-family" ? "font"
      : prop === "font-size" ? "text"
      : prop === "font-weight" ? "font-weight"
      : prop === "line-height" ? "leading"
      : prop === "letter-spacing" ? "tracking"
      : prefix;
    for (const [name, value] of Object.entries(values)) {
      lines.push(`  --${cssPrefix}-${name}: ${value};`);
    }
    lines.push("");
  }

  // Spacing
  for (const [name, value] of Object.entries(tokens.spacing)) {
    lines.push(`  --space-${name}: ${value};`);
  }
  lines.push("");

  // Radius
  for (const [name, value] of Object.entries(tokens.radius)) {
    lines.push(`  --radius-${name}: ${value};`);
  }
  lines.push("");

  // Shadows
  for (const [name, value] of Object.entries(tokens.shadow)) {
    lines.push(`  --shadow-${name}: ${value};`);
  }
  lines.push("");

  // Transitions
  for (const [name, value] of Object.entries(tokens.transition)) {
    lines.push(`  --transition-${name}: ${value};`);
  }

  lines.push("}");
  lines.push("");

  return lines.join("\n");
}

writeFileSync(resolve(__dirname, "tokens.css"), generateCSS(tokens));
console.log("✓ tokens.css generated");

// ── Tailwind Preset Generation ──────────────────────────────────

function generateTailwindPreset(tokens) {
  const preset = {
    theme: {
      extend: {
        colors: {
          brand: {},
          surface: {},
          semantic: {},
        },
        fontFamily: {
          serif: [`var(--font-serif)`],
          sans: [`var(--font-sans)`],
          mono: [`var(--font-mono)`],
        },
        borderRadius: {},
        boxShadow: {},
      },
    },
  };

  // Map color tokens to CSS variable references
  for (const [name, value] of Object.entries(tokens.color.brand)) {
    preset.theme.extend.colors.brand[name] = `var(--color-brand-${name})`;
  }
  for (const [name, value] of Object.entries(tokens.color.surface)) {
    preset.theme.extend.colors.surface[name] = `var(--color-surface-${name})`;
  }
  for (const [name, value] of Object.entries(tokens.color.semantic)) {
    preset.theme.extend.colors.semantic[name] = `var(--color-semantic-${name})`;
  }
  // Neutral palette
  preset.theme.extend.colors.neutral = {};
  for (const [name, value] of Object.entries(tokens.color.neutral)) {
    preset.theme.extend.colors.neutral[name] = `var(--color-neutral-${name})`;
  }

  // Radius
  for (const [name, value] of Object.entries(tokens.radius)) {
    preset.theme.extend.borderRadius[name] = `var(--radius-${name})`;
  }

  // Shadows
  for (const [name, value] of Object.entries(tokens.shadow)) {
    preset.theme.extend.boxShadow[name] = `var(--shadow-${name})`;
  }

  return `/** @type {import('tailwindcss').Config} */
// Auto-generated Tailwind preset from design-tokens/tokens.json
// DO NOT EDIT MANUALLY — run \`node build.mjs\` to regenerate
export default ${JSON.stringify(preset, null, 2)};
`;
}

writeFileSync(
  resolve(__dirname, "tokens.tailwind.js"),
  generateTailwindPreset(tokens)
);
console.log("✓ tokens.tailwind.js generated");
