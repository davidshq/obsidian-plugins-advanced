#!/usr/bin/env node
/**
 * Install script for development - copies files to vault plugin directory
 * Usage: npm run install:dev
 * 
 * Set OBSIDIAN_VAULT environment variable or edit VAULT_PATH below
 * Best used with Hot-Reload plugin for automatic reloading
 */

const fs = require('fs');
const path = require('path');

// Set your vault path here or use environment variable
const VAULT_PATH = process.env.OBSIDIAN_VAULT || process.env.VAULT_PATH || '';

if (!VAULT_PATH) {
	console.error('❌ Error: OBSIDIAN_VAULT environment variable not set!');
	console.error('');
	console.error('Please set your vault path:');
	console.error('  export OBSIDIAN_VAULT="/path/to/your/vault"');
	console.error('  npm run install:dev');
	console.error('');
	console.error('Or edit VAULT_PATH in scripts/install-dev.js');
	process.exit(1);
}

const PLUGIN_ID = 'community-plugin-browser';
const PLUGIN_DIR = path.join(VAULT_PATH, '.obsidian', 'plugins', PLUGIN_ID);
const PROJECT_ROOT = path.resolve(__dirname, '..');

// Files to copy
const FILES_TO_COPY = [
	{ source: 'main.js', target: 'main.js' },
	{ source: 'manifest.json', target: 'manifest.json' },
	{ source: 'src/styles.css', target: 'styles.css' },
];

console.log('📦 Installing plugin files for development...');
console.log(`📁 Vault: ${VAULT_PATH}`);
console.log(`📦 Plugin: ${PLUGIN_DIR}`);
console.log('');

// Build first if main.js doesn't exist
if (!fs.existsSync(path.join(PROJECT_ROOT, 'main.js'))) {
	console.log('🔨 Building plugin first...');
	const { execSync } = require('child_process');
	try {
		execSync('npm run build', { stdio: 'inherit', cwd: PROJECT_ROOT });
		console.log('✅ Build complete!\n');
	} catch (error) {
		console.error('❌ Build failed!');
		process.exit(1);
	}
}

// Create plugin directory if it doesn't exist
if (!fs.existsSync(PLUGIN_DIR)) {
	fs.mkdirSync(PLUGIN_DIR, { recursive: true });
	console.log(`✅ Created plugin directory: ${PLUGIN_DIR}`);
} else {
	console.log(`✅ Plugin directory exists: ${PLUGIN_DIR}`);
}

// Copy files
let copied = 0;
let skipped = 0;

for (const file of FILES_TO_COPY) {
	const sourcePath = path.join(PROJECT_ROOT, file.source);
	const targetPath = path.join(PLUGIN_DIR, file.target);
	
	if (!fs.existsSync(sourcePath)) {
		console.warn(`⚠️  Source file not found: ${file.source}`);
		skipped++;
		continue;
	}
	
	fs.copyFileSync(sourcePath, targetPath);
	console.log(`📋 Copied: ${file.target}`);
	copied++;
}

console.log('');
console.log(`✅ Installation complete! (${copied} files copied, ${skipped} skipped)`);
console.log('');
console.log('Next steps:');
console.log('  1. Run: npm run dev (to watch for changes)');
console.log('  2. Install Hot-Reload plugin for automatic reloading:');
console.log('     Settings → Community plugins → Browse → Search "Hot-Reload"');
console.log('  3. Enable this plugin: Settings → Community plugins');
console.log('');

