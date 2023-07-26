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
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	intervalMinutes: 60
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

		new CleanerModal(this.app, chosenFile as TFile).open();
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
			}
		);
		// This adds an editor command that can perform some operation on the current editor instance
		// this.addCommand({
		// 	id: 'sample-editor-command',
		// 	name: 'Sample editor command',
		// 	editorCallback: (editor: Editor, view: MarkdownView) => {
		// 		console.log(editor.getSelection());
		// 		editor.replaceSelection('Sample Editor Command');
		// 	}
		// });
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		// this.addCommand({
		// 	id: 'open-sample-modal-complex',
		// 	name: 'Open sample modal (complex)',
		// 	checkCallback: (checking: boolean) => {
		// 		// Conditions to check
		// 		const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
		// 		if (markdownView) {
		// 			// If checking is true, we're simply "checking" if the command can be run.
		// 			// If checking is false, then we want to actually perform the operation.
		// 			if (!checking) {
		// 				new SampleModal(this.app).open();
		// 			}
		//
		// 			// This command will only show up in Command Palette when the check function returns true
		// 			return true;
		// 		}
		// 	}
		// });

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));
		//
		// // If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// // Using this function will automatically remove the event listener when this plugin is disabled.
		// this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
		// 	console.log('click', evt);
		// });
		//
		// // When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => this.triggerFileCleanDialogue(), this.settings.intervalMinutes * 60 * 1000));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class CleanerModal extends Modal {
	private chosenFile: TFile;

	constructor(app: App, chosenFile: TFile) {
		super(app);
		this.chosenFile = chosenFile;
	}

	async onOpen() {
		const {contentEl} = this;
		const content = (await this.app.vault.read(this.chosenFile));
		contentEl.setText('Do you still need this file?');
		contentEl.createEl('br');
		contentEl.createEl('br');
		contentEl.createEl('div', {text: this.chosenFile.path});
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
	}

	onClose() {
		const {contentEl} = this;
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
		const {containerEl} = this;

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
	}
}
