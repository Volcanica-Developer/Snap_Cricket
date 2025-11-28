import {
    LeaderboardDetails,
    LeaderboardInitializationOptions, LeaderboardParams,
    LeaderboardRecordsWrapper, ScoreResetIntervalOption, TestScenario
} from "./Interfaces/LeaderboardRelated";
import { CachedEvent } from "./Modules/CachedEvent";
import { BitmojiStickerLoader } from "./BitmojiStickerLoader";
import {
    constructLeaderboardId,
    getIdFromUTCTime,
    getMilisecondsToFinish,
    getUTCTime,
    isDateStringValid
} from "./Modules/DateUtils";
import { LeaderboardStorageScoresTracker } from "./LeaderboardStorageScoresTracker";
import { TokenManager } from "./TokenManager";
import { isSameUserEntry } from "./LeaderboardUtils";
import UsersType = Leaderboard.UsersType;
import { LeaderboardConstants } from "./Interfaces/LeaderboardConstants";

enum ScoreLifetimeSeconds {
    Day = 86400,
    Week = 604800,
    Month = 2592000,
    Year = 31104000
}

export const ScoreLifetimeOptionsToScoreLifetimeSeconds = {
    [ScoreResetIntervalOption.Day]: ScoreLifetimeSeconds.Day,
    [ScoreResetIntervalOption.Week]: ScoreLifetimeSeconds.Week,
    [ScoreResetIntervalOption.Month]: ScoreLifetimeSeconds.Month,
    [ScoreResetIntervalOption.Year]: ScoreLifetimeSeconds.Year,
};

export const ScoreLifetimeOptionsToResetString = {
    [ScoreResetIntervalOption.Day]: LeaderboardConstants.FullLeaderboard.DAILY_RESET_STRING,
    [ScoreResetIntervalOption.Week]: LeaderboardConstants.FullLeaderboard.WEEKLY_RESET_STRING,
    [ScoreResetIntervalOption.Month]: LeaderboardConstants.FullLeaderboard.MONTHLY_RESET_STRING,
    [ScoreResetIntervalOption.Year]: LeaderboardConstants.FullLeaderboard.YEARLY_RESET_STRING,
};

export enum DebugMode {
    None = 0,
    SubmitScore = 1,
    EntriesCount = 2,
}

@component
export class LeaderboardCore extends BaseScriptComponent {

    @input('boolean', 'true')
    protected readonly autoInitialize: boolean;

    @ui.label('You can find an example of initialization here: <a href="https://developers.snap.com/lens-studio/features/games/leaderboard#initializeWithOptions">developers.snap.com/&hellip;/leaderboard</a>')
    @showIf('autoInitialize', false)

    @input('string', '')
    @hint('Changing leaderboard name will reset scores')
    @showIf('autoInitialize', true)
    protected readonly leaderboardName: string;

    @input('int', '10')
    @hint('Maximum user limit is 50')
    @showIf('autoInitialize', true)
    protected userLimit: number;

    @input('int', '3')
    @label("Score Reset Interval")
    @showIf('autoInitialize', true)
    @widget(new ComboBoxWidget()
        .addItem('Day', 0)
        .addItem('Week', 1)
        .addItem('Month', 2)
        .addItem('Year', 3))
    protected readonly scoreLifetimeOption: ScoreResetIntervalOption;

    @input('string', '12/31/2024')
    @label("Score Reset Anchor")
    @hint('In format mm/dd/yyyy, this is the start date for the recurring score reset interval.<br>For example, if you select "Week" as the Score Reset Interval and set this date to 12/31/2024, the leaderboard will reset every week on Tuesday.')
    @showIf('autoInitialize', true)
    protected readonly leaderboardStartDate: string;

    @input('int', '1')
    @widget(new ComboBoxWidget()
        .addItem('Descending', 1)
        .addItem('Ascending', 2))
    @showIf('autoInitialize', true)
    private readonly scoreOrdering: Leaderboard.OrderingType;

