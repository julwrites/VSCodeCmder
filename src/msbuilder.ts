import { Memento } from "vscode";
var vscode = require("vscode");
var fs = require("fs");
var path = require("path");
var ansi = require("ansi-colors");
var msbuild = require('msbuild');
var globals = require("./globals.js");

function log_output(results: string, prefix: string) {
    let outputChannel = globals.OBJ_OUTPUT;

    let output = ansi.unstyle(results as string).trim();

    outputChannel.appendLine(prefix + '\t' + output);
}

function build_project(path: string) {
    var builder = msbuild();
    let outputChannel = globals.OBJ_OUTPUT;

    outputChannel.show();
    outputChannel.clear();

    builder.sourcePath = path;
    builder.overrideParams.push('/p:WarningLevel=3');
    builder.overrideParams.push('/v:detailed');

    builder.logger = function (results: string) {
        if (results !== undefined) {
            let output = ansi.unstyle(results as string).trim();

            outputChannel.appendLine('[build]:' + '\t' + output);
        }
    };

    builder.build();
}

function build_proj_list_recursive(startPath: string) {
    console.log("Checking files from " + startPath);

    let projList: string[] = [];

    try {
        fs.readdirSync(startPath).forEach((file: string) => {
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
        console.log(error);
    }

    return projList;
}

function build_proj_list(startPath: string, projList: string[]) {
    console.log("Entry point for recursive directory listing");

    if (projList.length !== 0) {
        return projList;
    }

    startPath = path.join(startPath, path.sep);
    projList = build_proj_list_recursive(startPath);

    projList = projList.map(function (file: string) {
        return file.replace(startPath, "");
    });

    return projList;
}

function load_proj_list(startPath: string) {
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
}

var load = function (state: Memento) {
    console.log("Indexing the workspace folder");

    return new Promise(
        (fulfill, reject) => {
            // If we don't have a workspace (no folder open) don't load anything
            if (vscode.workspace.rootPath !== undefined) {
                let projList: string[] = <string[]><any>state.get(globals.TAG_VCXPROJS);
                if (projList !== undefined && projList.length !== 0) {
                    fulfill();
                    return;
                }

                try {
                    console.log("Start building the project list");
                    return load_proj_list(vscode.workspace.rootPath).then(
                        (value) => {
                            if (value !== undefined) {
                                let projList = value as any[];
                                projList.sort((left, right) => {
                                    var count = (str: string) => {
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
            else {
                reject();
            }
        });
};


var trigger_build = function (state: Memento) {
    console.log("Starting up MSBuild Trigger");

    return load(state).then(
        () => {
            let root: string = <string><any>state.get(globals.TAG_ROOTPATH);
            let start: string = vscode.workspace.rootPath === undefined ? (root === undefined ? "" : root) : vscode.workspace.rootPath;
            let projList: string[] = <string[]><any>state.get(globals.TAG_VCXPROJS);

            if (projList !== undefined) {
                if (projList.length === 0) {
                    vscode.window.showErrorMessage("Could not find any Visual Studio projects to build");
                    return;
                }

                vscode.window.showQuickPick(projList)
                    .then(
                        (val: string) => {
                            if (val === undefined) {
                                return;
                            }

                            build_project(path.join(start, val));
                        });
            }
        }
    );
};

exports.build = trigger_build;



// TODO: Options for configurations and parameters