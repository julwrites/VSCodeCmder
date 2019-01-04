import { Memento, OutputChannel, Uri, FileSystemWatcher, WorkspaceConfiguration } from 'vscode';
import { ChildProcess } from 'child_process';
import { darwin } from './global';
var vscode = require('vscode');
var fs = require('fs');
var path = require('path');
var ansi = require('ansi-colors');
var global = require('./global.js');
var spawn = require('cross-spawn');
var ignore = require('ignore');

var build_tool: string = "";
var build_cmd: string = "";
var build_ext: RegExp[] = [];
var ignore_rules: string[] = [];

class Project {
    path: string;
    proj: string;
    name: string;

    constructor(path: string, proj: string, name: string) {
        this.path = path;
        this.proj = proj;
        this.name = name;
    }
}
var proj_map: Project[] = [];

var msbuild: string = 'msbuild';
var make: string = 'make';
var xcode: string = 'xcodebuild';

var opt_map: Record<string, string[]> = {
    msbuild: [],
    make: ['-f'],
    xcodebuild: ['-scheme']
};

var suf_map: Record<string, string[]> = {
    msbuild: [],
    make: [],
    xcodebuild: ['build']
};

var rgx_map: Record<string, RegExp[]> = {
    msbuild: [/\.(sln|vcxproj)$/],
    make: [/\/(Makefile)$/, /^(Makefile)$/],
    xcodebuild: [/\.(xcodeproj)$/]
};

function log_output(results: string) {
    let outputChannel = global.OBJ_OUTPUT;

    // We let IBM Output Colorizer handle coloring
    let output = ansi.unstyle(results as string).trim();

    outputChannel.appendLine(output);
}

function build_project(proj: Project, params: string[]) {
    let outputChannel: OutputChannel = global.OBJ_OUTPUT;

    outputChannel.show();
    outputChannel.clear();

    params = opt_map[build_tool].concat([proj.proj]).concat(suf_map[build_tool]).concat(params);

    let options: Object = {};
    if (proj.path.length !== 0) { options = { cwd: proj.path }; }

    log_output([build_cmd].concat(params).join(' '));

    let child: ChildProcess = spawn(build_cmd, params, options);

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');

    child.stdout.on('data', (data: string) => { log_output(data); });
    child.stderr.on('data', (data: string) => { log_output(data); });

    child.stdout.on('error', (err: Error) => { log_output(err.message); });
    child.stderr.on('error', (err: Error) => { log_output(err.message); });

    child.stdout.on('end', (data: string) => { log_output(data); });
    child.stderr.on('end', (data: string) => { log_output(data); });
}

function find_build_project(name: string, params: string[]) {
    for (let item of proj_map) {
        if (item.name.includes(name)) {
            build_project(item, params);

            return;
        }
    }
}

function is_proj(path: string) {
    for (let value of build_ext) {
        if (null !== path.match(value)) {
            return true;
        }
    }
    return false;
}

function get_proj(path: string) {
    let list: string[] = [];

    if (darwin() && build_tool === xcode) {
        let result: string[] = (<Buffer><any>spawn.sync(build_tool, ['-list', '-project', path]).stdout).toString().split('\n');

        let start: number = -1;
        for (let i = 0; i < result.length; i++) {
            const line: string = result[i];
            if (line !== undefined && line.includes('Schemes:')) {
                start = i; break;
            }
        }

        if (start !== -1) {
            for (let i = start + 1; i < result.length; i++) {
                const line: string = <string><any>result[i];
                if (line.length !== 0) {
                    list.push(line.trim());
                }
            }
        }

        return list;
    }

    return [path];
}

// Assume uri is full path and proj is the name of the project to be run
// Generates a Project object
function itemize_proj(uri: string, proj: string) {
    if (darwin() && build_tool === xcode) {
        return new Project(
            path.dirname(uri),
            proj,
            path.join(path.dirname(path.relative(vscode.workspace.rootPath, uri)), proj));
    }

    return new Project(
        '',
        uri,
        path.relative(vscode.workspace.rootPath, uri));
}

