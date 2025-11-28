export class LeaderboardStorageScoresTracker {
    private static instance: LeaderboardStorageScoresTracker;
    private store: GeneralDataStore;
    private activeFormattedLeaderboardName: string;
    private uniqueLeaderboardKeyPrefix: string = "300LB]";

    private constructor() {
        this.store = global.persistentStorageSystem.store;
        this.store.onStoreFull = this.onStorageFull;
    }

    static getInstance(): LeaderboardStorageScoresTracker {
        if (!this.instance) {
            this.instance = new LeaderboardStorageScoresTracker();
        }
        return this.instance;
    }

    setActiveLeaderboardName(formattedLeaderboardName: string): void {
        formattedLeaderboardName = this.convertToLeaderboardName(formattedLeaderboardName);
        this.activeFormattedLeaderboardName = formattedLeaderboardName;
    }

    getLeaderboardLastChecksumOrNull(formattedLeaderboardName: string): number {
        formattedLeaderboardName = this.convertToLeaderboardName(formattedLeaderboardName);
        const checksumExists = this.store.has(formattedLeaderboardName);
        if (!checksumExists) {
            return null;
        }
        return this.store.getInt(formattedLeaderboardName);
    }

    saveChecksum(checksum: number, formattedLeaderboardName: string): void {
        if (isNull(this.store)) {
            return;
        }

        formattedLeaderboardName = this.convertToLeaderboardName(formattedLeaderboardName);
        this.store.putInt(formattedLeaderboardName, checksum);

        if (!isNull(this.activeFormattedLeaderboardName)) {
            this.clearLeaderboardKeysExceptActive();
        }
    }

    private onStorageFull():void {
        this.clearLeaderboardKeysExceptActive();
    }

    private clearLeaderboardKeysExceptActive(): void {
        const keys = this.store.getAllKeys();
        keys.forEach(key => {
            if (this.isLeaderboardKeyString(key) && this.activeFormattedLeaderboardName !== key) {
                this.store.remove(key);
            }
        });
    }

    private isLeaderboardKeyString(key: string): boolean {
        return key.startsWith(this.uniqueLeaderboardKeyPrefix);
    }

    private convertToLeaderboardName(formattedLeaderboardName: string): string {
        return this.uniqueLeaderboardKeyPrefix.concat(formattedLeaderboardName);
    }
}
