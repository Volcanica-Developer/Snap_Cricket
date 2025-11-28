export enum ScoreResetIntervalOption {
    Day = 0,
    Week = 1,
    Month = 2,
    Year = 3
}

export type LeaderboardInitializationOptions = {
    name: string;
    userType: Leaderboard.UsersType;
    scoreOrdering: Leaderboard.OrderingType;
    scoreResetInterval: ScoreResetIntervalOption;
    userLimit: number;
    useTimer: boolean;
    leaderboardStartDate?: string; // format "mm/dd/yyyy"
};

export type LeaderboardRecordsWrapper = {
    userRecords: Leaderboard.UserRecord[]
    currentUserRecord: Leaderboard.UserRecord | null
}

declare class LeaderboardInfo extends BaseScriptComponent {
    submitScore(score: number): void
    initializeWithOptions(initializationOptions: LeaderboardInitializationOptions): void
    getLeaderboard(): Promise<Leaderboard>
    getCurrentUser(): Promise<SnapchatUser>
    getCurrentUserBitmoji(): Promise<Texture>
    // Events
    onLeaderboardRecordsUpdated: Event<LeaderboardRecordsWrapper>
    onScoreSubmittedSuccess: Event<LeaderboardRecordsWrapper>
}
