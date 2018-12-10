import { Memento, OutputChannel, Uri, FileSystemWatcher, WorkspaceConfiguration } from 'vscode';
import { ChildProcess } from 'child_process';
var vscode = require('vscode');
var fs = require('fs');
var path = require('path');
var ansi = require('ansi-colors');
var global = require('./global.js');
var clone = require('clone');
var commandExists = require('command-exists');
var spawn = require('cross-spawn');

var build_tool: string = "";
var build_cmd: string = "";
var build_ext: string[] = [];
var proj_list: string[] = [];

var msbuild: string = 'msbuild';
var make: string = 'make';
var xcode: string = 'xcode';

var opt_map: Record<string, string[]> = {
    msbuild: [],
    make: ['-f'],
    xcode: []
}

var ext_map: Record<string, string[]> = {
    msbuild: ['.sln', '.vcxproj'],
    make: ['.Makefile'],
    xcode: ['.xcode', '.xcodeproj']
};

// var ignore: string[] = [
//     "CMakeFiles", ".git"
// ];

function log_output(results: string) {
    let outputChannel = global.OBJ_OUTPUT;

    // We let IBM Output Colorizer handle coloring
    let output = ansi.unstyle(results as string).trim();

    outputChannel.appendLine(output);
}

function build_project(path: string, params: string[]) {
    let outputChannel: OutputChannel = global.OBJ_OUTPUT;

    outputChannel.show();
    outputChannel.clear();

    params = opt_map[build_tool].concat([path]).concat(params);

    log_output([build_cmd].concat(params).join(' '));

    let child: ChildProcess = spawn(build_cmd, params);

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');

    child.stdout.on('data', (data: string) => { log_output(data); });
    child.stderr.on('data', (data: string) => { log_output(data); });

    child.stdout.on('error', (err: Error) => { log_output(err.message); });
    child.stderr.on('error', (err: Error) => { log_output(err.message); });

    child.stdout.on('end', (data: string) => { log_output(data); });
    child.stderr.on('end', (data: string) => { log_output(data); });

    child.on('error', (err: Error) => { log_output(err.message); });
    child.on('close', (code: number, signal: string) => { log_output(signal + ' ' + code); });
}

function is_proj(path: string) {
    // for (let value of ignore) {
    //     if (file.includes(value)) {
    //         return;
    //     }
    // }

    for (let value of build_ext) {
        if (path.includes(value) &&
            (path.length === (path.lastIndexOf(value) + value.length))) {
            return true;
        }
    }
    return false;
}

function build_proj_list_recursive(startPath: string) {
    console.log('Checking files from ' + startPath);

    let projList: string[] = [];

    try {
        fs.readdirSync(startPath).forEach((file: string) => {
            file = path.join(startPath, file);
            if (is_proj(file)) {
                projList.push(file);
            }

            if (fs.statSync(file).isDirectory()) {
                projList = projList.concat(build_proj_list_recursive(file));
            }
        });
    } catch (error) {
        console.log(error);
    }

    return projList;
}

function load_proj_list() {
    return new Promise(
        (fulfill, reject) => {
            console.log('Building directory listing for VS projects');

            try {
                proj_list = build_proj_list_recursive(vscode.workspace.rootPath);

                proj_list = proj_list.map(function (file: string) {
                    return path.relative(vscode.workspace.rootPath, file);
                });

                proj_list.sort(proj_order);

                fulfill(clone(proj_list));
            } catch (error) {
                reject();
            }
        });
}

function proj_order(left: string, right: string) {
    var count = (str: string) => {
        return (str.split(path.sep)).length;
    };

    return count(left) - count(right);
}

function fileCreated(e: Uri) {
    let filePath = e.fsPath;

    console.log(filePath + ' created');

    let proj: string = path.relative(vscode.workspace.rootPath, filePath);

    if (is_proj(proj)) {
        proj_list.push(proj);
    }

    proj_list.sort(proj_order);
}

function fileDeleted(e: Uri) {
    let filePath = e.fsPath;

    console.log(filePath + ' deleted');

    let proj: string = path.relative(vscode.workspace.rootPath, filePath);

    proj_list.splice(proj_list.indexOf(proj), 1);
}


function load(state: Memento) {
    console.log('Indexing the workspace folder');

    return new Promise(
        (fulfill, reject) => {
            // If we don't have a workspace (no folder open) don't load anything
            if (vscode.workspace.rootPath !== undefined) {
                // If it is already loaded, pass the cached value
                if (proj_list.length !== 0) {
                    fulfill(clone(proj_list));
                    return;
                }

                try {
                    console.log('Start building the project list');
                    return load_proj_list().then(
                        (value) => {
                            if (value !== undefined) {
                                let projList: string[] = <string[]><any>value;

                                let glob: string = '**/*.{' + build_ext.join(',').replace(/\./g, '') + '}';

                                let watcher: FileSystemWatcher = vscode.workspace.createFileSystemWatcher(glob);
                                watcher.onDidCreate(fileCreated);
                                watcher.onDidDelete(fileDeleted);
                                global.OBJ_CPPPROJ_WATCHER = watcher;

                                fulfill(projList);
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
}

function try_cfg(valid_tools: string[]) {
    let config: WorkspaceConfiguration = vscode.workspace.getConfiguration(global.TAG_BUILDTOOL);

    for (let value of valid_tools) {
        if (config.has(value)) {
            let cmdPath: string = <string><any>config.get(value);

            let stat = fs.statSync(cmdPath);
            if (stat.isFile()) {
                build_tool = value;
                build_cmd = cmdPath;

                return true;
            }
        }
    }

    return false;
}

function try_cmd(valid_tools: string[]) {
    for (let value of valid_tools) {
        if (commandExists.sync(value)) {
            build_tool = value;
            build_cmd = value;

            return true;
        }
    }

    vscode.window.showErrorMessage('Could not find ' + valid_tools.join(', '));
    return false;
}

function build_env() {
    if (try_cfg([msbuild, make, xcode]) || try_cmd([msbuild, make, xcode])) {
        build_ext = ext_map[build_tool];
    }
    else { return false; }

    return true;
}

var trigger_build = function (state: Memento) {
    console.log('Starting up C++ Build');

    vscode.window.setStatusBarMessage('Scanning for build tools', global.TIMEOUT);

    if (build_env()) {

        load(state).then(
            (value) => {
                let projList: string[] = <string[]><any>value;

                if (projList !== undefined) {
                    if (projList.length === 0) {
                        vscode.window.showErrorMessage('Could not find any C++ projects to build');
                        return;
                    }

                    vscode.window.showQuickPick(projList)
                        .then(
                            (val: string) => {
                                if (val === undefined) {
                                    return;
                                }

                                build_project(path.join(vscode.workspace.rootPath, val), []);
                            });
                }
            }
        );
    }
};

exports.build = trigger_build;



// TODO: Options for configurations and parameters