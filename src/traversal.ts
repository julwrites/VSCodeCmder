// Includes
var vscode = require('vscode');
var fs = require('fs');
var path = require('path');
var clone = require('clone');

var commands = ['>..', '>Select'];

function quick_pick(pathCurr, dirList, options, bookmarks, callback) {
    console.log('Setting up Quick Pick options');

    // Add in commands for navigation
    options = options.concat(bookmarks);
    dirList = options.concat(dirList);

    // Returns the result of a recursive query to quickpick
    vscode.window.showQuickPick(dirList).then(val => {
        // As a special case, check if the path is undefined
        if (pathCurr == undefined) {
            // Check if this is attempting to do something with an invalid path
            if (options.indexOf(val) < 0) {
                pathCurr = path.join(val, path.sep);
                val = '';
            }
        }

        traverse_recursive(pathCurr, val, bookmarks, callback);
    });
}

// Handles the result of the quickpick
// Throws out 3 possible results:
// The directory to list next
// An empty string (indicating no directory)
// Undefined (indicating either invalid or handled input)
function option_handler(pathCurr, result, bookmarks, callback) {
    console.log('Reading and handling input from Quick Pick');

    // Handling special cases
    switch (result) {
        case undefined:
            callback(undefined);
            return undefined;
        case commands[0]: {
            // Clone the old path for comparison
            let compare: string = clone(pathCurr);
            let index: number = compare.lastIndexOf(path.sep);
            if (index != -1) {
                pathCurr = pathCurr.slice(0, index + 1);
            }
            // if (pathCurr === compare) {
            //     return '';
            // }

            return pathCurr;
        }
        case commands[1]: {
            callback(pathCurr);
            return undefined;
        }
    }

    // If it is not handled, means we are moving into a new dir

    // Checks if this is a bookmark
    if (bookmarks.includes(result)) {
        callback(result);
        return undefined;
    }

    // Joins the path with the quick pick
    let pathTry = path.join(pathCurr, result);

    var isFile = undefined;
    try {
        isFile = fs.lstatSync(pathTry).isFile();
    } catch (error) {
        isFile = false;
        pathTry = pathCurr;

        vscode.window.showErrorMessage('No permission to access this');
    }

    if (isFile === true) {
        callback(pathTry);
        return undefined;
    }

    return pathTry;
}

function traverse_recursive(pathPrev, result, bookmarks, callback) {
    console.log('Recursively traverse to next folder');

    // Resolves the previous path into a real path
    pathPrev = path.resolve(pathPrev);

    // Clones the previous path to use for this iteration
    var pathCurr = clone(pathPrev);

    pathCurr = option_handler(pathCurr, result, bookmarks, callback);

    if (pathCurr === undefined) return;

    // If not a file, attempt to read the directory
    var dirList = [];

    if (pathCurr.length > 0) {
        try {
            dirList = fs.readdirSync(pathCurr);
        } catch (error) { }

        if (dirList.length === 0) {
            pathCurr = pathPrev;
            dirList = fs.readdirSync(pathCurr);
        }

        quick_pick(pathCurr, dirList, commands, bookmarks, callback);
    }
}

function traverse(startPath, bookmarks, callback) {
    console.log('Entry point for recursive traversal');

    traverse_recursive(startPath, '', bookmarks, callback);
}

function jump(callback) {
    vscode.window.showInputBox({ prompt: 'Enter a path' }).then(val => {
        if (val == undefined) return undefined;

        fs.stat(val, (err, stats) => {
            callback(val);
        });
    });
}

exports.traverse = traverse;
exports.jump = jump;
