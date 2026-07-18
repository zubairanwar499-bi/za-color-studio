// Curated, hand-picked starter library so "Color Library" has real content
// even before anyone generates anything with AI.

const BASE_LIBRARY = [
  { name: "Navy & Amber", mood: "Confident . Corporate", tags: ["dark", "corporate"], colors: { primary: "#16264A", secondary: "#5B8DEF", accent: "#F5A623", background: "#0B1220", surface: "#121B2E", text: "#F5F7FA", success: "#34D399", warning: "#FBBF24", danger: "#F87171", border: "#24304A" } },
  { name: "Midnight Teal", mood: "Calm . Technical", tags: ["dark", "tech"], colors: { primary: "#0F3D3E", secondary: "#4FD1C5", accent: "#3FCBBE", background: "#0A1716", surface: "#102524", text: "#EAF7F5", success: "#34D399", warning: "#FBBF24", danger: "#F87171", border: "#1D3634" } },
  { name: "Slate Violet", mood: "Modern . Premium", tags: ["dark", "luxury"], colors: { primary: "#332155", secondary: "#9B7FE0", accent: "#B893F0", background: "#120C1F", surface: "#1B1330", text: "#F3EEFC", success: "#34D399", warning: "#FBBF24", danger: "#F87171", border: "#2A2044" } },
  { name: "Paper & Clay", mood: "Warm . Editorial", tags: ["light", "editorial"], colors: { primary: "#8A4B2E", secondary: "#C97B4A", accent: "#E0975A", background: "#F6F1EA", surface: "#FFFFFF", text: "#2A1E15", success: "#3C9A5F", warning: "#D9922C", danger: "#C2493B", border: "#E7DDCF" } },
  { name: "Mint Clinical", mood: "Clean . Healthcare", tags: ["light", "healthcare"], colors: { primary: "#0E7C66", secondary: "#4FD1B8", accent: "#22C3A6", background: "#F2FBF8", surface: "#FFFFFF", text: "#0F2A24", success: "#22C3A6", warning: "#E0A83C", danger: "#E0584C", border: "#D4EFE8" } },
  { name: "Crimson Ledger", mood: "Sharp . Finance", tags: ["light", "finance"], colors: { primary: "#7A1E2B", secondary: "#B5384A", accent: "#D94B5C", background: "#FAF4F4", surface: "#FFFFFF", text: "#241012", success: "#2F8F5B", warning: "#C88A2E", danger: "#B5384A", border: "#EBD9DA" } },
  { name: "Neon Circuit", mood: "Electric . Gaming", tags: ["dark", "gaming"], colors: { primary: "#141021", secondary: "#7B5CFF", accent: "#00F0B5", background: "#0A0812", surface: "#161225", text: "#F1EEFF", success: "#00F0B5", warning: "#FFD23F", danger: "#FF4E6A", border: "#241E38" } },
  { name: "Sandstone Trail", mood: "Grounded . Travel", tags: ["light", "travel"], colors: { primary: "#8C5A32", secondary: "#C99A5B", accent: "#E8B368", background: "#FBF6EE", surface: "#FFFFFF", text: "#2E2013", success: "#4C8C5C", warning: "#D69A3E", danger: "#C0503C", border: "#EFE2CC" } },
  { name: "Cobalt Signal", mood: "Bold . SaaS", tags: ["light", "saas"], colors: { primary: "#1E3A8A", secondary: "#3B82F6", accent: "#F97316", background: "#F5F7FB", surface: "#FFFFFF", text: "#101828", success: "#16A34A", warning: "#F59E0B", danger: "#DC2626", border: "#E2E7F0" } },
  { name: "Blackout Gold", mood: "Luxury . Editorial", tags: ["dark", "luxury"], colors: { primary: "#0D0D0D", secondary: "#C9A24B", accent: "#E9C46A", background: "#080808", surface: "#131313", text: "#F5EFE0", success: "#7CB07C", warning: "#E9C46A", danger: "#C1553D", border: "#242118" } },
  { name: "Orchard Fresh", mood: "Friendly . E-commerce", tags: ["light", "ecommerce"], colors: { primary: "#2E7D32", secondary: "#66BB6A", accent: "#FF7043", background: "#F5FBF4", surface: "#FFFFFF", text: "#14231A", success: "#2E7D32", warning: "#F9A825", danger: "#D84315", border: "#DCEEDD" } },
  { name: "Arctic Slate", mood: "Minimal . Utility", tags: ["light", "minimal"], colors: { primary: "#334155", secondary: "#64748B", accent: "#0EA5E9", background: "#F8FAFC", surface: "#FFFFFF", text: "#0F172A", success: "#22C55E", warning: "#EAB308", danger: "#EF4444", border: "#E2E8F0" } },
];

function hexToRgb(hex) {
  hex = hex.replace("#", "");
  if (hex.length === 3) hex = hex.split("").map(c => c + c).join("");
  const n = parseInt(hex, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r, g, b;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const toHex = (v) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function shiftHexColor(hex, hueShift) {
  if (!hex || !hex.startsWith("#")) return hex;
  const rgb = hexToRgb(hex);
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const newHue = (hsl.h + hueShift + 360) % 360;
  return hslToHex(newHue, hsl.s, hsl.l);
}

// Generate extra palettes to reach at least 100 items (12 * 9 = 108 palettes total)
const shifts = [
  { shift: 30, adj: "Warm" },
  { shift: 60, adj: "Solar" },
  { shift: 120, adj: "Forest" },
  { shift: 180, adj: "Complementary" },
  { shift: 210, adj: "Nordic" },
  { shift: 240, adj: "Ocean" },
  { shift: 270, adj: "Deep" },
  { shift: 300, adj: "Vibrant" }
];

const LIBRARY = [...BASE_LIBRARY];

BASE_LIBRARY.forEach((base, baseIdx) => {
  shifts.forEach((s, shiftIdx) => {
    const clonedColors = {};
    Object.entries(base.colors).forEach(([role, hex]) => {
      if (["primary", "secondary", "accent", "text", "border", "success", "warning", "danger"].includes(role)) {
        clonedColors[role] = shiftHexColor(hex, s.shift);
      } else {
        clonedColors[role] = shiftHexColor(hex, Math.round(s.shift / 4));
      }
    });

    LIBRARY.push({
      id: `lib_${baseIdx}_s${shiftIdx}`,
      name: `${s.adj} ${base.name}`,
      mood: base.mood,
      tags: base.tags,
      colors: clonedColors
    });
  });
});

module.exports = { LIBRARY };
