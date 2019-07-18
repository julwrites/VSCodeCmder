import {ChildProcess} from 'child_process';
import {Memento, OutputChannel, WorkspaceConfiguration} from 'vscode';

import {darwin, linux, resolve_env, windows} from './global';

var vscode = require('vscode');
var fs = require('fs');
var path = require('path');
var ansi = require('ansi-colors');
var global = require('./global.js');
var spawn = require('cross-spawn');

interface Command {
  path: string;
  name: string;
}

function Command(path: string, name: string): Command {
  return {
    path: path,
    name: name,
  };
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

  let child: ChildProcess = spawn(
      cmd.path, args,
      {cwd: cwd, detached: true, shell: true, windowsHide: true});

  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');

  child.stdout.on('data', (data: string) => {
    log_output(data);
  });
  child.stderr.on('data', (data: string) => {
    log_output(data);
  });

  child.stdout.on('error', (err: Error) => {
    log_output(err.message);
  });
  child.stderr.on('error', (err: Error) => {
    log_output(err.message);
  });

  child.stdout.on('end', (data: string) => {
    log_output(data);
  });
  child.stderr.on('end', (data: string) => {
    log_output(data);
  });
}

function find_run_cmd(name: string) {
  for (let item of cmd_map) {
    if (item.name.includes(name)) {
      vscode.window.showInputBox({prompt: 'Enter directory to run from'})
          .then((cwd: string) => {
            if (cwd === undefined) {
              return;
            }

            vscode.window.showInputBox({prompt: 'Enter parameters'})
                .then((val: string) => {
                  if (val !== undefined) {
                    let args: string[] = [];
                    args = args.concat(val.split(' '));

                    run_cmd(item, cwd, args);
                  }
                });
          });

      return;
    }
  }
}

function load_cfg() {
  let config: WorkspaceConfiguration = vscode.workspace.getConfiguration(
      global.TAG_CODECMDER + '.' + global.TAG_COMMANDS);

  cmd_map = [];

  for (let key in config) {
    let value: string = <string><any>config.get(key);

    try {
      if (null === spawn.sync(value).error) {
        // Add to path, set command name to key
        cmd_map.push(Command(value, key));
      } else {
        let stat = fs.statSync(value);
        if (stat.isFile()) {
          // Add to path, set command name to key
          cmd_map.push(Command(value, key));
        }
      }
    } catch (error) {
      console.log(error);
    }
  }

  if (cmd_map.length === 0) {
    vscode.window.showErrorMessage('Could not find any commands to run');
    return false;
  }

  return true;
}

var trigger_cmd = function(state: Memento) {
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

    vscode.window.showQuickPick(cmdList).then((val: string) => {
      if (val === undefined) {
        return;
      }

      find_run_cmd(val);
    });
  }
};

var open_cli = function(state: Memento, cwd: string|undefined) {
  console.log('Starting up external CLI');

  if (cwd === undefined) {
    vscode.window
        .showInputBox(
            {prompt: 'Please enter the Working Directory or escape to skip'})
        .then((val: string) => {
          if (val !== undefined) {
            open_cli(state, val);
          } else {
            open_cli(state, '');
          }
        });

    // Return early if cwd not defined
    return;
  }

  cwd = resolve_env(cwd);

  let config: WorkspaceConfiguration =
      vscode.workspace.getConfiguration('terminal.external');

  var shell: string = '';

  if (windows() && config.has('windowsExec')) {
    shell = <string><any>config.get('windowsExec');
  } else if (darwin() && config.has('osxExec')) {
    shell = <string><any>config.get('osxExec');
  } else if (linux() && config.has('linuxExec')) {
    shell = <string><any>config.get('linuxExec');
  }

  if (shell !== '') {
    shell = resolve_env(shell);

    let cmd: Command = {name: 'Terminal', path: shell};

    run_cmd(cmd, <string>cwd, []);
  }
};

exports.run_cmd = trigger_cmd;
exports.run_cli = open_cli;
