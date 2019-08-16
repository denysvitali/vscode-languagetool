'use strict';

import * as fs from 'fs';
import * as path from 'path';
import * as net from 'net';
import * as child_process from "child_process";

import { extensions, workspace, Disposable, ExtensionContext } from 'vscode';
import { LanguageClient, LanguageClientOptions, SettingMonitor, StreamInfo } from 'vscode-languageclient';

export function activate(context: ExtensionContext) {

	console.log('Extension activated!');

	function discoverExtensionPaths() {
		return extensions.all
			.filter(x => x.id.startsWith("adamvoss.vscode-languagetool-"))
			.map(x => x.extensionPath)
	}

	function createServer(): Promise<StreamInfo> {
		return new Promise((resolve, reject) => {
			var server = net.createServer((socket) => {
				console.log("Creating server");

				resolve({
					reader: socket,
					writer: socket
				});

				socket.on('end', () => console.log("Disconnected"));
			}).on('error', (err) => {
				// handle errors here
				throw err;
			});

			// grab a random port.
			server.listen(() => {
				// Start the child java process
				let options = { cwd: workspace.rootPath };


				let process = child_process.spawn('/usr/bin/java',
					['-jar', '/home/dvitali/Documents/git/languagetool-languageserver/build/libs/languagetool-languageserver-1.0-SNAPSHOT-all.jar',
						server.address().port.toString()
					], options);

				console.log(process);

				// Send raw output to a file
				if (context.storagePath) {
					if (!fs.existsSync(context.storagePath)) {
						console.log(context.storagePath);
						fs.mkdirSync(context.storagePath);
					}

					let logFile = context.storagePath + '/vscode-languagetool-languageserver.log';
					let logStream = fs.createWriteStream(logFile, { flags: 'w' });

					process.stdout.pipe(logStream);
					process.stderr.pipe(logStream);

					console.log(`Storing log in '${logFile}'`);
				}
				else {
					console.log("No storagePath, languagetool-languageserver logging disabled.");
					process.stdout.pipe(fs.createWriteStream('/tmp/vscode-languagetool.log', {flags: 'w'}));
					process.stderr.pipe(fs.createWriteStream('/tmp/vscode-languagetool-err.log', {flags: 'w'}));
				}
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

	if (config['enabled'] || true) {
		// Create the language client and start the client.
		let disposable = new LanguageClient('languageTool', 'LanguageTool Client', createServer, clientOptions).start();

		context.subscriptions.push(disposable);
	}
}