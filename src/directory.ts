// Includes
var vscode = require('vscode');
var fs = require('fs');

var traversal = require('./traversal.js');
var globals = require('./globals.js');

function resolve_bookmark(state, navPath) {
    console.log('Checking if this is bookmark');

    let bookmarks = state.get(globals.TAG_BOOKMARKS);
    bookmarks = bookmarks === undefined ? [] : bookmarks;

    let bookmark = bookmarks.find(function(bookmark) {
        return bookmark.name === navPath;
    });

    if (bookmark != undefined) navPath = bookmark.fPath;

    return navPath;
}

function resolve_mrulist(state, navPath) {
    console.log('Checking if this is in MRU');

    let mruList = state.get(globals.TAG_MRULIST);
    mruList = mruList === undefined ? [] : mruList;

    let mru = mruList.find(function(mru) {
        return mru === navPath;
    });

    if (mru != undefined) navPath = mru.replace(globals.STR_MRULIST, '');

    return navPath;
}

function update_mrulist(state) {
    console.log('Folder change, updating MRU');

    if (vscode.workspace.rootPath != undefined) {
        let mruList = state.get(globals.TAG_MRULIST);
        mruList = mruList === undefined ? [] : mruList;

        if (mruList.length >= globals.MRU_MAX) mruList.pop();

        var mru = globals.STR_MRULIST + vscode.workspace.rootPath;

        if (mruList.includes(mru)) mruList.splice(mruList.indexOf(mru), 1);

        mruList = [mru].concat(mruList);

        state.update(globals.TAG_MRULIST, mruList);
    }
}

function dead_path(state, navPath) {
    console.log('Found a dead path, removing from logs');

    // Remove this dead link from bookmarks
    let bookmarks = state.get(globals.TAG_BOOKMARKS);

    if (bookmarks != undefined) {
        let bookmark = bookmarks.find(function(bookmark) {
            return bookmark.name === navPath;
        });

        if (bookmark != undefined)
            bookmarks._del_bookmark(state, bookmark.name);
    }

    // Remove this dead link from MRU
    let mruList = state.get(globals.TAG_MRULIST);

    if (mruList != undefined) {
        var mru = globals.STR_MRULIST + navPath;

        if (mruList.includes(mru)) mruList.splice(mruList.indexOf(mru), 1);

        state.update(globals.TAG_MRULIST, mruList);
    }
}

function open_file(state, navPath) {
    console.log('Opening file ' + navPath);

    vscode.workspace.openTextDocument(navPath).then(function(doc) {
        vscode.window.showTextDocument(doc);
    });
}

function open_folder(state, navPath) {
    console.log('Opening folder ' + navPath);

    update_mrulist(state);

    let uri = vscode.Uri.parse('file:' + navPath);

    vscode.commands.executeCommand('vscode.openFolder', uri, false);
}

function open_path(state, navPath) {
    console.log('Opening ' + navPath);

    navPath = resolve_bookmark(state, navPath);

    navPath = resolve_mrulist(state, navPath);

    if (navPath === undefined) return;

    let stat = undefined;
    try {
        stat = fs.lstatSync(navPath);
    } catch (error) {
        dead_path(state, navPath);
        return;
    }

    if (stat.isFile()) {
        open_file(state, navPath);
    } else if (stat.isDirectory()) {
        open_folder(state, navPath);
    }
}

var chdir = function(state) {
    console.log('Entering goto');

    traversal.jump(open_path.bind(null, state));
};

var navigate = function(state) {
    console.log('Entering navigate');

    let root = state.get(globals.TAG_ROOTPATH);
    let start =
        vscode.workspace.rootPath === undefined
            ? root === undefined
                ? ''
                : root
            : vscode.workspace.rootPath;
    let names = [];

    console.log('Current root path: ' + start);

    console.log('Populating bookmarks');

    let bookmarks = state.get(globals.TAG_BOOKMARKS);
    bookmarks = bookmarks === undefined ? [] : bookmarks;
    bookmarks.forEach(function(bookmark) {
        names.push(bookmark.name);
    }, this);

    console.log('Populated bookmarks');

    console.log('Populating MRU');

    let mruList = state.get(globals.TAG_MRULIST);
    mruList = mruList === undefined ? [] : mruList;
    mruList.forEach(function(mru) {
        names.push(mru);
    }, this);

    console.log('Populated MRU');

    console.log('Starting navigate');

    // Does a navigate using the current navPath if available
    traversal.traverse(start, names, open_path.bind(null, state));
};

function set(state, navPath) {
    if (navPath === undefined) return;

    console.log('Committing ' + navPath + ' to state');

    // Save navPath into the config
    state.update(globals.TAG_ROOTPATH, navPath);

    vscode.window.setStatusBarMessage(
        'Setting root path to ' + navPath,
        globals.TIMEOUT
    );
}

var set_root = function(state) {
    console.log('Starting up navigation for set root');

    let root = state.get(globals.TAG_ROOTPATH);
    let start =
        vscode.workspace.rootPath === undefined
            ? root === undefined
                ? ''
                : root
            : vscode.workspace.rootPath;

    let bookmarks = state.get(globals.TAG_BOOKMARKS);
    bookmarks = bookmarks === undefined ? [] : bookmarks;
    let names = [];
    bookmarks.forEach(function(bookmark) {
        names.push(bookmark.name);
    }, this);

    // Does a navigate using the current navPath if available
    traversal.traverse(start, names, set.bind(null, state));
};

exports.chdir = chdir;
exports.navigate = navigate;
exports.set_root = set_root;
exports.open_path = open_path;
