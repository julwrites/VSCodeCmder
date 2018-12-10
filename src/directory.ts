import { Memento } from 'vscode';
import { Bookmark } from './bookmarks';

var vscode = require('vscode');
var fs = require('fs');

var traversal = require('./traversal');
var global = require('./global');
var bookmarks = require('./bookmarks');



function resolve_bookmark(state: Memento, navPath: string) {
    console.log('Checking if this is bookmark');

    let bookmarks: Bookmark[] = <Bookmark[]><any>state.get(global.TAG_BOOKMARKS);
    bookmarks = bookmarks === undefined ? [] : bookmarks;

    let bookmark = bookmarks.find(function (bookmark) {
        return bookmark.name === navPath;
    });

    if (bookmark !== undefined) { navPath = bookmark.path; }

    return navPath;
}

function resolve_mrulist(state: Memento, navPath: string) {
    console.log('Checking if this is in MRU');

    let mruList: string[] = <string[]><any>state.get(global.TAG_MRULIST);
    mruList = mruList === undefined ? [] : mruList;

    let mru = mruList.find(function (mru: string) {
        return mru === navPath;
    });

    if (mru !== undefined) { navPath = mru.replace(global.STR_MRULIST, ''); }

    return navPath;
}

function update_mrulist(state: Memento) {
    console.log('Folder change, updating MRU');

    if (vscode.workspace.rootPath !== undefined) {
        let mruList: string[] = <string[]><any>state.get(global.TAG_MRULIST);
        mruList = mruList === undefined ? [] : mruList;

        if (mruList.length >= global.MRU_MAX) { mruList.pop(); }

        var mru = global.STR_MRULIST + vscode.workspace.rootPath;

        if (mruList.includes(mru)) {
            mruList.splice(mruList.indexOf(mru), 1);
        }

        mruList = [mru].concat(mruList);

        state.update(global.TAG_MRULIST, mruList);
    }
}

function dead_path(state: Memento, navPath: string) {
    console.log('Found a dead path, removing from logs');

    // Remove this dead link from bookmarks
    let bookmarkList: Bookmark[] = <Bookmark[]><any>state.get(global.TAG_BOOKMARKS);

    if (bookmarkList !== undefined) {
        let bookmark = bookmarkList.find(function (bookmark) {
            return bookmark.name === navPath;
        });

        if (bookmark !== undefined) {
            bookmarks._del_bookmark(state, bookmark.name);
        }
    }

    // Remove this dead link from MRU
    let mruList: string[] = <string[]><any>state.get(global.TAG_MRULIST);

    if (mruList !== undefined) {
        var mru = global.STR_MRULIST + navPath;

        if (mruList.includes(mru)) {
            mruList.splice(mruList.indexOf(mru), 1);
        }

        state.update(global.TAG_MRULIST, mruList);
    }
}

function open_file(state: Memento, navPath: string) {
    console.log('Opening file ' + navPath);

    vscode.workspace.openTextDocument(navPath).then(function (doc: string) {
        vscode.window.showTextDocument(doc);
    });
}

function open_folder(state: Memento, navPath: string) {
    console.log('Opening folder ' + navPath);

    update_mrulist(state);

    let uri = vscode.Uri.parse('file:' + navPath);

    vscode.commands.executeCommand('vscode.openFolder', uri, false);
}

function open_path(state: Memento, navPath: string) {
    console.log('Opening ' + navPath);

    navPath = resolve_bookmark(state, navPath);

    navPath = resolve_mrulist(state, navPath);

    if (navPath === undefined) { return; }

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

var chdir = function (state: Memento) {
    console.log('Entering goto');

    traversal.jump(open_path.bind(null, state));
};

var navigate = function (state: Memento) {
    console.log('Entering navigate');

    let names: string[] = [];

    console.log('Current root path: ' + vscode.workspace.rootPath);

    console.log('Populating bookmarks');

    let bookmarkList: Bookmark[] = <Bookmark[]><any>state.get(global.TAG_BOOKMARKS);
    bookmarkList = bookmarkList === undefined ? [] : bookmarkList;
    bookmarkList.forEach(function (bookmark: Bookmark) {
        names.push(bookmark.name);
    });

    console.log('Populated bookmarks');

    console.log('Populating MRU');

    let mruList: string[] = <string[]><any>state.get(global.TAG_MRULIST);
    mruList = mruList === undefined ? [] : mruList;
    mruList.forEach(function (mru: string) {
        names.push(mru);
    });

    console.log('Populated MRU');

    console.log('Starting navigate');

    // Does a navigate using the current navPath if available
    traversal.traverse(vscode.workspace.rootPath, names, open_path.bind(null, state));
};

exports.chdir = chdir;
exports.navigate = navigate;
exports.open_path = open_path;
