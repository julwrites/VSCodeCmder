import { Memento, ExtensionContext } from 'vscode';

// Includes
var vscode = require('vscode');

var directory = require('./directory.js');
var bookmarks = require('./bookmarks.js');
var global = require('./global.js');
var cppbuild = require('./cppbuild.js');

function initialize(state: Memento) {
    global.STATE = state;

    global.OBJ_OUTPUT = vscode.window.createOutputChannel(global.STR_CODECMDER);
    global.OBJ_OUTPUT.show(false);

    state.update(global.TAG_CPPPROJ, []);
}

// this method is called when your extension is activated
function activate(context: ExtensionContext) {
    console.log('File Explorer is now available in VS Code');

    var state = context.globalState;

    // Commands matching that of that in package.json
    var navCommand = vscode.commands.registerCommand('codecmder.navigate',
        () => { directory.navigate(state); });
    var jmpCommand = vscode.commands.registerCommand('codecmder.jumpToPath',
        () => { directory.chdir(state); });
    var addCommand = vscode.commands.registerCommand('codecmder.addBookmark',
        () => { bookmarks.add_bookmark(state); });
    var delCommand = vscode.commands.registerCommand('codecmder.removeBookmark',
        () => { bookmarks.del_bookmark(state); });
    var clrCommand = vscode.commands.registerCommand('codecmder.clearBookmarks',
        () => { bookmarks.clr_bookmarks(state); });
    var bldCommand = vscode.commands.registerCommand('codecmder.buildproj',
        () => { cppbuild.build(state); });

    // Add to a list of disposables that die when the extension deactivates
    context.subscriptions.push(navCommand);
    context.subscriptions.push(jmpCommand);
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

    global.OBJ_CPPPROJ_WATCHER.dispose();

    global.OBJ_OUTPUT.dispose();
}

exports.deactivate = deactivate;