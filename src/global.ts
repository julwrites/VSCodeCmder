import { OutputChannel, FileSystemWatcher, Memento } from "vscode";

// Global defines
export let TIMEOUT: number = 5000;
export let MRU_MAX: number = 5;
export let DEFAULT_DEPTH: number = 2;
// State tags
export let TAG_CODECMDER: string = 'codecmder';
export let TAG_MRULIST: string = 'codecmder.recent';
export let TAG_BOOKMARKS: string = 'codecmder.bookmarks';
export let TAG_CPPPROJ: string = 'codecmder.cppproj';
export let TAG_BUILDTOOL: string = 'codecmder.buildTools';
export let TAG_IGNORE: string = 'ignore';
export let TAG_SETTINGS: string = 'settings';
export let TAG_COMMANDS: string = 'commands';
// Strings
export let STR_BOOKMARK: string = 'Bookmark: ';
export let STR_MRULIST: string = 'Recently Opened: ';
export let STR_CODECMDER: string = 'VSCodeCmder';
// Shared objects
export let OBJ_STATE: Memento;
export let OBJ_OUTPUT: OutputChannel;
export let OBJ_CPPPROJ_WATCHER: FileSystemWatcher;


export function windows() {
    return require('os').platform().indexOf('win') > -1;
}

export function linux() {
    return require('os').platform().indexOf('linux') > -1;
}

export function darwin() {
    return require('os').platform().indexOf('darwin') > -1;
}



