import path from "path";
import { fileURLToPath } from "url";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
  root: __dirname,
  plugins: [react()],
  server: {
    port: 5174,
    strictPort: true,
    host: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
};
