// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
var vscode = require('vscode');

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "explorer-context-menu-command" is now active!');

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    var disposable = vscode.commands.registerCommand('extension.runCommand', function (commandContext) {
        // The code you place here will be executed every time your command is executed
        var config = vscode.workspace.getConfiguration("explorercontextmenu") || {};
        var commands = config.commands || [];

        if (commands.length === 0) {
            vscode.window.showInformationMessage('No command found');

            return vscode.window.showInputBox({ prompt: 'No command found, enter command name' }).then((name) => {
                return vscode.commands.executeCommand(name, commandContext);
            })
        }
        if (commands.length === 1) {
            // vscode.window.showInformationMessage('Running command ' + commands[0]);
            return vscode.commands.executeCommand(commands[0], commandContext);
        }
        vscode.window.showQuickPick(commands, { placeHolder: "Select a command" }).then((name) => {
            return vscode.commands.executeCommand(name, commandContext);
        });
    });

    context.subscriptions.push(disposable);
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {
}
exports.deactivate = deactivate;
