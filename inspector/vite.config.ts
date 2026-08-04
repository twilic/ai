import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const inspectorDir = path.dirname(fileURLToPath(import.meta.url));
const stubId = "\0twilic-node-backend-stub";

export default defineConfig({
  root: inspectorDir,
  build: {
    outDir: path.join(inspectorDir, "dist"),
    emptyOutDir: true,
    target: "esnext",
  },
  assetsInclude: ["**/*.wasm"],
  plugins: [
    {
      name: "stub-twilic-node-backend",
      enforce: "pre",
      resolveId(source) {
        if (
          source === "./runtime/node-backend.js" ||
          source.endsWith("/runtime/node-backend.js") ||
          source.endsWith("\\runtime\\node-backend.js")
        ) {
          return stubId;
        }
        return null;
      },
      load(id) {
        if (id !== stubId) {
          return null;
        }
        return `export async function loadNodeBackend() {
  throw new Error("@twilic/core node backend is unavailable in the browser");
}`;
      },
    },
  ],
  define: {
    "process.env.NODE_ENV": JSON.stringify(
      process.env.NODE_ENV ?? "production",
    ),
  },
});
