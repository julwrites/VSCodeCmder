import { Memento, OutputChannel, Uri, FileSystemWatcher, WorkspaceConfiguration } from 'vscode';
import { ChildProcess } from 'child_process';
import { darwin } from './global';
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

function run_cmd(cmd: Command, params: string[]) {
    let outputChannel: OutputChannel = global.OBJ_OUTPUT;

    outputChannel.show();
    outputChannel.clear();

    log_output([cmd.path].concat(params).join(' '));

    let child: ChildProcess = spawn(cmd.path, params);

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
            let params: string[] = [];

            // TODO: Have some mechanisms to read in params

            run_cmd(item, params);

            return;
        }
    }
}

function load_cfg() {
    let config: WorkspaceConfiguration = vscode.workspace.getConfiguration(global.TAG_CODECMDER);

    cmd_map = [];

    if (config.has(global.TAG_COMMANDS)) {

        let cmdList: string = <string><any>config.get(global.TAG_COMMANDS);

        for (let value of cmdList) {
            let cmdPath: string = <string><any>config.get(value);

            let stat = fs.statSync(cmdPath);
            if (stat.isFile()) {
                // Add to path, set command name to key
            }

            if (null === spawn.sync(value).error) {
                // Set command as path as well as name
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


