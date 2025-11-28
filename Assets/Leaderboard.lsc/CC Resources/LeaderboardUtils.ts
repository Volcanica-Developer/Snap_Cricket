export function isSameUserEntry(entryA, entryB) {
    if (!isNull(entryA) && !isNull(entryB) && !isNull(entryA.snapchatUser) && !isNull(entryB.snapchatUser) &&
        entryA.snapchatUser.isSame(entryB.snapchatUser)) {
        return true;
    }
    return false;
}
