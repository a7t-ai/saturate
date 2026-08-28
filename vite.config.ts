import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const headers = {
  // WebMCP is origin-isolated. Without this, document.modelContext stays undefined
  // even with chrome://flags/#enable-webmcp-testing enabled.
  "Origin-Agent-Cluster": "?1",
  "Permissions-Policy": "tools=(self)",
};

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    headers,
  },
  preview: {
    host: "127.0.0.1",
    port: 4173,
    strictPort: true,
    headers,
  },
});