    @input
    @hint('Please enter bitmoji sticker id or leave empty to use selfie sticker')
    protected customStickerId: string;

    @ui.separator

    @input
    protected readonly bitmojiModule: BitmojiModule;

    @input
    protected readonly remoteMediaModule: RemoteMediaModule;

    @input
    private readonly leaderboardModule: LeaderboardModule;

    @input("int", "0")
    @widget(new ComboBoxWidget()
        .addItem("None", 0)
        .addItem("Submit score", 1)
        .addItem("Custom entries count", 2))
    protected debugMode: DebugMode;

    @input("int", "10")
    protected readonly entriesCount: number;

    @input("int", "100")
    @showIf("debugMode", 1)
    protected readonly scoreToSubmit: number;

    @input("bool", "true")
    @label("Print Info")
    protected printDebugStatements: boolean;

    @input("bool", "true")
    @label("Print Warnings")
    protected printWarningStatements: boolean;

    public ScoreResetIntervalOption = ScoreResetIntervalOption;

    public readonly onLeaderboardRecordsUpdated: CachedEvent<LeaderboardRecordsWrapper> = new CachedEvent();
    public readonly onScoreSubmittedSuccess: CachedEvent<LeaderboardRecordsWrapper> = new CachedEvent();

    protected readonly userType: Leaderboard.UsersType = Leaderboard.UsersType.Friends;
    protected useTimer: boolean = true;

    private bitmojiStickerLoaderInstance: BitmojiStickerLoader;
    private currentUserPromise: Promise<SnapchatUser>;
    private currentUserBitmojiPromise: Promise<Texture>;
    private getLeaderboardPromise: Promise<Leaderboard>;
    private currentUserResolver: Function;
    private currentUserBitmojiResolver: Function;
    private getLeaderboardResolver: Function;
    private getLeaderboardRejecter: Function;
    private leaderboard: Leaderboard = null;
    protected leaderboardParams: LeaderboardParams = null;
    protected currentUserRecord: Leaderboard.UserRecord = null;
    protected allMergedRecords: Leaderboard.UserRecord[] = [];
    private updateEvent: UpdateEvent = null;
    private userBitmojiTexture: Texture = null;
    private tokenManager: TokenManager = new TokenManager();

    onAwake() {
        if (!global.deviceInfoSystem.isEditor()) {
            this.debugMode = DebugMode.None;
        }

        this.currentUserPromise = new Promise<SnapchatUser>((resolve, reject) => {
            this.currentUserResolver = resolve;
        });

        this.currentUserBitmojiPromise = new Promise<Texture>((resolve, reject) => {
            this.currentUserBitmojiResolver = resolve;
        });

        this.getLeaderboardPromise = new Promise<Leaderboard>((resolve, reject) => {
            this.getLeaderboardResolver = resolve;
            this.getLeaderboardRejecter = reject;
        });

        this.updateEvent = this.createEvent("UpdateEvent");
        this.updateEvent.enabled = false;
        this.updateEvent.bind(() => this.onUpdate());

        this.adjustUserLimit();

        if (this.autoInitialize) {
            this.initializeLeaderboard({
                name: this.leaderboardName,
                userType: this.userType,
                scoreOrdering: this.scoreOrdering,
                scoreResetInterval: this.scoreLifetimeOption,
                userLimit: this.userLimit,
                useTimer: this.useTimer,
                leaderboardStartDate: this.leaderboardStartDate,
            });
        }
    }

    public submitScore(score: number): void {
        this.printDebug("Submitting score " + score);
        if (!isNull(this.leaderboard)) {
            this.leaderboard.submitScore(
                score,
                (currentUserRecord) => this.onSubmitScoreSuccess(currentUserRecord),
                (status) => this.onSubmitScoreFailed(status),
            );
        }
    }

