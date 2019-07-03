import {Memento} from 'vscode';

var vscode = require('vscode');

var traversal = require('./traversal');
var global = require('./global');

export interface Bookmark {
  name: string;
  path: string;
}

function Bookmark(name: string, path: string) {
  let bookmark: Bookmark = {
    name: name,
    path: path,
  };
  return bookmark;
}

function add(state: Memento, name: string, path: string) {
  if (name === undefined || path === undefined) {
    return;
  }

  console.log('Committing bookmark to state');

  // Registers a name to a navPath
  var bookmarkList: Bookmark[] =
      <Bookmark[]><any>state.get(global.TAG_BOOKMARKS);
  bookmarkList = bookmarkList === undefined ? [] : bookmarkList;
  name = global.STR_BOOKMARK.concat(name);
  var entry = {name, path};

  // Check for duplicates
  var found = false;
  bookmarkList.forEach(function(element) {
    if (element.name === name) {
      found = true;
    }
  });

  if (!found) {
    bookmarkList.push(entry);
  }

  state.update(global.TAG_BOOKMARKS, bookmarkList);

  vscode.window.setStatusBarMessage(
      'Added ' + name + ' => ' + path, global.TIMEOUT);
}

var nav_path = function(state: Memento, name: string) {
  if (name === undefined) {
    return;
  }

  console.log('Navigation for bookmark adding');

  // Does a.navigate using the current navPath if available
  traversal.traverse(
      vscode.workspace.rootPath, [], add.bind(null, state, name));
};

var query_name = function() {
  console.log('Query for a bookmark name');

  return vscode.window.showInputBox({prompt: 'Enter a name'});
};

var add_bookmark = function(state: Memento) {
  console.log('Starting up navigation for adding bookmark');

  query_name().then((val: string) => {
    nav_path(state, val);
  });
};

function del(state: Memento, name: string) {
  if (name === undefined) {
    return;
  }

  console.log('Committing deletion of bookmark to state');

  var bookmarkList: Bookmark[] =
      <Bookmark[]><any>state.get(global.TAG_BOOKMARKS);
  var out: Bookmark[] = [];

  bookmarkList.forEach(function(element) {
    if (name !== element.name) {
      out.push(element);
    }
  });

  state.update(global.TAG_BOOKMARKS, out);

  vscode.window.setStatusBarMessage('Removed ' + name, global.TIMEOUT);
}

var del_bookmark = function(state: Memento) {
  console.log('Starting up delete bookmark listing');

  var bookmarkList: Bookmark[] =
      <Bookmark[]><any>state.get(global.TAG_BOOKMARKS);
  if (bookmarkList === undefined) {
    vscode.window.setStatusBarMessage('No bookmarkList', global.TIMEOUT);
    return;
  }

  var names: string[] = [];
  bookmarkList.forEach(function(element: Bookmark) {
    names.push(element.name);
  });

  vscode.window.showQuickPick(names).then((val: string) => {
    del(state, val);
  });
};

var clr_bookmarkList = function(state: Memento) {
  console.log('Clearing all bookmarkList');

  // Doesn't matter what bookmarkList there are, we'll just replace with empty
  state.update(global.TAG_BOOKMARKS, []);

  vscode.window.setStatusBarMessage('Removed all Bookmarks', global.TIMEOUT);
};

exports.add_bookmark = add_bookmark;
exports._add_bookmark = add;
exports.del_bookmark = del_bookmark;
exports._del_bookmark = del;
exports.clr_bookmarkList = clr_bookmarkList;