function proj_names(projMap: Project[]) {
    let projList: string[] = [];
    for (let proj of projMap) {
        projList.push(proj.name);
    }

    return projList;
}

function filter_proj(projMap: Project[]) {
    let projList: string[] = proj_names(projMap);

    projList = ignore().add(ignore_rules).filter(projList);

    projList.sort((left: string, right: string) => {
        var count = (str: string) => {
            return (str.split(path.sep)).length;
        };

        return count(left) - count(right);
    }
    );

    let outMap: Project[] = [];

    for (let proj of projMap) {
        if (projList.includes(proj.name)) {
            outMap.push(proj);
        }
    }

    return outMap;
}

function build_proj_map_recursive(startPath: string) {
    console.log('Checking files from ' + startPath);

    let projList: Project[] = [];

    try {
        fs.readdirSync(startPath).forEach((file: string) => {
            file = path.join(startPath, file);

            if (is_proj(file)) {
                for (let proj of get_proj(file)) {
                    projList.push(itemize_proj(file, proj));
                }
            }

            if (fs.statSync(file).isDirectory()) {
                projList = projList.concat(build_proj_map_recursive(file));
            }
        });
    } catch (error) {
        console.log(error);
    }

    return projList;
}

function load_proj_map() {
    return new Promise(
        (fulfill, reject) => {
            console.log('Building directory listing for VS projects');

            try {
                proj_map = build_proj_map_recursive(vscode.workspace.rootPath);

                proj_map = filter_proj(proj_map);

                fulfill(proj_names(proj_map));
            } catch (error) {
                reject();
            }
        });
}

function fileCreated(e: Uri) {
    let filePath = e.fsPath;

    console.log(filePath + ' created');

    if (is_proj(filePath)) {
        for (let proj of get_proj(filePath)) {
            let item: Project = itemize_proj(filePath, proj);

            if (!proj_map.includes(item)) {
                proj_map.push(item);
            }
        }
    }

    proj_map = filter_proj(proj_map);
}

function fileDeleted(e: Uri) {
    let filePath = e.fsPath;

    console.log(filePath + ' deleted');

    for (let proj of get_proj(filePath)) {
        let item: Project = itemize_proj(filePath, proj);

        proj_map.splice(proj_map.indexOf(item), 1);
    }
}


function load(state: Memento) {
    console.log('Indexing the workspace folder');

    return new Promise(
        (fulfill, reject) => {
            // If we don't have a workspace (no folder open) don't load anything
            if (vscode.workspace.rootPath !== undefined) {
                // If it is already loaded, pass the cached value
                if (proj_map.length !== 0) {
                    fulfill(proj_names(proj_map));
                    return;
                }

                try {
                    console.log('Start building the project list');
                    return load_proj_map().then(
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
        if (null === spawn.sync(value).error) {
            build_tool = value;
            build_cmd = value;

            return true;
        }
    }

    vscode.window.showErrorMessage('Could not find ' + valid_tools.join(', '));
    return false;
}

function load_ignore_cfg() {
    let config: WorkspaceConfiguration = vscode.workspace.getConfiguration(global.TAG_CODECMDER);

    if (config.has(global.TAG_IGNORE)) {
        return <string[]><any>config.get(global.TAG_IGNORE);
    }

    return [];
}

function load_env() {
    if (!try_cfg([msbuild, xcode, make]) && !try_cmd([msbuild, xcode, make])) {
        return false;
    }

    build_ext = rgx_map[build_tool];
    ignore_rules = load_ignore_cfg();

    return true;
}

var trigger_build = function (state: Memento) {
    console.log('Starting up C++ Build');

    vscode.window.setStatusBarMessage('Scanning for build tools', global.TIMEOUT);

    if (load_env()) {

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

                                find_build_project(val, []);
                            });
                }
            }
        );
    }
};

exports.build = trigger_build;



// TODO: Options for configurations and parameters