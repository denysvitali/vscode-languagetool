'use strict';

import * as net from 'net';

import { extensions, workspace, Disposable, ExtensionContext } from 'vscode';
import { LanguageClient, LanguageClientOptions, StreamInfo } from 'vscode-languageclient';

export function activate(context: ExtensionContext) {

	function discoverExtensionPaths() {
		return extensions.all
			.filter(x => x.id.startsWith("adamvoss.vscode-languagetool-"))
			.map(x => x.extensionPath)
	}

	function createServer(): Promise<StreamInfo> {
		return new Promise((resolve, reject) => {
			var client = net.createConnection(8081, 'localhost',
			() => {
				console.log("Connected!", client);
				resolve({
					reader: client,
					writer: client
				});
			});
		});
	};



	// Options to control the language client
	let clientOptions: LanguageClientOptions = {
		documentSelector: ['plaintext', 'markdown', 'tex'],
		synchronize: {
			configurationSection: 'languageTool'
		}
	}

	// Allow to enable languageTool in specific workspaces
	let config = workspace.getConfiguration('languageTool');

	if (config['enabled']) {
		// Create the language client and start the client.
		let disposable = new LanguageClient('languageTool', 'LanguageTool Client', createServer, clientOptions).start();
		context.subscriptions.push(disposable);
	}
}