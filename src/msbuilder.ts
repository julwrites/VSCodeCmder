// Includes
var vscode = require("vscode");
var fs = require("fs");
var path = require("path");
var ansi = require("ansi-colors");
var msbuild = require('msbuild');
var globals = require("./globals.js");

function build_project(path) {
    var builder = msbuild();
    let outputChannel = globals.OBJ_OUTPUT;

    outputChannel.show();
    outputChannel.clear();

    let params = [];
    params.push('/p:WarningLevel=4')
    params.push('/verbosity:detailed')

    builder.sourcePath = path;
    builder.setConfig(params);
    builder.logger = function (results) {
        if (results != undefined) {
            let output = ansi.unstyle(results as string).trim();

            outputChannel.appendLine(output);
        }
    };

    builder.build();
};

function build_proj_list_recursive(startPath) {
    console.log("Checking files from " + startPath);

    let projList = [];

    try {
        fs.readdirSync(startPath).forEach((file) => {
            file = path.join(startPath, file);

            if (file.includes(".sln") || (file.includes(".vcxproj") && !file.includes(".vcxproj."))) {
                projList.push(file);
            }

            let stats = fs.statSync(file);
            if (stats.isDirectory()) {
                build_proj_list_recursive(file).forEach((file) => {
                    if (file.includes(".sln") || (file.includes(".vcxproj") && !file.includes(".vcxproj."))) {
                        projList.push(file);
                    }
                });
            }
        });
    } catch (error) {
        console.log(this.name + error);
    }

    return projList;
}

function build_proj_list(startPath, projList) {
    console.log("Entry point for recursive directory listing");

    if (projList.length != 0) {
        return projList;
    }

    startPath = path.join(startPath, path.sep);
    projList = build_proj_list_recursive(startPath);

    projList = projList.map(function (file) {
        return file.replace(startPath, "");
    });

    return projList;
};

function load_proj_list(startPath) {
    return new Promise(
        (fulfill, reject) => {
            console.log("Building directory listing for VS projects");

            try {
                let projList = build_proj_list(startPath, []);

                fulfill(projList);
            } catch (error) {
                reject();
            }
        });
};

var load = function (state) {
    console.log("Indexing the workspace folder");

    return new Promise(
        (fulfill, reject) => {
            // If we don't have a workspace (no folder open) don't load anything
            if (vscode.workspace.rootPath != undefined) {
                let projList = state.get(globals.TAG_VCXPROJS);
                if (projList != undefined && projList.length != 0) {
                    fulfill();
                    return;
                }

                try {
                    console.log("Start building the project list");
                    return load_proj_list(vscode.workspace.rootPath).then(
                        (value) => {
                            if (value != undefined) {
                                let projList = value as any[];
                                projList.sort((left, right) => {
                                    var count = (str) => {
                                        return (str.split(path.sep)).length;
                                    };

                                    return count(left) - count(right);
                                });
                                state.update(globals.TAG_VCXPROJS, projList);
                                fulfill();
                            }
                            else {
                                reject();
                            }
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
            let projList = state.get(globals.TAG_VCXPROJS);

            if (projList != undefined) {
                if (projList.length == 0) {
                    vscode.window.showErrorMessage("Could not find any Visual Studio projects to build");
                    return;
                }

                vscode.window.showQuickPick(projList)
                    .then(
                        val => {
                            if (val === undefined)
                                return;

                            build_project(path.join(start, val));
                        });
            }
        }
    );
};

exports.build = trigger_build;



// TODO: Options for configurations and parameters