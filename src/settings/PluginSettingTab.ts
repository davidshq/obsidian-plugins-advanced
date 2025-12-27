/**
 * Settings tab for Community Plugin Browser
 */

import { PluginSettingTab as ObsidianPluginSettingTab, Setting } from "obsidian";
import CommunityPluginBrowserPlugin from "../main";
import { ViewLocation } from "../types";

export class PluginSettingTab extends ObsidianPluginSettingTab {
	plugin: CommunityPluginBrowserPlugin;

	constructor(plugin: CommunityPluginBrowserPlugin) {
		super(plugin.app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl("h2", { text: "Community Plugin Browser Settings" });

		// View location setting
		new Setting(containerEl)
			.setName("View Location")
			.setDesc("Choose where the plugin browser opens when activated")
			.addDropdown((dropdown) => {
				dropdown
					.addOption("right", "Right Sidebar")
					.addOption("main", "Main Editor Area")
					.addOption("window", "New Window")
					.setValue(this.plugin.settings.viewLocation)
					.onChange(async (value: ViewLocation) => {
						this.plugin.settings.viewLocation = value;
						await this.plugin.saveSettings();
					});
			});
	}
}

