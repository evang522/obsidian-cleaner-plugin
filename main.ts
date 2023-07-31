import {
	App,
	ButtonComponent,
	Editor,
	MarkdownView,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile, ToggleComponent
} from 'obsidian';

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	intervalMinutes: number;
	folderToSearch: string;
	timeOfLastDialogue: number | null
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	intervalMinutes: 60,
	folderToSearch: './Scratch Inbox',
	timeOfLastDialogue: null
}

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	public async triggerFileCleanDialogue() {
		const files = (await this.app.vault.adapter.list('/Scratch Inbox'))
			.files;
		const chosenFile = await this.app.vault.getAbstractFileByPath(files[Math.floor(Math.random() * files.length)]);
		if (!chosenFile) {
			new Notice('No files found.');

			return;
		}

		new CleanerModal(this.app, chosenFile as TFile, this).open();
	}

	async onload() {
		await this.loadSettings();

		// // This creates an icon in the left ribbon.
		// const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
		// 	// Called when the user clicks the icon.
		// 	new Notice('This is a notice!');
		// });
		// // Perform additional things with the ribbon
		// ribbonIconEl.addClass('my-plugin-ribbon-class');
		//
		// // This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		// const statusBarItemEl = this.addStatusBarItem();
		// statusBarItemEl.setText('Status Bar Text');

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'cleaner-open-clean-file-dialogue',
			name: 'Obsidian Cleaner: Open clean file dialogue',
			callback: this.triggerFileCleanDialogue.bind(this)
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		this.registerInterval(
			window.setInterval(() => {
				if (!document.hasFocus()) {
					return;
				}

				const now = Date.now();

				if (this.settings.timeOfLastDialogue === null) {
					this.triggerFileCleanDialogue();
					return;
				}

				const timeSinceLastRunInMinutes = ((now - this.settings.timeOfLastDialogue) / 1000 / 60);
				if (timeSinceLastRunInMinutes < this.settings.intervalMinutes) {
					return;
				}


				this.triggerFileCleanDialogue()

			},
				60 * 1000 // we run this check every minute, meaning the interval can't be less than 1 min
			)
		);
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async markTimeOfLastDialogue() {
		this.settings.timeOfLastDialogue = Date.now();
		await this.saveSettings();
	}
}

class CleanerModal extends Modal {
	private chosenFile: TFile;
	private plugin: MyPlugin;

	constructor(app: App, chosenFile: TFile, plugin: MyPlugin) {
		super(app);
		this.chosenFile = chosenFile;
		this.plugin = plugin;
	}

	async onOpen() {
		const { contentEl } = this;
		const content = (await this.app.vault.read(this.chosenFile));
		contentEl.setText('Do you still need this file?');
		contentEl.createEl('br');
		contentEl.createEl('br');
		contentEl.createEl('div', { text: this.chosenFile.path });
		contentEl.createEl('br');
		contentEl.createEl('div', {
			text: `"${content.slice(0, 1_000)}"`,
			attr: {
				style: 'color: grey',
				height: '100px',
			}
		}
		);
		contentEl.createEl('br');

		new ButtonComponent(contentEl).setButtonText('Open file').onClick(async () => {
			this.close();
			const newLeaf = this.app.workspace.getLeaf(true);
			await newLeaf.openFile(this.chosenFile);
			this.app.workspace.setActiveLeaf(newLeaf);
		})
			.then(b => b.buttonEl.style.margin = '3px');

		new ButtonComponent(contentEl).setButtonText('Keep it').onClick(async () => {
			this.close();
		})
			.then(b => b.buttonEl.style.margin = '3px');

		new ButtonComponent(contentEl)
			.setIcon('trash')
			.setButtonText('Delete')
			.onClick(async () => {
				await this.app.vault.trash(this.chosenFile, true);
				new Notice(`${this.chosenFile.name} was deleted.`);
				this.close();
			})
			.then(b => b.buttonEl.style.margin = '3px');

		this.plugin.markTimeOfLastDialogue();
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Prompt Interval')
			.setDesc('How often (in minutes) should the Cleaner prompter ask you if you want to remove an unwanted file?')
			.addText(text => text
				.setPlaceholder('60')
				.setValue(this.plugin.settings.intervalMinutes.toString())
				.onChange(async (value) => {
					this.plugin.settings.intervalMinutes = Number(value) || DEFAULT_SETTINGS.intervalMinutes;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Folders to search')
			.setDesc('How often (in minutes) should the Cleaner prompter ask you if you want to remove an unwanted file?')
			.addText(text => text
				.setPlaceholder('./Scratch Inbox')
				.setValue(this.plugin.settings.folderToSearch)
				.onChange(async (value) => {
					this.plugin.settings.folderToSearch = value || DEFAULT_SETTINGS.folderToSearch;
					await this.plugin.saveSettings();
				}));
	}
}