    public submitScoreAsync(score: number): Promise<void> {
        this.printDebug("Submitting score " + score);
        return this.getLeaderboardPromise.then((leaderboard) => {
            return new Promise<void>((resolve, reject) => {
                leaderboard.submitScore(
                    score,
                    (currentUserRecord) => {
                        this.onSubmitScoreSuccess(currentUserRecord);
                        resolve();
                    },
                    (status) => {
                        this.onSubmitScoreFailed(status);
                        reject();
                    },
                );
            });
        });
    }

    public async getLeaderboard(): Promise<Leaderboard> {
        return this.getLeaderboardPromise;
    }

    public async getCurrentUser(): Promise<SnapchatUser> {
        return this.currentUserPromise;
    }

    public async getCurrentUserBitmoji(): Promise<Texture> {
        if (isNull(this.currentUserRecord)) {
            this.bitmojiStickerLoader.loadForUser(null, '').then((texture) => {
                this.userBitmojiTexture = texture;
                this.currentUserBitmojiResolver(texture);
            });
        }

        return this.currentUserBitmojiPromise;
    }

    protected get bitmojiStickerLoader(): BitmojiStickerLoader {
        if (isNull(this.bitmojiStickerLoaderInstance)) {
            this.bitmojiStickerLoaderInstance = new BitmojiStickerLoader(this.bitmojiModule, this.remoteMediaModule);
        }
        return this.bitmojiStickerLoaderInstance;
    }

    public initializeWithOptions(initializationOptions: LeaderboardInitializationOptions): void {
        if (this.autoInitialize) {
            throw new Error("Please remove Auto Initialize from component inputs");
        }

        this.initializeLeaderboard(initializationOptions);
    }

    protected initializeLeaderboard(initializationOptions: LeaderboardInitializationOptions): void {
        initializationOptions.userLimit = initializationOptions.userLimit ?? this.userLimit;
        if (isNull(initializationOptions.userType) ||
            isNull(initializationOptions.scoreOrdering) ||
            isNull(initializationOptions.userLimit) ||
            isNull(initializationOptions.scoreResetInterval) ||
            isNull(initializationOptions.useTimer) ||
            isNull(initializationOptions.name)
        ) {
            this.printWarning("LeaderboardInitializationOptions are incorrect");
            throw new Error("LeaderboardInitializationOptions are incorrect");
        }

        if (!initializationOptions.useTimer && !initializationOptions.name.trim().length) {
            throw new Error("Please provide leaderboard name");
        }

        if (initializationOptions.useTimer && isNull(initializationOptions.leaderboardStartDate)) {
            throw new Error("Please provide leaderboard start date");
        }

        this.useTimer = initializationOptions.useTimer;
        const ttlSeconds = ScoreLifetimeOptionsToScoreLifetimeSeconds[initializationOptions.scoreResetInterval];
        const scoreOrdering = initializationOptions.scoreOrdering;
        const userType = initializationOptions.userType;

        const details = this.createNewLeaderboardDetails(initializationOptions.leaderboardStartDate,
            initializationOptions.name,
            ttlSeconds,
            initializationOptions.scoreResetInterval,
            scoreOrdering);

        if (this.autoInitialize) {
            initializationOptions.name = details.leaderboardId;
        }

        const leaderboardParams = {
            leaderboardName: initializationOptions.name,
            ttlSeconds: ttlSeconds,
            scoreLifetimeOption: initializationOptions.scoreResetInterval,
            orderingType: scoreOrdering,
            userType: userType,
            userLimit: initializationOptions.userLimit,
            leaderboardDetails: initializationOptions.useTimer ? details : null,
            leaderboardNamePrefix: initializationOptions.name,
        };

        this.createLeaderboard(leaderboardParams);
        this.updateEvent.enabled = true;
    }

    protected isInputValid(): boolean {
        if (this.leaderboardName.trim() === "") {
            this.printWarning("Please set leaderboard name. Important: changing leaderboard name will reset scores");
            return false;
        }

        if (!isDateStringValid(this.leaderboardStartDate)) {
            this.printWarning("Please set correct date format, for example 12/31/2024");
            return false;
        }
        return true;
    }

