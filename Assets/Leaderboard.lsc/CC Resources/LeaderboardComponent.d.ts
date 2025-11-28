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

interface Tooltip extends BaseScriptComponent {
    autostart: boolean,
    label: string,
    show(): void,
    hide(): void,
    direction: "Left"|"Right"|"Top"|"Bottom",
}

interface SideSwitcher extends ScriptComponent {
    switchToNext(): void
    switchTo(icon: number): void
    show(): void
    hide(): void
    disableIconBackground(): void
    enableIconBackground(): void
    enableInteractable(): void
    disableInteractable(): void
    tooltip?: Tooltip
    visible: boolean
    activeIconIndex: number
    eventTag: string
    iconOpacity: number
    backgroundOpacity: number
    icons: Texture[]

    onSwitch: Event<number>
    onShow: Event<number>
    onHide: Event<number>
}

declare class LeaderboardComponent extends BaseScriptComponent {
    submitScore(score: number): void
    show(duration?: number): void
    hide(duration?: number): void
    initializeWithOptions(leaderboardInitializationOptions: LeaderboardInitializationOptions): void
    getLeaderboard(): Promise<Leaderboard>
    getCurrentUser(): Promise<SnapchatUser>
    getCurrentUserBitmoji(): Promise<Texture>
    getSideSwitcher(): SideSwitcher
    showScoreWidget(duration?: number): void
    hideScoreWidget(duration?: number): void
    setLeaderboardName(name: string): void
    visible: boolean
    isScoreWidgetReady: boolean

    //Events:
    onLeaderboardRecordsUpdated: Event<LeaderboardRecordsWrapper>
    onShow: Event
    onHide: Event
    onShown: Event
    onHidden: Event
}
