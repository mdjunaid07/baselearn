/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // "Garden at golden hour" — a sky-blue child-facing world with a leaf-green
        // growth color and a marigold reward accent. Deliberately not the cream+terracotta
        // or near-black+neon defaults; see DESIGN.md / the design plan for the reasoning.
        sky: { DEFAULT: "#EAF4FB", deep: "#DCEBF6" },
        ink: { DEFAULT: "#1D3557", soft: "#3D5A80" },
        leaf: { light: "#8FD9B6", DEFAULT: "#2F9E63", dark: "#227A4C" },
        marigold: { DEFAULT: "#F4A825", dark: "#D68C12" },
        coral: { DEFAULT: "#EF7B5D", dark: "#D9603F" },
        cloud: "#F7F8FA", // parent dashboard background
        mist: "#DCE8F0", // borders/dividers on sky backgrounds
      },
      fontFamily: {
        display: ["'Baloo 2'", "system-ui", "sans-serif"], // child-facing world
        body: ["'Inter'", "system-ui", "sans-serif"], // parent dashboard world
      },
      borderRadius: {
        xl2: "1.5rem",
        xl3: "2rem",
      },
      keyframes: {
        grow: { "0%": { transform: "scaleY(0.6)", opacity: "0.6" }, "100%": { transform: "scaleY(1)", opacity: "1" } },
        pop: { "0%": { transform: "scale(0.7)", opacity: "0" }, "60%": { transform: "scale(1.15)" }, "100%": { transform: "scale(1)", opacity: "1" } },
      },
      animation: {
        grow: "grow 0.5s ease-out forwards",
        pop: "pop 0.4s ease-out forwards",
      },
    },
  },
  plugins: [],
};
