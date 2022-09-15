// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
var vscode = require('vscode');
var cp = require('child_process');
var os = require('os');
var fs = require('fs');
var path = require('path');

let NEXT_TERM_ID = 1;
const platform = os.platform();
//const userHomeDir = os.homedir();


function revealFileInOs(context){
    console.log('Platform: '+platform);

    const command = (platform === 'win32' && 'explorer /select,')
        || (platform === 'linux' && 'xdg-open ')
        || (platform === 'darwin' && 'open ');

    if (!command) {
        vscode.window.showWarningMessage(`Your operating system (${platform}) isn't supported.`);
        return;
    }

    console.log('Command: '+command);
    console.log("Path: "+context.fsPath);

    //cp.execSync(`${command}"${context.fsPath}"`);
    cp.exec(`${command}"${context.fsPath}"`);
}


function Lsaf_Local_Root(){
    let lsafJsonPath = os.homedir()+path.sep+".lsaf"+path.sep+"lsaf.json";
    if (!fs.existsSync(lsafJsonPath)) {
        lsafJsonPath = os.homedir()+path.sep+"lsaf.json";
    }
    let lsaf_root_path = ".";
    if (fs.existsSync(lsafJsonPath)) {
        lsaf_root_path = require(lsafJsonPath).localRootFolder;
    }
    return lsaf_root_path;
}

