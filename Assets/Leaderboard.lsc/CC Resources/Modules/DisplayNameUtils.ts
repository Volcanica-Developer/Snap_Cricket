// Version 1.0.0
const unicodeUtils = require("./UnicodeUtils");

function formatDisplayName(displayName, maxLength) {
    if (isNull(displayName)) {
        return "";
    }

    if (displayName.length > maxLength) {
        const nameSplitted = displayName.split(" ");
        displayName = nameSplitted.length > 0 ? nameSplitted[0] : displayName;
    }

    if (displayName.length > maxLength) {
        displayName = unicodeUtils.ellipsizeEnd(displayName, maxLength);
    }

    return displayName;
}

export = {
    formatDisplayName,
};
