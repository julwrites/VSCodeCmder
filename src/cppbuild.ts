import { Memento, OutputChannel } from 'vscode';
import { ChildProcess } from 'child_process';
import { windows, linux, darwin } from './globals';
var vscode = require('vscode');
var fs = require('fs');
var path = require('path');
var ansi = require('ansi-colors');
var globals = require('./globals.js');
var commandExists = require('command-exists');
var spawn = require('cross-spawn');

var build_tool: string;
var build_ext: string[];

var ext_map: Record<string, string[]> = {
    'msbuild': ['.sln', '.vcxproj'],
    'make': ['Makefile'],
    'xcode': ['.xcode', 'xcodeproj']
};

// var ignore: string[] = [
//     "CMakeFiles", ".git"
// ];

function log_output(results: string, prefix: string) {
    let outputChannel = globals.OBJ_OUTPUT;

    // We let IBM Output Colorizer handle coloring
    let output = ansi.unstyle(results as string).trim();

    outputChannel.appendLine(prefix + '\t' + output);
}

function build_project(path: string, params: string[]) {
    let outputChannel: OutputChannel = globals.OBJ_OUTPUT;

    outputChannel.show();
    outputChannel.clear();

    params = [path].concat(params);

    log_output(build_tool + params.join(' '), '[command]');

    let child: ChildProcess = spawn(build_tool, params);

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');

    child.stdout.on('data', (data: string) => { log_output(data, '[build]\t'); });
    child.stderr.on('data', (data: string) => { log_output(data, '[error]\t'); });

    child.stdout.on('error', (err: Error) => { log_output(err.message, '[fatal]\t'); });
    child.stderr.on('error', (err: Error) => { log_output(err.message, '[fatal]\t'); });

    child.stdout.on('end', (data: string) => { log_output(data, '[end]\t'); });
    child.stderr.on('end', (data: string) => { log_output(data, '[end]\t'); });

    child.on('error', (err: Error) => { log_output(err.message, '[error]\t'); });
    child.on('close', (code: number, signal: string) => { log_output(signal + ' ' + code, '[end]\t'); });
}

function build_proj_list_recursive(startPath: string) {
    console.log('Checking files from ' + startPath);

    let projList: string[] = [];

    try {
        fs.readdirSync(startPath).forEach((file: string) => {
            file = path.join(startPath, file);

            // for (let value of ignore) {
            //     if (file.includes(value)) {
            //         return;
            //     }
            // }

            for (let value of build_ext) {
                if (file.includes(value) &&
                    (file.length === (file.lastIndexOf(value) + value.length))) {
                    projList.push(file);
                }
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

function build_proj_list(startPath: string, projList: string[]) {
    console.log('Entry point for recursive directory listing');

    if (projList.length !== 0) {
        return projList;
    }

    startPath = path.join(startPath, path.sep);
    projList = build_proj_list_recursive(startPath);

    projList = projList.map(function (file: string) {
        return file.replace(startPath, '');
    });

    return projList;
}

function load_proj_list(startPath: string) {
    return new Promise(
        (fulfill, reject) => {
            console.log('Building directory listing for VS projects');

            try {
                let projList = build_proj_list(startPath, []);

                fulfill(projList);
            } catch (error) {
                reject();
            }
        });
}

var load = function (state: Memento) {
    console.log('Indexing the workspace folder');

    return new Promise(
        (fulfill, reject) => {
            // If we don't have a workspace (no folder open) don't load anything
            if (vscode.workspace.rootPath !== undefined) {
                try {
                    console.log('Start building the project list');
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
                                state.update(globals.TAG_CPPPROJ, projList);
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

function check_build_tool(valid_tools: string[]) {
    for (let value of valid_tools) {
        build_tool = value;

        if (commandExists.sync(build_tool)) {
            return true;
        }
    }

    vscode.window.showErrorMessage('Could not find ' + valid_tools.join(', '));
    return false;
}

function windows_build_env() {
    return check_build_tool(['msbuild']);
}

function linux_build_env() {
    return check_build_tool(['make']);
}

function darwin_build_env() {
    return check_build_tool(['xcode', 'make']);
}


function build_env() {
    if (windows() && windows_build_env()) {
        build_ext = ext_map[build_tool];
    }
    else if (linux() && linux_build_env()) {
        build_ext = ext_map[build_tool];
    }
    else if (darwin() && darwin_build_env()) {
        build_ext = ext_map[build_tool];
    }
    else { return false; }

    return true;
}

var trigger_build = function (state: Memento) {
    console.log('Starting up C++ Build');

    vscode.window.setStatusBarMessage('Scanning for build tools', globals.TIMEOUT);

    if (build_env()) {

        load(state).then(
            () => {
                let root: string = <string><any>state.get(globals.TAG_ROOTPATH);
                let start: string = vscode.workspace.rootPath === undefined ? (root === undefined ? '' : root) : vscode.workspace.rootPath;
                let projList: string[] = <string[]><any>state.get(globals.TAG_CPPPROJ);

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

                                build_project(path.join(start, val), []);
                            });
                }
            }
        );
    }
};

exports.build = trigger_build;



// TODO: Options for configurations and parameters