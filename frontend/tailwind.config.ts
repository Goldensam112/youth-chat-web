import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#07090f",
        panel: "#10131d",
        line: "#252a38",
        mint: "#53e6b1",
        coral: "#ff6f61",
        gold: "#ffd166"
      },
      boxShadow: {
        glow: "0 0 36px rgba(83, 230, 177, 0.18)"
      }
    }
  },
  plugins: []
};

export default config;
