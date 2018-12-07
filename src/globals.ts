// Global defines
exports.TIMEOUT = 5000;
exports.MRU_MAX = 5;
exports.DEFAULT_DEPTH = 2;
// State tags
exports.TAG_ROOTPATH = 'codecmder.rootPath';
exports.TAG_MRULIST = 'codecmder.recent';
exports.TAG_BOOKMARKS = 'codecmder.bookmarks';
exports.TAG_CPPPROJ = 'codecmder.cppproj';
// Strings
exports.STR_BOOKMARK = 'Bookmark: ';
exports.STR_MRULIST = 'Recently Opened: ';
exports.STR_CPPPROJ = 'Project: ';
exports.STR_CODECMDER = 'VSCodeCmder';
// Shared objects
exports.OBJ_OUTPUT = undefined;


export function windows() {
    return require('os').platform().indexOf('win') > -1;
}

export function linux() {
    return require('os').platform().indexOf('linux') > -1;
}

export function darwin() {
    return require('os').platform().indexOf('darwin') > -1;
}



