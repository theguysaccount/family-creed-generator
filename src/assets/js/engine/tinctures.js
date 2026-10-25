// Heraldic tinctures. Meanings are the traditional associations given in W. Cecil Wade,
// "The Symbolism of Heraldry" (1898, public domain), not rules.
export const TINCTURES = {
  or: { name: "Or", plain: "gold", kind: "metal", hex: "#E3B23C", meaning: "generosity and elevation of the mind" },
  argent: { name: "Argent", plain: "silver", kind: "metal", hex: "#F3F0E8", meaning: "peace and sincerity" },
  gules: { name: "Gules", plain: "red", kind: "colour", hex: "#B8262E", meaning: "military strength and magnanimity" },
  azure: { name: "Azure", plain: "blue", kind: "colour", hex: "#1F4F9A", meaning: "truth and loyalty" },
  vert: { name: "Vert", plain: "green", kind: "colour", hex: "#21733B", meaning: "hope, joy and loyalty in love" },
  purpure: { name: "Purpure", plain: "purple", kind: "colour", hex: "#6A2C82", meaning: "royal majesty, sovereignty and justice" },
  sable: { name: "Sable", plain: "black", kind: "colour", hex: "#202020", meaning: "constancy" },
  tenne: { name: "Tenné", plain: "orange", kind: "colour", hex: "#C4622D", meaning: "worthy ambition" },
};

export const METALS = ["or", "argent"];
export const COLOURS = ["gules", "azure", "vert", "purpure", "sable", "tenne"];

export const isMetal = (t) => TINCTURES[t]?.kind === "metal";

// The rule of tincture: metal on colour or colour on metal, never metal on metal or colour on colour.
export const contrasts = (a, b) => isMetal(a) !== isMetal(b);

export const OUTLINE = "#1d1b18";
export const LIGHT_LINE = "#ece6d8";
