"use strict";

const DefaultSettings = {
    loginDelay: 1500
};

// from_ver, to_ver = version number; settings = "old settings"
module.exports = function MigrateSettings(from_ver, to_ver, settings) {
    let defaultCopy = Object.assign({}, DefaultSettings);
    if (from_ver === null) {
        // No config file exists or corrupted file, use default settings
        return DefaultSettings;
    } else if (from_ver === undefined) {
        // Migrate legacy config file
        return Object.assign(defaultCopy, settings);
    }
};

function notEmptyObject(obj) {
    return obj !== null && typeof obj === 'object' && Object.keys(obj).length;
}

// only set add -> add
// only set remove -> remove
// set both -> replace/update
const commitsByVersion = new Map([
    [1, { add: { loginDelay: 1500 }, remove: {} }]
]);