    public createNewLeaderboardDetails(
        leaderboardStartDateString: string, leaderboardNamePrefix: string, scoreLifetimeSeconds: number,
        scoreLifetimeOption: ScoreResetIntervalOption, scoreOrdering: Leaderboard.OrderingType
    ): LeaderboardDetails {

        const currentDate = new Date();
        const scoreLifetimeMillis = scoreLifetimeSeconds * 1000;

        const parsedStartDate = new Date(Date.parse(leaderboardStartDateString));

        const offsetDateMillis = (Date.UTC(parsedStartDate.getFullYear(), parsedStartDate.getMonth(), parsedStartDate.getDate(), 0, 0, 0, 0));

        const leaderboardRelativeIndex = getIdFromUTCTime(getUTCTime(currentDate), scoreLifetimeMillis, -offsetDateMillis);

        const leaderboardDetails = {
            currentDate: currentDate,
            offsetDateMillis: offsetDateMillis,
            leaderboardRelativeIndex: leaderboardRelativeIndex,
            leaderboardId: constructLeaderboardId(leaderboardNamePrefix,
                leaderboardStartDateString,
                leaderboardRelativeIndex.toString(),
                scoreLifetimeOption.toString(),
                scoreOrdering.toString()),
            timeToFinish: getMilisecondsToFinish(offsetDateMillis,
                scoreLifetimeMillis,
                leaderboardRelativeIndex,
                getUTCTime(currentDate)),
            leaderboardStartDate: leaderboardStartDateString,
        };
        return leaderboardDetails;
    }

    private updateLeaderboardDetails(): void {
        if (isNull(this.leaderboardParams.leaderboardDetails)) {
            return;
        }

        const currentDate = new Date();
        const timeToFinishMs = getMilisecondsToFinish(this.leaderboardParams.leaderboardDetails.offsetDateMillis,
            this.leaderboardParams.ttlSeconds * 1000,
            this.leaderboardParams.leaderboardDetails.leaderboardRelativeIndex,
            getUTCTime(currentDate));

        if (timeToFinishMs <= 0) {
            this.reset();
            this.recreateLeaderboard();
            return;
        }

        this.leaderboardParams.leaderboardDetails.timeToFinish = timeToFinishMs;
    }

    protected adjustUserLimit(): void {
        if (this.userType === UsersType.Friends) {
            if (this.userLimit > LeaderboardConstants.Component.USER_LIMIT_FRIENDS) {
                this.printWarning("User limit was set to max value = " + LeaderboardConstants.Component.USER_LIMIT_FRIENDS);
            }
            this.userLimit = MathUtils.clamp(this.userLimit, 0, LeaderboardConstants.Component.USER_LIMIT_FRIENDS);
        } else if (this.userType === UsersType.Global) {
            if (this.userLimit > LeaderboardConstants.Component.USER_LIMIT_GLOBAL) {
                this.printWarning("User limit was set to max value = " + LeaderboardConstants.Component.USER_LIMIT_GLOBAL);
            }
            this.userLimit = MathUtils.clamp(this.userLimit, 0, LeaderboardConstants.Component.USER_LIMIT_GLOBAL);
        }
    }

    private createLeaderboard(leaderboardParameters: LeaderboardParams): void {
        if (this.leaderboardParams !== null && this.leaderboardParams.token) {
            this.tokenManager.dismissToken(this.leaderboardParams.token);
        }
        const newToken = this.tokenManager.generateToken();
        leaderboardParameters.token = newToken;

        this.leaderboardParams = leaderboardParameters;

        const leaderboardCreateOptions = Leaderboard.CreateOptions.create();
        leaderboardCreateOptions.name = leaderboardParameters.leaderboardName;
        leaderboardCreateOptions.ttlSeconds = leaderboardParameters.ttlSeconds;
        leaderboardCreateOptions.orderingType = leaderboardParameters.orderingType;

        LeaderboardStorageScoresTracker.getInstance().setActiveLeaderboardName(this.leaderboardParams.leaderboardName);

        this.leaderboardModule.getLeaderboard(leaderboardCreateOptions, (leaderboard: Leaderboard) => {
            if (!this.tokenManager.isTokenValid(newToken)) {
                return;
            }
            this.printDebug("Leaderboard retrieved!");
            const retrievalOptions = this.createLeaderboardRetrievalOption(leaderboardParameters);
            this.leaderboard = leaderboard;
            this.getLeaderboardResolver(leaderboard);
            this.leaderboard.getLeaderboardInfo(retrievalOptions, (others, currentUser) => this.onLeaderboardInfoRetrievedSuccessful(others, currentUser, newToken), (status) => this.onLeaderboardInfoRetrievedFailed(status));
        }, () => {
            this.getLeaderboardRejecter();
            this.printWarning("Leaderboard retrieval failed");
        });
    }

