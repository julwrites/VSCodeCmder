// Includes
var vscode = require("vscode");
var fs = require("fs");
var path = require("path");
var msbuild = require('msbuild');
var globals = require("./globals.js");

function build_project(path) {
    msbuild.sourcePath = path;
    msbuild.build();
};

function build_proj_list_recursive(startPath) {
    console.log("Checking files from " + startPath);

    let dirList = [];
    let tmpList = [];
    let accList = [];

    try {
        fs.readdirSync(startPath).forEach(
            (file) => {
                if (file.includes(".sln") || (file.includes(".vcxproj") && !file.includes(".vcxproj."))) {
                    tmpList.push(path.join(startPath, file));
                }
            });

        dirList = dirList.concat(tmpList);

        // Add all the children's children
        tmpList.forEach(function (subPath) {
            accList.push(build_proj_list_recursive(subPath));
        }, this);

        accList.forEach(function (subList) {
            dirList = dirList.concat(subList);
        }, this);


    } catch (error) {
        console.log(this.name + error);
    }

    return dirList;
}

function build_proj_list(startPath, dirList) {
    console.log("Entry point for recursive directory listing");

    if (dirList.length != 0) {
        return dirList;
    }

    startPath = path.join(startPath, path.sep);
    dirList = build_proj_list_recursive(startPath);

    dirList = dirList.map(function (file) {
        return file.replace(startPath, "");
    });

    return dirList;
};

function load_proj(startPath, limit) {
    return new Promise(
        (fulfill, reject) => {
            console.log("Building directory listing for VS projects");

            try {
                let dirList = build_proj_list(startPath, []);

                fulfill(dirList);
            } catch (error) {
                reject();
            }
        });
};

var depthCompare = function (left, right) {
    var count = (str) => {
        return (str.split(path.sep)).length;
    };

    return count(left) - count(right);
};


var load = function (state) {
    console.log("Indexing the workspace folder");

    return new Promise(
        (fulfill, reject) => {
            let workspace = state.get(globals.TAG_WORKSPACE);
            let dirty = state.get(globals.TAG_FUZZYDIRTY);
            let start = undefined;

            // If we don't have a workspace (no folder open) don't load anything
            if (vscode.workspace.rootPath != undefined) {
                if (dirty) {
                    workspace = vscode.workspace.rootPath;
                    state.update(globals.TAG_WORKSPACE, workspace);
                    state.update(globals.TAG_DIRLIST, []);

                    vscode.window.setStatusBarMessage("Loading projects... Please wait...", globals.TIMEOUT);
                }
                // If we have already loaded it, return early
                else {
                    let dirList = state.get(globals.TAG_DIRLIST);
                    if (dirList.length != 0) {
                        fulfill();
                        return;
                    }
                    else {
                        // No op if the directory list is empty, means still loading
                        return;
                    }
                }

                start = workspace;
            }

            if (start != undefined) {
                try {
                    console.log("Actual VS build call call");
                    let limit = state.get(globals.TAG_DEPTHLIMIT);

                    return load_proj(start, limit).then(
                        () => {
                            let dirList = state.get(globals.TAG_DIRLIST);
                            dirList.sort(depthCompare);
                            state.update(globals.TAG_DIRLIST, dirList);
                            fulfill();
                        },
                        () => {
                        });
                } catch (error) {
                    reject();
                }
            }
            else
                reject();
        });
};


var trigger_build = function (state) {
    console.log("Starting up MSBuild Trigger");

    return load(state).then(
        () => {
            let root = state.get(globals.TAG_ROOTPATH);
            let start = vscode.workspace.rootPath === undefined ? (root === undefined ? "" : root) : vscode.workspace.rootPath;
            let workspace = state.get(globals.TAG_WORKSPACE);
            let dirList = workspace === vscode.workspace.rootPath ? state.get(globals.TAG_DIRLIST) : [];

            fuzzy_loaded(state);

            vscode.window.showQuickPick(dirList)
                .then(
                    val => {
                        if (val === undefined)
                            return;

                        open_path(state, path.join(start, val));
                    });
        },
        fuzzy_failed
    );
};

exports.build = trigger_build;



// TODO: Options for configurations and parameters