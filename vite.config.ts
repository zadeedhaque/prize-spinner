import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "./" keeps all asset URLs relative so the built app works from any
// subpath, including a GitHub Pages project page (username.github.io/repo/).
export default defineConfig({
  plugins: [react()],
  base: "./",
});