function executeCustomFileCommand(command, context) {
    console.log("Local path: " + context.fsPath); // c:\Users\jbodart\VSXproj\OpenFolderInExplorer\img\inAction.gif
    if (command.toString().indexOf("LSAF") > -1) {
        console.log("LSAF Command: "+command);
        //console.log("Context: " + context);               // file:///c%3A/Users/jbodart/VSXproj/OpenFolderInExplorer/img/inAction.gif
        //console.log("Context.path: " + context.path);     // /c:/Users/jbodart/VSXproj/OpenFolderInExplorer/img/inAction.gif
        //console.log('Platform: '+platform);
        if (command === "copyToLSAF"){
            let ux_path = context.fsPath.replace(/\\/g, "/");
            let path_elements = ux_path.split("/");
            let fname = path_elements[path_elements.length-1];
			//console.log("ux_path: "+ux_path);
            //console.log("fname: "+fname);
            let lsaf_root_path = Lsaf_Local_Root();
            //console.log("lsaf_root_path: "+lsaf_root_path);
            let lsafLRF_pattern = new RegExp("^"+lsaf_root_path, 'i');
            if (lsafLRF_pattern.test(ux_path)) {
				let lsaf_path = ux_path.replace(lsafLRF_pattern, "");
				console.log("LSAF Path: "+ lsaf_path);	
				console.log("\nWaiting for User comment... ");	
                vscode.window.showInputBox({ 
                    prompt: 'Enter version comment (this enables LSAF versioning)' ,
                    title: "Copy to lSAF", 
                    value: "Update "+fname
                    }).then((comment) => {
                        console.log("comment: "+ comment + "\n");
                        let params = {macroVars: {local_path: context.fsPath, message: comment}}	
                        let jsonString = JSON.stringify(params);	
                        let src_json_file = lsaf_root_path + path.sep + ["general", "biostat", "tools", "Copy_to_lsaf.json"].join(path.sep);
                        let sas_prog = lsaf_root_path + path.sep + ["general", "biostat", "tools", "Copy_to_lsaf.sas"].join(path.sep);
                        let sas_log = lsaf_root_path + path.sep + ["general", "biostat", "tools", "Copy_to_lsaf.log"].join(path.sep);
                        //console.log("sas_prog: ", sas_prog);
                        //console.log("sas_log: ", sas_log);
                        //console.log("src_json_file: ", src_json_file);
                        fs.writeFileSync(src_json_file, jsonString);
                        command = `sasjs run "${sas_prog}" --log "${sas_log}" --source "${src_json_file}"`;
                        let curdtm = new Date();
                        let curdtmc = curdtm.toISOString();
                        //console.log("curdtm: ", curdtm);
                        //console.log("curdtmc: ", curdtmc);
                        console.log('\n['+curdtmc+'] Sending command: \n' + command + "\n...");
                        //cp.execSync(`sasjs run "${sas_prog}" --log "${sas_log}" --source "${src_json_file}"`);
                        cp.exec(command, 
                                (err, stdout, stderr) => {
                                    curdtm = new Date()
                                    curdtmc = curdtm.toISOString();
                                    console.log('\n['+curdtmc+'] Command results: \n');
                                    console.log(stdout);
                                    console.warn(stderr);
                                    if (err) {
                                        console.error(err);
                                    } else {
                                        let text = fs.readFileSync(sas_log, "utf-8");
                                        let textByLine = text.split("\n");
                                        let rx =  RegExp('^NOTE: SAS Life Science Analytics Framework Macro:','i');
                                        let textFiltered = textByLine.filter(line => rx.test(line));
                                        console.log("\n=== Excerpt of SAS Log ===\n")
                                        if (textFiltered.length > 0) {
                                            console.log(textFiltered.join("\n"));
                                        } else {
                                            console.log(textByLine.slice(Math.max(1,textByLine.length-20)).join("\n"));
                                        }
                                    }
                                });
                        }
                    );
			} else {
				//console.error("Could not remove Lsaf Local Root Folder ("+lsaf_root_path+") from Unix Path: "+ux_path);
				console.error("File Path: "+ux_path+" is not within Lsaf Local Root Folder ("+lsaf_root_path+")");
			}
        } else {
            cp.execSync(`${command} "${context.fsPath}"`);
            console.log("Done with "+command);
        }
        return;
    } else if (command.toString() === "revealFileInOs") {
        console.log("Executing Custom Command: extension."+command.toString());
        revealFileInOs(context)
        //return vscode.commands.executeCommand("extension."+command.toString(), context);
        return;
    } else if (command === undefined) {
        return;
    } else {
        console.log("Executing Built-in Command: "+command);
        return vscode.commands.executeCommand(command, context);
    }
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "explorer-context-menu-command" is now active!');

    context.subscriptions.push(
		vscode.commands.registerCommand('revealFileInOs', (context) => {
            revealFileInOs(context);
        })
        )

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    var disposable = vscode.commands.registerCommand('extension.runCommand', function (commandContext) {
        // The code you place here will be executed every time your command is executed
        var config = vscode.workspace.getConfiguration("explorercontextmenu") || {};
        var commands = config.commands || [];

        console.log("commands: ", commands);
        console.log("commandContext: ", commandContext);
        console.log("commandContext.path: ", commandContext.path);


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

    var disposable2 = vscode.commands.registerCommand('extension.runFolderCommand', function (commandContext) {
        // The code you place here will be executed every time your command is executed
        var config = vscode.workspace.getConfiguration("explorercontextmenu") || {};
        var commands = config.FolderCommands || [];

        console.log("commands(2): ", commands);
        console.log("commandContext(2): ", commandContext);
        console.log("commandContext.path(2): ", commandContext.path);

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

    context.subscriptions.push(disposable2);

    var disposable3 = vscode.commands.registerCommand('extension.runFileCommand', function (commandContext) {
        // The code you place here will be executed every time your command is executed
        var config = vscode.workspace.getConfiguration("explorercontextmenu") || {};
        var commands = config.FileCommands || [];

        console.log("commands(3): ", commands);
        console.log("commandContext(3): ", commandContext);
        console.log("commandContext.path(3): ", commandContext.path);

        if (commands.length === 0) {
            vscode.window.showInformationMessage('No command found');

            return vscode.window.showInputBox({ prompt: 'No command found, enter command name' }).then((name) => {
                return executeCustomFileCommand(name, commandContext.path);
            })
        }
        if (commands.length === 1) {
            // vscode.window.showInformationMessage('Running command ' + commands[0]);
            return executeCustomFileCommand(commands[0], commandContext.path);
        }
        vscode.window.showQuickPick(commands, { placeHolder: "Select a command" }).then((name) => {
            return executeCustomFileCommand(name, commandContext);
        });
    });

    context.subscriptions.push(disposable3);
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {
}
exports.deactivate = deactivate;
