import * as vscode from 'vscode';
import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';

let previewPanel: vscode.WebviewPanel | undefined;

export function activate(context: vscode.ExtensionContext) {
    console.log('SiteDog Preview extension is now active!');

    // Register command to convert relative dates
    let convertDates = vscode.commands.registerCommand('sitedog.convertRelativeDates', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found');
            return;
        }

        convertRelativeDatesInDocument(editor);
    });

    // Register command to show preview
    let showPreview = vscode.commands.registerCommand('sitedog.showPreview', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found');
            return;
        }

        // Check if file is sitedog.yml
        const fileName = path.basename(editor.document.fileName);
        if (fileName !== 'sitedog.yml') {
            vscode.window.showErrorMessage('Please open a sitedog.yml file');
            return;
        }

        createOrShowPreview(context, editor.document.uri);
    });

    // Register command to refresh preview
    let refreshPreview = vscode.commands.registerCommand('sitedog.refreshPreview', () => {
        if (previewPanel) {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                updatePreview(editor.document.uri);
            }
        }
    });

    // Watch for file changes
    const watcher = vscode.workspace.createFileSystemWatcher('**/sitedog.yml');
    watcher.onDidChange(uri => {
        if (previewPanel) {
            updatePreview(uri);
        }
    });

    // Watch for text document changes (live preview)
    vscode.workspace.onDidChangeTextDocument(event => {
        if (previewPanel && path.basename(event.document.fileName) === 'sitedog.yml') {
            updatePreviewFromDocument(event.document);
        }
    });

    context.subscriptions.push(showPreview, refreshPreview, convertDates, watcher);
}

function convertRelativeDatesInDocument(editor: vscode.TextEditor) {
    const document = editor.document;
    const text = document.getText();

    // Regex to match patterns like "expires in: X days", "expires in: X months", etc.
    const relativeeDatePattern = /expires in:\s*(\d+)\s*(days?|months?|years?|weeks?)/gi;

    const edits: vscode.TextEdit[] = [];
    let match;

    while ((match = relativeeDatePattern.exec(text)) !== null) {
        const fullMatch = match[0];
        const amount = parseInt(match[1]);
        const unit = match[2].toLowerCase();

        // Calculate the target date
        const now = new Date();
        let targetDate = new Date(now);

        switch (unit) {
            case 'day':
            case 'days':
                targetDate.setDate(now.getDate() + amount);
                break;
            case 'week':
            case 'weeks':
                targetDate.setDate(now.getDate() + (amount * 7));
                break;
            case 'month':
            case 'months':
                targetDate.setMonth(now.getMonth() + amount);
                break;
            case 'year':
            case 'years':
                targetDate.setFullYear(now.getFullYear() + amount);
                break;
        }

        // Format the date as YYYY-MM-DD
        const formattedDate = targetDate.toISOString().split('T')[0];

        // Find the end of the current line to add the new key after it
        const lineEnd = document.positionAt(match.index! + fullMatch.length);
        const lineEndPos = new vscode.Position(lineEnd.line, document.lineAt(lineEnd.line).text.length);

        // Create the new line with absolute date
        const newLine = `\n    expires_date: ${formattedDate}`;

        edits.push(vscode.TextEdit.insert(lineEndPos, newLine));
    }

    if (edits.length > 0) {
        // Show a confirmation dialog
        vscode.window.showInformationMessage(
            `Found ${edits.length} relative date(s). Convert to absolute dates?`,
            'Yes', 'No'
        ).then(selection => {
            if (selection === 'Yes') {
                const workspaceEdit = new vscode.WorkspaceEdit();
                workspaceEdit.set(document.uri, edits);
                vscode.workspace.applyEdit(workspaceEdit);
                vscode.window.showInformationMessage(`Converted ${edits.length} relative date(s) to absolute dates.`);
            }
        });
    } else {
        vscode.window.showInformationMessage('No relative dates found in the current document.');
    }
}

