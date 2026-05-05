import * as vscode from 'vscode';
import axios from 'axios';

export function activate(context: vscode.ExtensionContext) {
  // Vibe Code Studio extension activated

  const disposableComplete = vscode.commands.registerCommand('vibeCodeStudio.completeCode', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showInformationMessage('No active editor.');
      return;
    }

    const config = vscode.workspace.getConfiguration('vibeCodeStudio');
    const apiKey = config.get<string>('apiKey');
    const model = config.get<string>('model') || 'deepseek-chat';

    if (!apiKey) {
      vscode.window.showErrorMessage('DeepSeek API Key is missing. Please add it to your settings.');
      return;
    }

    const document = editor.document;
    const position = editor.selection.active;
    const textBeforeCursor = document.getText(new vscode.Range(new vscode.Position(0, 0), position));

    try {
      const response = await axios.post(
        'https://api.deepseek.com/v1/chat/completions',
        {
          model,
          messages: [
            { role: 'system', content: 'You are an intelligent code completion assistant. Return only the code to insert.' },
            { role: 'user', content: `Complete the following code:\n\n${textBeforeCursor}` }
          ],
          temperature: 0.2,
          max_tokens: 150
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const completion = response.data.choices[0]?.message?.content || '';
      
      editor.edit(editBuilder => {
        editBuilder.insert(position, completion);
      });
    } catch (error: any) {
      vscode.window.showErrorMessage(`Vibe Code Studio Error: ${error.message}`);
    }
  });

  context.subscriptions.push(disposableComplete);
}

export function deactivate() {}
