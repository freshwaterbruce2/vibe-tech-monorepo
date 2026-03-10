import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
	server: {
		port: 3009,
		proxy: {
			"/api": {
				target: "http://localhost:3004",
				changeOrigin: true,
			},
		},
	},
	build: {
		outDir: "dist",
		sourcemap: false,
		rollupOptions: {
			output: {
				manualChunks: {
					vendor: ["react", "react-dom", "react-router-dom"],
					ui: ["framer-motion", "lucide-react"],
					forms: ["react-hook-form", "@hookform/resolvers", "zod"],
				},
			},
		},
	},
	optimizeDeps: {
		include: ["react", "react-dom", "react-router-dom"],
	},
});