function createOrShowPreview(context: vscode.ExtensionContext, uri: vscode.Uri) {
    const column = vscode.ViewColumn.Beside;

    if (previewPanel) {
        previewPanel.reveal(column);
        updatePreview(uri);
        return;
    }

    previewPanel = vscode.window.createWebviewPanel(
        'sitedogPreview',
        'SiteDog Preview',
        column,
        {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [context.extensionUri]
        }
    );

    previewPanel.onDidDispose(() => {
        previewPanel = undefined;
    });

    updatePreview(uri);
}

function updatePreview(uri: vscode.Uri) {
    if (!previewPanel) return;

    try {
        const content = fs.readFileSync(uri.fsPath, 'utf8');
        updatePreviewContent(content);
    } catch (error) {
        previewPanel.webview.html = getErrorHtml(`Error reading file: ${error}`);
    }
}

function updatePreviewFromDocument(document: vscode.TextDocument) {
    if (!previewPanel) return;
    updatePreviewContent(document.getText());
}

function updatePreviewContent(yamlContent: string) {
    if (!previewPanel) return;

    try {
        // Validate YAML
        yaml.load(yamlContent);
        previewPanel.webview.html = getPreviewHtml(yamlContent);
    } catch (error) {
        previewPanel.webview.html = getErrorHtml(`YAML Error: ${error}`);
    }
}

function getPreviewHtml(yamlContent: string): string {
    const escapedYaml = yamlContent.replace(/`/g, '\\`').replace(/\$/g, '\\$');

    return `<!DOCTYPE html>
<html>
<head>
    <title>SiteDog Preview</title>
    <link rel="stylesheet" href="https://sitedog.io/css/preview.css" />
    <style>
        @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap");

        :root {
            --bg-body: #f4f6f8;
            --bg-card: #ffffff;
            --border: #e0e3e7;
            --text-main: #111827;
            --text-muted: #6b7280;
            --accent: #f4b760;
            --error-color: #e53935;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Inter', sans-serif;
            background-color: var(--bg-body);
            color: var(--text-main);
            padding: 20px;
        }

        .preview-container {
            background-color: var(--bg-card);
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .error-message {
            color: var(--error-color);
            padding: 1rem;
            text-align: center;
            font-size: 14px;
        }

        #card-container {
            min-height: 200px;
        }
    </style>
</head>
<body>
    <div class="preview-container">
        <div id="card-container"></div>
    </div>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/js-yaml/4.1.0/js-yaml.min.js"></script>
    <script src="https://sitedog.io/js/renderCards.js"></script>
    <script>
        const cardContainer = document.getElementById("card-container");
        const yamlContent = \`${escapedYaml}\`;

        function updateCards() {
            try {
                renderCards(yamlContent, cardContainer, (config, result, error) => {
                    if (!result) {
                        cardContainer.innerHTML = \`<div class="error-message">Render Error: \${error}</div>\`;
                    }
                });
            } catch (error) {
                cardContainer.innerHTML = \`<div class="error-message">Error: \${error.message}</div>\`;
            }
        }

        // Initial render
        updateCards();

        // Listen for messages from extension (for future live updates)
        window.addEventListener('message', event => {
            const message = event.data;
            if (message.command === 'update') {
                yamlContent = message.yaml;
                updateCards();
            }
        });
    </script>
</body>
</html>`;
}

function getErrorHtml(error: string): string {
    return `<!DOCTYPE html>
<html>
<head>
    <title>SiteDog Preview - Error</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f5f5f5;
            padding: 20px;
        }
        .error-container {
            background-color: #fff;
            border-left: 4px solid #e53935;
            padding: 20px;
            border-radius: 4px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        .error-title {
            color: #e53935;
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 10px;
        }
        .error-message {
            color: #333;
            font-size: 14px;
            line-height: 1.5;
        }
    </style>
</head>
<body>
    <div class="error-container">
        <div class="error-title">⚠️ Preview Error</div>
        <div class="error-message">${error}</div>
    </div>
</body>
</html>`;
}

export function deactivate() {}
