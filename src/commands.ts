import { Memento, OutputChannel, Uri, FileSystemWatcher, WorkspaceConfiguration } from 'vscode';
import { ChildProcess } from 'child_process';
var vscode = require('vscode');
var fs = require('fs');
var path = require('path');
var ansi = require('ansi-colors');
var global = require('./global.js');
var spawn = require('cross-spawn');

class Command {
    path: string;
    name: string;

    constructor(path: string, cmd: string, name: string) {
        this.path = path;
        this.name = name;
    }
}
var cmd_map: Command[] = [];

function log_output(results: string) {
    let outputChannel = global.OBJ_OUTPUT;

    // We let IBM Output Colorizer handle coloring
    let output = ansi.unstyle(results as string).trim();

    outputChannel.appendLine(output);
}

function run_cmd(cmd: Command, cwd: string, args: string[]) {
    let outputChannel: OutputChannel = global.OBJ_OUTPUT;

    outputChannel.show();
    outputChannel.clear();

    log_output([cmd.path].concat(args).join(' '));

    cwd = path.join(vscode.workspace.rootPath, cwd);

    let child: ChildProcess = spawn(cmd.path, args, { cwd: cwd });

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');

    child.stdout.on('data', (data: string) => { log_output(data); });
    child.stderr.on('data', (data: string) => { log_output(data); });

    child.stdout.on('error', (err: Error) => { log_output(err.message); });
    child.stderr.on('error', (err: Error) => { log_output(err.message); });

    child.stdout.on('end', (data: string) => { log_output(data); });
    child.stderr.on('end', (data: string) => { log_output(data); });
}

function find_run_cmd(name: string) {
    for (let item of cmd_map) {
        if (item.name.includes(name)) {
            vscode.window.showInputBox({ prompt: 'Enter directory to run from' }).then(
                (cwd: string) => {
                    if (cwd === undefined) {
                        return;
                    }

                    vscode.window.showInputBox({ prompt: 'Enter parameters' }).then(
                        (val: string) => {
                            if (val !== undefined) {
                                let args: string[] = [];
                                args = args.concat(val.split(" "));

                                run_cmd(item, cwd, args);
                            }
                        }
                    );
                }
            );

            return;
        }
    }
}

function load_cfg() {
    let config: WorkspaceConfiguration = vscode.workspace.getConfiguration(global.TAG_CODECMDER + "." + global.TAG_COMMANDS);

    cmd_map = [];

    for (let key in config) {
        let value: string = <string><any>config.get(key);

        if (value !== undefined) {
            if (null === spawn.sync(value).error) {
                // Add to path, set command name to key
                cmd_map.push(new Command(value, value, key));
            } else {
                let stat = fs.statSync(value);
                if (stat.isFile()) {
                    // Add to path, set command name to key
                    cmd_map.push(new Command(value, key, key));
                }
            }
        }
    }

    if (cmd_map.length === 0) {
        vscode.window.showErrorMessage('Could not find any commands to run');
        return false;
    }

    return true;
}

var trigger_cmd = function (state: Memento) {
    console.log('Starting up Command Parser and Runner');

    vscode.window.setStatusBarMessage('Scanning for commands', global.TIMEOUT);

    if (load_cfg()) {

        let cmdList: string[] = [];
        for (let cmd of cmd_map) {
            cmdList.push(cmd.name);
        }

        if (cmdList.length === 0) {
            vscode.window.showErrorMessage('Could not find any commands to run');
            return;
        }

        vscode.window.showQuickPick(cmdList)
            .then(
                (val: string) => {
                    if (val === undefined) {
                        return;
                    }

                    find_run_cmd(val);
                });
    }
};

exports.run_cmd = trigger_cmd;


