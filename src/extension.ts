import { Memento, ExtensionContext, OutputChannel, FileSystemWatcher } from 'vscode';

// Includes
var vscode = require('vscode');

var directory = require('./directory.js');
var bookmarks = require('./bookmarks.js');
var globals = require('./globals.js');
var cppbuild = require('./cppbuild.js');

function initialize(state: Memento) {
    globals.STATE = state;

    globals.OBJ_OUTPUT = vscode.window.createOutputChannel(globals.STR_CODECMDER);
    globals.OBJ_OUTPUT.show(false);

    globals.TAG_CPPPROJ_WATCHER = vscode.workspace.createFileSystemWatcher();

    state.update(globals.TAG_CPPPROJ, []);
}

// this method is called when your extension is activated
function activate(context: ExtensionContext) {
    console.log('File Explorer is now available in VS Code');

    var state = context.globalState;

    // Commands matching that of that in package.json
    var navCommand = vscode.commands.registerCommand('extension.navigate',
        () => { directory.navigate(state); });
    var jmpCommand = vscode.commands.registerCommand('extension.jumpToPath',
        () => { directory.chdir(state); });
    var setCommand = vscode.commands.registerCommand('extension.setRoot',
        () => { directory.set_root(state); });
    var addCommand = vscode.commands.registerCommand('extension.addBookmark',
        () => { bookmarks.add_bookmark(state); });
    var delCommand = vscode.commands.registerCommand('extension.removeBookmark',
        () => { bookmarks.del_bookmark(state); });
    var clrCommand = vscode.commands.registerCommand('extension.clearBookmarks',
        () => { bookmarks.clr_bookmarks(state); });
    var bldCommand = vscode.commands.registerCommand('extension.buildproj',
        () => { cppbuild.build(state); });

    // Add to a list of disposables that die when the extension deactivates
    context.subscriptions.push(navCommand);
    context.subscriptions.push(jmpCommand);
    context.subscriptions.push(setCommand);
    context.subscriptions.push(addCommand);
    context.subscriptions.push(delCommand);
    context.subscriptions.push(clrCommand);
    context.subscriptions.push(bldCommand);

    initialize(state);
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {
    console.log('Deactivating extension');

    (<FileSystemWatcher><any>globals.TAG_CPPPROJ_WATCHER).dispose();

    (<OutputChannel><any>globals.OBJ_OUTPUT).dispose();
    globals.OBJ_OUTPUT = undefined;

    globals.STATE = undefined;
}

exports.deactivate = deactivate;