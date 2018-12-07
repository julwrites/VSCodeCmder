import { Memento, OutputChannel } from 'vscode';
import { ChildProcess } from 'child_process';
import { win } from './globals';
var vscode = require('vscode');
var fs = require('fs');
var path = require('path');
var ansi = require('ansi-colors');
var globals = require('./globals.js');
var commandExists = require('command-exists');
var spawn = require('cross-spawn');

function log_output(results: string, prefix: string) {
    let outputChannel = globals.OBJ_OUTPUT;

    let output = ansi.unstyle(results as string).trim();

    if (output.toLowerCase().includes(' warning ')) {
        output = ansi.yellow(output);
    }
    else if (output.toLowerCase().includes(' error ')) {
        output = ansi.red(output);
    }

    outputChannel.appendLine(prefix + '\t' + output);
}

var build_tool: string = win() ? 'msbuild' : 'make';
var build_proj: string[] = win() ? ['.sln', '.vcxproj'] : ['Makefile'];

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

            build_proj.forEach((value: string) => { if (file.includes(value)) { projList.push(file); } });

            let stats = fs.statSync(file);
            if (stats.isDirectory()) {
                build_proj_list_recursive(file).forEach((file) => {
                    if (file.includes('.sln') || (file.includes('.vcxproj') && !file.includes('.vcxproj.'))) {
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
                let projList: string[] = <string[]><any>state.get(globals.TAG_VCXPROJS);
                if (projList !== undefined && projList.length !== 0) {
                    fulfill();
                    return;
                }

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
    console.log('Starting up MSBuild Trigger');

    vscode.window.setStatusBarMessage('Scanning for msbuild', globals.TIMEOUT);

    commandExists('msbuild', function (err: Error, commandExists: boolean) {
        if (err || !commandExists) {
            vscode.window.showErrorMessage('Could not find msbuild');
        }

        load(state).then(
            () => {
                let root: string = <string><any>state.get(globals.TAG_ROOTPATH);
                let start: string = vscode.workspace.rootPath === undefined ? (root === undefined ? '' : root) : vscode.workspace.rootPath;
                let projList: string[] = <string[]><any>state.get(globals.TAG_VCXPROJS);

                if (projList !== undefined) {
                    if (projList.length === 0) {
                        vscode.window.showErrorMessage('Could not find any Visual Studio projects to build');
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
    });
};

exports.build = trigger_build;



// TODO: Options for configurations and parameters