    private addEntriesIfDoesntExist(leaderboardRecords: Leaderboard.UserRecord[], currentUserRecord: Leaderboard.UserRecord): void {
        for (let i = 0; i < leaderboardRecords.length; i++) {
            let isEntryKnown = false;

            for (let j = 0; j < this.allMergedRecords.length; j++) {
                if (isSameUserEntry(this.allMergedRecords[j], leaderboardRecords[i])) {
                    this.allMergedRecords[j] = leaderboardRecords[i];
                    isEntryKnown = true;
                    break;
                }
            }
            if (!isEntryKnown) {
                this.allMergedRecords.push(leaderboardRecords[i]);
            }
        }

        if (!isNull(currentUserRecord)) {
            let isCurrentUserInRecords = false;
            for (let i = 0; i < this.allMergedRecords.length; i++) {
                if (isSameUserEntry(this.allMergedRecords[i], currentUserRecord)) {
                    isCurrentUserInRecords = true;
                    this.allMergedRecords[i] = currentUserRecord;
                    break;
                }
            }

            if (!isCurrentUserInRecords) {
                this.allMergedRecords.push(currentUserRecord);
            }
        }
    }

    private sortByScore(leaderboardRecords: Leaderboard.UserRecord[], orderingType: Leaderboard.OrderingType) {
        const compareFn: (a: Leaderboard.UserRecord, b: Leaderboard.UserRecord) => number = orderingType === Leaderboard.OrderingType.Descending ?
            (a, b) => b.score - a.score : (a, b) => a.score - b.score;
        leaderboardRecords.sort(compareFn);

        if (this.leaderboardParams.userType === UsersType.Global) {
            const compareFnGlobalRank = (a, b) => a.globalExactRank - b.globalExactRank;
            leaderboardRecords.sort(compareFnGlobalRank);
        }
    }

    protected onCurrentUserBitmojiLoaded(texture: Texture): void {
        this.currentUserBitmojiResolver(texture);
        this.userBitmojiTexture = texture;
    }

    private loadBitmojiIfNotLoaded(): void {
        if (!isNull(this.userBitmojiTexture)) {
            return;
        }

        const isCurrentUserObjectPresent = !isNull(this.currentUserRecord) && !isNull(this.currentUserRecord.snapchatUser);
        const hasBitmoji = isCurrentUserObjectPresent &&
            !isNull(this.currentUserRecord.snapchatUser.hasBitmoji) && this.currentUserRecord.snapchatUser.hasBitmoji;

        if (!hasBitmoji && isCurrentUserObjectPresent) {
            return;
        }

        const currentUser = isCurrentUserObjectPresent ? this.currentUserRecord.snapchatUser : null;

        this.bitmojiStickerLoader.loadForUser(currentUser, this.customStickerId ?? '')
            .then((texture) => this.onCurrentUserBitmojiLoaded(texture))
            .catch((e) => {
                this.printDebug("Error loading bitmoji: " + e.message);
            });
    }

    protected onSubmitScoreSuccess(currentUserRecord: Leaderboard.UserRecord) {
        this.printDebug("onSubmitScoreSuccess");
        this.onCurrentUserRecordUpdated(currentUserRecord);
        this.updateScoresState();
        this.onScoreSubmittedSuccess.trigger({
            userRecords: this.allMergedRecords,
            currentUserRecord: this.currentUserRecord,
        });
    }

