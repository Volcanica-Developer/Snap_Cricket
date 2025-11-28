import UserRecord = Leaderboard.UserRecord;
import UsersType = Leaderboard.UsersType;
import OrderingType = Leaderboard.OrderingType;

export enum ScoreResetIntervalOption {
    Day = 0,
    Week = 1,
    Month = 2,
    Year = 3
}

export enum BackgroundCustomization {
    None,
    Bitmoji,
    Texture,
}

export enum TestScenario {
    None,
    ScoreSubmit,
    ScoresWidget
}

export enum HeaderOption {
    None,
    Title,
    TopScore,
}

export enum HighScoreWidgetOption {
    Delay,
    Manual
}

export enum EndStateOption {
    None,
    SideSwitcher,
    Leaderboard,
}

export enum ScoresWidgetType {
    SingleSticker,
    TwoStickers,
    ThreeStickers,
}

export interface ILeaderboardVisual {
    visualiseEntries(otherRecords: Leaderboard.UserRecord[], currentUserRecord: Leaderboard.UserRecord): void
    setBitmoji(bitmojiTexture): void
    show(): void
    hide(): void
}

export interface IScoreWidgetControl {
    setActiveWidget(widgetId: number): void
    setBitmojiTetxures(bitmojiTexturesArray: Texture[]): void
    setCurrentUserScoreAndEnableVisual(score: number): void
    setAlpha(alpha: number): void
    getAlpha(): number
    setFriendsPlayedText(text: string): void
}

export interface LeaderboardBackground extends ScriptComponent {
    getEntriesScreenTransform(): ScreenTransform
    getEntriesHeaderScreenTransform(): ScreenTransform
    getEntriesTouchZoneScreenTransform(): ScreenTransform
    getEntriesParentScreenTransform(): ScreenTransform
    getEntriesFooterScreenTransform(): ScreenTransform
    getBackgroundCustomisationScreenTransform(): ScreenTransform
    getTouchZoneInteraction(): InteractionComponent
    getEntriesSceneObject(): SceneObject
    getTouchZoneSceneObject(): SceneObject
    getInvisibleMaterial(): Material
    getAlpha(): number
    setCurrentUserRecord(userRecord: Leaderboard.UserRecord): void
    setHeaderEnabled(enabled: boolean): void
    setFooterEnabled(enabled: boolean): void
    setRegularHeaderChildEnabled(enabled: boolean): void
    setFixedSizedTextureHeader(bitmoji: Texture): void
    setBitmojiTextureHeader(bitmoji: Texture): void
    setPostEffectsEnabled(enabled: boolean): void
    setLeaderboardName(name: string): void
    setTimeLeftText(text: string): void
    setResetText(text: string): void
    setTimerUiEnabled(enabled: boolean): void
    setHeaderTopScore(topScore: number): void
    setMaskingRadius(radius: number): void
    setAlpha(alpha: number): void
}

export interface IFullLeaderboard extends ILeaderboardVisual {
    setLeaderboardName(name: string): void
}

export interface IScoresWidget {
    visualiseEntries(otherRecords: Leaderboard.UserRecord[], currentUserRecord: Leaderboard.UserRecord): void
}

export interface ILeaderboardEntry extends ScriptComponent {
    setEntryIndex(index: number): void;
    setUserRecord(userRecord: Leaderboard.UserRecord, isGlobalLeaderboard: boolean): void;
    setBitmoji(bitmoji: Texture | null): void
    setIsCurrentUserEntry(isCurrent: boolean): void
    setAlpha(alpha: number): void
}

export interface IDependencies extends ScriptComponent {
    getSideSwitcher(): CustomSideSwitcher
}

export type EntryWrapper = {
    leaderboardEntry: ILeaderboardEntry
    screenTransform: ScreenTransform
    sceneObject: SceneObject
    representingIndex: number
    isCurrentUser: boolean,
    bitmojiRequestId: number | null
}

export type LeaderboardRecordsWrapper = {
    userRecords: UserRecord[]
    currentUserRecord: UserRecord | null
}

export type StickerDataEntry = {
    snapchatUser: SnapchatUser,
    stickerMap: Map<string, Promise<Texture>>
}

export type LeaderboardDetails = {
    currentDate: Date | null;
    offsetDateMillis: number | null;
    leaderboardRelativeIndex: number | null;
    leaderboardId: string | null;
    timeToFinish: number | null;
    leaderboardStartDate: string;
};

export type LeaderboardInitializationOptions = {
    name: string
    userType: UsersType
    scoreOrdering: OrderingType
    scoreResetInterval: ScoreResetIntervalOption
    userLimit: number,
    useTimer: boolean,
    leaderboardStartDate?: string //format "mm/dd/yyyy"
}

export type LeaderboardParams = {
    leaderboardName: string
    ttlSeconds: number
    scoreLifetimeOption: ScoreResetIntervalOption
    orderingType: OrderingType
    userType: UsersType
    userLimit: number
    leaderboardDetails: LeaderboardDetails | null,
    leaderboardNamePrefix: string,
    token?: number
}
