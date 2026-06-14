import { defineConfig } from "vite";
import build from "@hono/vite-build/cloudflare-workers";
import devServer from "@hono/vite-dev-server";
import adapter from "@hono/vite-dev-server/cloudflare";

export default defineConfig({
  plugins: [
    build({ entry: "src/index.tsx" }),
    devServer({ entry: "src/index.tsx", adapter }),
  ],
});
