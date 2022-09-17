// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
var vscode = require('vscode');
var cp = require('child_process');
var os = require('os');
var fs = require('fs');
var path = require('path');
const { debug } = require('console');
//var XMLHttpRequest = require('XMLHttpRequest');
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
const sasLogChannel = vscode.window.createOutputChannel("SASLog");
var statusBarItem;

let NEXT_TERM_ID = 1;
const platform = os.platform();
//const userHomeDir = os.homedir();

function setupLogViewer() {
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, -1);
    statusBarItem.text = 'SAS Log';
    statusBarItem.command = 'SASLog.open-output';
    //toggleStatusBarItem(vscode.window.activeTextEditor);
    //outputChannel = vscode.window.getOutputChannel('SASLog');
    return vscode.commands.registerCommand('SASLog.open-output', () => {
        sasLogChannel.show();
    });
}

function customLsafResults( text, 
                            search = '^NOTE: SAS Life Science Analytics Framework Macro:',
                            replace = 'NOTE: LSAF Macro:'
                            ){
    console.log("(customLsafResults): search="+search);
    let textByLine = text.split("\n");
    let rx =  RegExp(search,'i');
    let textFiltered = textByLine.filter(line => rx.test(line));
    if (textFiltered.length > 0) {
        return textFiltered.join("\n");
    } else {
        return textByLine.slice(Math.max(1,textByLine.length-20)).join("\n");
    }
}

function tail(text, n=6){
    let textByLine = text.split("\n");
    if (textByLine.length > n) {
        return textByLine.slice(textByLine.length-n).join("\n");
    } else {
        return textByLine.join("\n");
    }
}

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

function httpGetAsync(theUrl, callback) {
    let xmlHttpReq = new XMLHttpRequest();
    xmlHttpReq.onreadystatechange = function () {
      if (xmlHttpReq.readyState == 4 && xmlHttpReq.status == 200)
        callback(xmlHttpReq.responseText);
    }
    xmlHttpReq.open("GET", theUrl, true); // true for asynchronous 
    xmlHttpReq.send(null);
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
        } else if (command === "copyToLSAF2"){
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
                        let execURL = "http://localhost:5000/SASjsApi/stp/execute"
                                     +"?_program="
                                     //+"/test/test.sas"
                                     +"/general/biostat/tools/Copy_to_lsaf.sas"
                                     +"&_debug=131"
                                     +"&param1=my-value-1"
                                     +"&local_path="+encodeURIComponent(context.fsPath)
                                     +"&message="+encodeURIComponent(comment)
                                     ;
                        console.log("Sending GET request: \n"+execURL)
                        httpGetAsync(execURL, function(result){
                            console.log("\n=== SAS RESULTS ===\n");
                            let filtered_result = customLsafResults(result, '^NOTE\\: SAS Life Science Analytics Framework Macro\\: \\*  The file ');
                            console.log(filtered_result);                            
                            vscode.window.showInformationMessage(tail(filtered_result, 1));
                            console.log("\n=== END OF SAS RESULTS ===\n");                            
                        });
                        
                    });
			} else {
				//console.error("Could not remove Lsaf Local Root Folder ("+lsaf_root_path+") from Unix Path: "+ux_path);
				console.error("File Path: "+ux_path+" is not within Lsaf Local Root Folder ("+lsaf_root_path+")");
			}
        } else {
            cp.execSync(`${command} "${context.fsPath}"`);
            console.log("Done with "+command);
        }
        return;
    } else if (command.toString().indexOf("SASjs") > -1) {
        console.log("SASjs Command: "+command);        
        if (command === "SASjs run"){
            let ux_path = context.fsPath.replace(/\\/g, "/");
            let path_elements = ux_path.split("/");
            let fname = path_elements[path_elements.length-1];
            let fname_elemnts = fname.split('.');
            let fext = fname_elemnts[fname_elemnts.length-1];
            if (! fext === "sas") {
                return vscode.window.showErrorMessage("SASjs run: Invalid file extension: "+fext
                +" in submitted file: "+context.fsPath);            
            }
			//console.log("ux_path: "+ux_path);
            //console.log("fname: "+fname);
            let lsaf_root_path = Lsaf_Local_Root();
            //console.log("lsaf_root_path: "+lsaf_root_path);
            let lsafLRF_pattern = new RegExp("^"+lsaf_root_path, 'i');
            if (lsafLRF_pattern.test(ux_path)) {
				let lsaf_path = ux_path.replace(lsafLRF_pattern, "");
				console.log("LSAF Path: "+ lsaf_path);	
				let execURL = "http://localhost:5000/SASjsApi/stp/execute"
                                     +"?_program="
                                     //+"/test/test.sas"
                                     +lsaf_path
                                     +"&_debug=131"
                                     +"&local_path="+encodeURIComponent(context.fsPath)
                                     ;
                console.log("Sending GET request: \n"+execURL)
                httpGetAsync(execURL, function(result){
                        console.log("\n=== SAS RESULTS: "+fname+" ===\n");
                        let filtered_result = customLsafResults(result, '^(ERROR( \\d+)?|WARNING):');
                        setupLogViewer();
                        sasLogChannel.appendLine("\n=== SAS Log: "+fname+" ===\n");
                        sasLogChannel.append(result);
                        sasLogChannel.appendLine("\n=== END OF SAS Log: "+fname+" ===\n");
                        sasLogChannel.show();
                        console.log(filtered_result);    
                        let header = 'Program: '+fname;
                        let options = { detail: filtered_result, modal: true };
                        //vscode.window.showInformationMessage(header, options, ...["Ok"]).then((item)=>{
                        //    console.log(item);
                        //});
                        if (/(^|\n)ERROR( \d+)?\:/.test(filtered_result))  {
                            let header = 'Program ran with ERRORS: '+fname;
                            vscode.window.showErrorMessage(filtered_result);
                            vscode.window.showErrorMessage(header, options);
                        } else if (/(^|\n)WARNING\:/.test(filtered_result))  {
                            let header = 'Program ran with WARNINGS: '+fname;
                            vscode.window.showWarningMessage(filtered_result);
                            vscode.window.showWarningMessage(header, options);
                        } else {
                            options = { detail: tail(filtered_result, 10), modal: true };
                            vscode.window.showInformationMessage(header, options, ...["Ok"]);                        
                            vscode.window.showInformationMessage(tail(filtered_result, 10));
                        }                    
                        console.log("\n=== END OF SAS RESULTS ===\n");                            
                    });
            } else {
                console.error("File Path: "+ux_path+" is not within Lsaf Local Root Folder ("+lsaf_root_path+")");
            }
        } else {
            debug.warn("Unrecognized SASjs command: "+command);
        }
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


function executeCustomFolderCommand(command, context) {
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
    /*
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
    */

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
                return executeCustomFolderCommand(name, commandContext);
            })
        }
        if (commands.length === 1) {
            // vscode.window.showInformationMessage('Running command ' + commands[0]);
            return executeCustomFolderCommand(commands[0], commandContext);
        }
        vscode.window.showQuickPick(commands, { placeHolder: "Select a command" }).then((name) => {
            if (name === undefined) {
                return;
            }
            return executeCustomFolderCommand(name, commandContext);
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
            if (name === undefined) {
                return;
            }
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
