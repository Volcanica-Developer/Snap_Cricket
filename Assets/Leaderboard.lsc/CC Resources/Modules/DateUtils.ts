export function getUTCTime(date: Date): number {
    //return date.getTime() + date.getTimezoneOffset() * 60 * 1000;
    return date.getTime();
}

export function getIdFromUTCTime(utcTime: number, challengeDurationMS: number, offset: number): number {
    return Math.floor((utcTime + offset) / challengeDurationMS);
}

export function getMilisecondsToFinish(utcStartTime: number, challengeDurationMS: number, challengeId: number, utcCurrentTime: number): number {
    return challengeDurationMS * (challengeId + 1) + utcStartTime - utcCurrentTime;
}

export function constructLeaderboardId(namePrefix: string, startDate: string, relativeIndex: string,
    durationOptionStr: string, scoreOrderingStr: string): string {
    return "".concat(namePrefix, startDate, relativeIndex, durationOptionStr, scoreOrderingStr);
}

export function isDateStringValid(dateString: string): boolean {
    return !isNaN(Date.parse(dateString));
}

export function convertMilisecondsToDateString(miliseconds: number): string {
    if (miliseconds < 0) {
        return "";
    }

    const days = Math.floor(miliseconds / (24 * 60 * 60 * 1000));
    miliseconds = miliseconds % (24 * 60 * 60 * 1000);
    const hours = Math.floor(miliseconds / (60 * 60 * 1000));
    miliseconds = miliseconds % (60 * 60 * 1000);
    const minutes = Math.floor(miliseconds / (60 * 1000));

    return `${days}d ${hours}h ${minutes}m`;
}