    protected onSubmitScoreFailed(status: number) {
        this.printDebug("onSubmitScoreFailed");
    }

    private onCurrentUserRecordUpdated(currentUserRecord: Leaderboard.UserRecord): void {
        if (isNull(currentUserRecord)) {
            return;
        }

        this.currentUserRecord = currentUserRecord;

        if (!isNull(this.currentUserRecord) && !isNull(this.currentUserRecord.snapchatUser)) {
            this.bitmojiStickerLoader.updateStorageWithCurrentUser(this.currentUserRecord.snapchatUser);
        }

        this.loadBitmojiIfNotLoaded();

        this.addEntriesIfDoesntExist([], currentUserRecord);
        this.sortByScore(this.allMergedRecords, this.leaderboardParams.orderingType);
    }

    private updateScoresState(): void {
        this.onLeaderboardRecordsUpdated.trigger({
            userRecords: this.allMergedRecords,
            currentUserRecord: this.currentUserRecord,
        });

        if (!isNull(this.currentUserRecord) && !isNull(this.currentUserRecord.snapchatUser)) {
            this.currentUserResolver(this.currentUserRecord.snapchatUser);
        }
    }

    protected onLeaderboardInfoRetrievedSuccessful(otherRecords: Leaderboard.UserRecord[], currentUserRecord: Leaderboard.UserRecord, token: number) {
        if (!this.tokenManager.isTokenValid(token)) {
            return;
        }

        if (this.debugMode != DebugMode.None && this.entriesCount === 0) {
            currentUserRecord = null;
        }

        this.onCurrentUserRecordUpdated(currentUserRecord);

        if (this.debugMode != DebugMode.None) {
            this.addEntriesIfDoesntExist(otherRecords.slice(0, Math.max(this.entriesCount - 1, 0)), currentUserRecord);
        } else {
            this.addEntriesIfDoesntExist(otherRecords, currentUserRecord);
        }

        this.sortByScore(this.allMergedRecords, this.leaderboardParams.orderingType);
        this.updateScoresState();

        if (this.debugMode === DebugMode.SubmitScore && this.entriesCount > 0) {
            this.submitScore(this.scoreToSubmit);
        }
    };

    protected onLeaderboardInfoRetrievedFailed(status) {
        this.printDebug("Failed to retrieve scores. Status = " + status);
    };

    private createLeaderboardRetrievalOption(leaderboardParameters: LeaderboardParams): Leaderboard.RetrievalOptions {
        const leaderboardRetrievalOption = Leaderboard.RetrievalOptions.create();
        leaderboardRetrievalOption.usersLimit = leaderboardParameters.userLimit;
        leaderboardRetrievalOption.usersType = leaderboardParameters.userType;

        return leaderboardRetrievalOption;
    }

    private reset() {
        this.currentUserRecord = null;
        this.allMergedRecords = [];
    }

    protected recreateLeaderboard(): void {
        this.leaderboardParams.leaderboardDetails = this.createNewLeaderboardDetails(this.leaderboardParams.leaderboardDetails.leaderboardStartDate,
            this.leaderboardParams.leaderboardNamePrefix,
            this.leaderboardParams.ttlSeconds,
            this.leaderboardParams.scoreLifetimeOption,
            this.leaderboardParams.orderingType);

        this.leaderboardParams.leaderboardName = this.leaderboardParams.leaderboardDetails.leaderboardId;

        this.createLeaderboard(this.leaderboardParams);
    }

    protected onUpdate(): void {
        this.updateLeaderboardDetails();
    }

    protected printDebug(message: string): void {
        if (this.printDebugStatements) {
            print(this.getSceneObject().name + " - " + message);
        }
    }

    protected printWarning(message: string): void {
        if (this.printWarningStatements) {
            print(this.getSceneObject().name + " - WARNING, " + message);
        }
    }
}
