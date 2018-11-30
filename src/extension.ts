// Includes
var vscode = require("vscode");

var directory = require("./directory.js");
var bookmarks = require("./bookmarks.js");
var globals = require("./globals.js");
var msbuilder = require("./msbuilder.js");

function initialize(state) {
    // Null the workspace if it has changed, to ensure that fuzzy find will reload
    let workspace = state.get(globals.TAG_WORKSPACE);
    if (workspace != vscode.workspace.rootPath) {
        state.update(globals.TAG_WORKSPACE, undefined);
    }
}

// this method is called when your extension is activated
function activate(context) {
    console.log("File Explorer is now available in VS Code");

    var state = context.globalState;

    // Commands matching that of that in package.json
    var navCommand = vscode.commands.registerCommand("extension.navigate",
        () => { directory.navigate(state) });
    var navCommand = vscode.commands.registerCommand("extension.jumpToPath",
        () => { directory.chdir(state) });
    var setCommand = vscode.commands.registerCommand("extension.setRoot",
        () => { directory.set_root(state) });
    var addCommand = vscode.commands.registerCommand("extension.addBookmark",
        () => { bookmarks.add_bookmark(state) });
    var delCommand = vscode.commands.registerCommand("extension.removeBookmark",
        () => { bookmarks.del_bookmark(state) });
    var clrCommand = vscode.commands.registerCommand("extension.clearBookmarks",
        () => { bookmarks.clr_bookmarks(state) });
    var bldCommand = vscode.commands.registerCommand("extension.buildVcxproj",
        () => { msbuilder.build(state) });

    // Add to a list of disposables that die when the extension deactivates
    context.subscriptions.push(navCommand);
    context.subscriptions.push(setCommand);
    context.subscriptions.push(addCommand);
    context.subscriptions.push(delCommand);
    context.subscriptions.push(clrCommand);
    context.subscriptions.push(bldCommand);

    context.subscriptions.push(state);

    initialize(state);
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {
    console.log("Deactivating extension");
}

exports.deactivate = deactivate;