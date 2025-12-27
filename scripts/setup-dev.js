#!/usr/bin/env node
/**
 * Setup script for development - creates symlinks to vault plugin directory
 * Usage: npm run setup:dev
 *
 * Set OBSIDIAN_VAULT environment variable or edit VAULT_PATH below
 */

const fs = require("fs");
const path = require("path");

// Set your vault path here or use environment variable
const VAULT_PATH = process.env.OBSIDIAN_VAULT || process.env.VAULT_PATH || "";

if (!VAULT_PATH) {
  console.error("❌ Error: OBSIDIAN_VAULT environment variable not set!");
  console.error("");
  console.error("Please set your vault path:");
  console.error('  export OBSIDIAN_VAULT="/path/to/your/vault"');
  console.error("  npm run setup:dev");
  console.error("");
  console.error("Or edit VAULT_PATH in scripts/setup-dev.js");
  process.exit(1);
}

const PLUGIN_ID = "community-plugin-browser";
const PLUGIN_DIR = path.join(VAULT_PATH, ".obsidian", "plugins", PLUGIN_ID);
const PROJECT_ROOT = path.resolve(__dirname, "..");

// Files to symlink
const FILES_TO_LINK = [
  { source: "main.js", target: "main.js" },
  { source: "manifest.json", target: "manifest.json" },
];

// Files to copy (symlinks don't always work for CSS)
const FILES_TO_COPY = [{ source: "src/styles.css", target: "styles.css" }];

console.log("🔧 Setting up development environment...");
console.log(`📁 Vault: ${VAULT_PATH}`);
console.log(`📦 Plugin: ${PLUGIN_DIR}`);
console.log("");

// Create plugin directory if it doesn't exist
if (!fs.existsSync(PLUGIN_DIR)) {
  fs.mkdirSync(PLUGIN_DIR, { recursive: true });
  console.log(`✅ Created plugin directory: ${PLUGIN_DIR}`);
} else {
  console.log(`✅ Plugin directory exists: ${PLUGIN_DIR}`);
}

// Create symlinks
for (const file of FILES_TO_LINK) {
  const sourcePath = path.join(PROJECT_ROOT, file.source);
  const targetPath = path.join(PLUGIN_DIR, file.target);

  // Remove existing file/symlink if it exists
  if (fs.existsSync(targetPath)) {
    fs.unlinkSync(targetPath);
    console.log(`🗑️  Removed existing: ${file.target}`);
  }

  // Create symlink
  try {
    fs.symlinkSync(sourcePath, targetPath, "file");
    console.log(`🔗 Created symlink: ${file.target} → ${file.source}`);
  } catch (error) {
    console.error(
      `❌ Failed to create symlink for ${file.target}:`,
      error.message,
    );
    console.error(
      "   Try running as administrator (Windows) or check permissions",
    );
  }
}

// Copy files that don't work well with symlinks
for (const file of FILES_TO_COPY) {
  const sourcePath = path.join(PROJECT_ROOT, file.source);
  const targetPath = path.join(PLUGIN_DIR, file.target);

  if (!fs.existsSync(sourcePath)) {
    console.warn(`⚠️  Source file not found: ${file.source}`);
    continue;
  }

  fs.copyFileSync(sourcePath, targetPath);
  console.log(`📋 Copied: ${file.target}`);
}

console.log("");
console.log("✅ Setup complete!");
console.log("");
console.log("Next steps:");
console.log("  1. Run: npm run dev (to watch for changes)");
console.log("  2. Enable the plugin in Obsidian: Settings → Community plugins");
console.log("  3. Optionally install Hot-Reload plugin for auto-reload");
console.log("");
