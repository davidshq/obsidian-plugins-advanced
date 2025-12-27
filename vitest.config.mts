import { defineConfig } from "vitest/config";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
	test: {
		globals: true,
		environment: "happy-dom",
		setupFiles: ["./tests/setup.ts"],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			exclude: [
				"node_modules/",
				"tests/",
				"**/*.config.*",
				"**/main.ts", // Main plugin entry point - hard to test without full Obsidian context
			],
		},
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
			"obsidian": path.resolve(__dirname, "./tests/mocks/obsidian-module.ts"),
		},
	},
});

