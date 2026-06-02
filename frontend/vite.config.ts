import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/auth": "http://localhost:3001",
      "/events": "http://localhost:3001",
      "/places": "http://localhost:3001",
      "/playlists": "http://localhost:3001",
    },
  },
});

