// Includes
var vscode = require("vscode");

var traversal = require("./traversal.js");
var globals = require("./globals.js");

function add(state, name, fPath) {
    if (name === undefined || fPath === undefined)
        return;

    console.log("Committing bookmark to state");

    // Registers a name to a navPath
    var bookmarks = state.get(globals.TAG_BOOKMARKS);
    bookmarks = bookmarks === undefined ? [] : bookmarks;
    name = globals.STR_BOOKMARK.concat(name);
    var entry = { name, fPath };

    // Check for duplicates
    var found = false;
    bookmarks.forEach(function (element) {
        if (element.name === name)
            found = true;
    }, this);

    if (!found)
        bookmarks.push(entry);

    state.update(globals.TAG_BOOKMARKS, bookmarks);

    vscode.window.setStatusBarMessage("Added " + name + " => " + fPath, globals.TIMEOUT);
};

var nav_path = function (state, name) {
    if (name === undefined)
        return;

    console.log("Navigation for bookmark adding");

    let root = state.get(globals.TAG_ROOTPATH);
    let start = vscode.workspace.rootPath === undefined ? (root === undefined ? "" : root) : vscode.workspace.rootPath;

    // Does a.navigate using the current navPath if available
    traversal.traverse(start, [], add.bind(null, state, name));
};

var query_name = function () {
    console.log("Query for a bookmark name");

    return vscode.window.showInputBox({ prompt: "Enter a name" });
};

var add_bookmark = function (state) {
    console.log("Starting up navigation for adding bookmark");

    query_name()
        .then(
            val => {
                nav_path(state, val);
            }
        );
};

function del(state, name) {
    if (name === undefined)
        return;

    console.log("Committing deletion of bookmark to state");

    var bookmarks = state.get(globals.TAG_BOOKMARKS);
    var out = [];

    bookmarks.forEach(function (element) {
        if (name != element.name)
            out.push(element);
    }, this);

    state.update(globals.TAG_BOOKMARKS, out);

    vscode.window.setStatusBarMessage("Removed " + name, globals.TIMEOUT);
};

var del_bookmark = function (state) {
    console.log("Starting up delete bookmark listing");

    var bookmarks = state.get(globals.TAG_BOOKMARKS);
    if (bookmarks === undefined) {
        vscode.window.setStatusBarMessage("No bookmarks", globals.TIMEOUT);
        return;
    }

    var names = [];
    bookmarks.forEach(function (element) {
        names.push(element.name);
    }, this);

    vscode.window.showQuickPick(names)
        .then(
            val => {
                del(state, val);
            }
        );
};

var clr_bookmarks = function (state) {
    console.log("Clearing all bookmarks");

    // Doesn't matter what bookmarks there are, we'll just replace with empty
    state.update(globals.TAG_BOOKMARKS, []);

    vscode.window.setStatusBarMessage("Removed all Bookmarks", globals.TIMEOUT);
};

exports.add_bookmark = add_bookmark;
exports._add_bookmark = add;
exports.del_bookmark = del_bookmark;
exports._del_bookmark = del;
exports.clr_bookmarks = clr_bookmarks;
