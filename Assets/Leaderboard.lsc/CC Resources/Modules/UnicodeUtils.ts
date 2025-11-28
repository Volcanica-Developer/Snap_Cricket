// Version 0.5.3
const ELLIPSIS = "…";

function ellipsizeEnd(name: string | null, length: number): string | null {
    if (name == null) {
        return name;
    }
    if (name == "") {
        return name;
    }
    if (length <= 0) {
        return "";
    }
    name = name.trim();
    const utfName = decodeUTF16(name);
    if (utfName.length <= length) {
        return name;
    }
    return utfName.slice(0, length - 3).join("")
        .trim() + ELLIPSIS;
}

function decodeUTF16(str: string): string[] {
    let output: string[] = [];
    let charCodes: number[] = [];
    let i = 0;
    function pushCharCodes(s: number, l: number) {
        for (let j = 0; j < l; ++j) {
            charCodes.push(str.charCodeAt(s + j));
        }
    }
    let previousCharIsJoiner = false;
    while (i < str.length) {
        const cc = str.charCodeAt(i);
        const cp = str.codePointAt(i);
        const len = codePointToLength(cp);
        if (!previousCharIsJoiner &&
            ((len === 1 && !isJoinerOrSuffix(cc)) || (len !== 1 && !isSkinToneModifier(cp)))) {
            // Previous sequence is terminated
            if (charCodes.length > 0) {
                output.push(String.fromCodePoint.apply(null, charCodes));
            }
            // Wipe previous sequence
            charCodes = [];
            // Push the char codes from i to (i + len) into charCodes
            pushCharCodes(i, len);
        } else {
            // Either this is a 2-byte joiner code, or it is part of an Emoji ZWJ sequence or a national flag, or it is a skin tone modifier.
            // So push the char codes into charCodes
            pushCharCodes(i, len);
        }
        i += len;
        previousCharIsJoiner = len === 1 && cc === ZWJ;
    }
    // Get the last character
    if (charCodes.length > 0) {
        output.push(String.fromCodePoint.apply(null, charCodes));
    }
    // Second pass: check for TAG characters and merge them into TAG sequence
    if (output.length > 1) {
        const output2 = [];
        let tagSequence = '';
        let isTagSequence = false;
        for (let t = 0; t < output.length; ++t) {
            const cpt = output[t].codePointAt(0);
            if (isTagSequence) {
                // Look for CANCEL TAG to terminate the sequence
                if (cpt === CANCEL_TAG) {
                    // Add the whole sequence to output2
                    tagSequence += output[t];
                    output2.push(tagSequence);
                    tagSequence = '';
                    isTagSequence = false;
                } else {
                    tagSequence += output[t];
                }
            } else {
                if (isTag(cpt)) {
                    tagSequence = output2.pop();
                    tagSequence += output[t];
                    isTagSequence = true;
                } else {
                    output2.push(output[t]);
                }
            }
        }
        if (tagSequence.length > 0) {
            // ill-formed emoji tag sequence, but push it anyway...
            output2.push(tagSequence);
        }
        output = output2;
    }
    // Third pass: check for regional indicators and merge them into flag sequence
    if (output.length > 1) {
        const output3 = [];
        let j = 1;
        while (j < output.length) {
            const cp1 = output[j - 1].codePointAt(0);
            const cp2 = output[j].codePointAt(0);
            if (isRegionalIndicator(cp1) && isRegionalIndicator(cp2)) {
                output3.push(output[j - 1] + output[j]);
                j += 2;
            } else {
                output3.push(output[j - 1]);
                j += 1;
            }
        }
        if (j === output.length) {
            // Push the last character
            output3.push(output[j - 1]);
        }
        output = output3;
    }
    return output;
}
;
const ZWJ = 0x200d;
const KEY_CAP = 0x20e3;
const VAR_SEL_16 = 0xfe0f;
const VAR_SEL_15 = 0xfe0e;
function isJoinerOrSuffix(code) {
    return code === ZWJ || code === KEY_CAP || code === VAR_SEL_16 || code === VAR_SEL_15;
}
const SKIN_TONE_TYPE12 = 0x1f3fb;
const SKIN_TONE_TYPE3 = 0x1f3fc;
const SKIN_TONE_TYPE4 = 0x1f3fd;
const SKIN_TONE_TYPE5 = 0x1f3fe;
const SKIN_TONE_TYPE6 = 0x1f3ff;
function isSkinToneModifier(cp) {
    return (cp === SKIN_TONE_TYPE12 ||
        cp === SKIN_TONE_TYPE3 ||
        cp === SKIN_TONE_TYPE4 ||
        cp === SKIN_TONE_TYPE5 ||
        cp === SKIN_TONE_TYPE6);
}
function isRegionalIndicator(cp) {
    return cp >= 0x1f1e6 && cp <= 0x1f1ff;
}
const CANCEL_TAG = 0xe007f;
function isTag(cp) {
    return cp >= 0xe0020 && cp <= 0xe007e;
}
function codePointToLength(cp) {
    if (cp < 0x10000) {
        return 1;
    } else {
        return 2;
    }
}
export = {
    decodeUTF16,
    ellipsizeEnd,
};
