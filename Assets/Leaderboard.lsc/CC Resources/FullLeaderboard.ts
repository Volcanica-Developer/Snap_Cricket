import { InertialAnimation } from './IntertialAnimation';
import { DestructionHelper } from './DestructionHelper';
import {
    copyAnchors,
    findParentComponent,
    getOrCreateScreenTransform,
    setRenderLayerRecursively,
    setRenderOrderRecursivelyRelativeToParent
} from './ComponentUtils';
import { LeaderboardConstants } from "./Interfaces/LeaderboardConstants";
import {
    BackgroundCustomization,
    EntryWrapper,
    HeaderOption,
    IFullLeaderboard,
    ILeaderboardEntry,
    LeaderboardBackground,
} from './Interfaces/LeaderboardRelated';
import { isSameUserEntry } from "./LeaderboardUtils";
import { BitmojiStickerLoader } from "./BitmojiStickerLoader";
import { FullLeaderboardAnimations } from "./FullLeaderboardAnimations";
import { convertMilisecondsToDateString } from "./Modules/DateUtils";
import UserRecord = Leaderboard.UserRecord;
import VISIBLE_ENTRIES_COUNT = LeaderboardConstants.FullLeaderboard.VISIBLE_ENTRIES_COUNT;
import ENTRIES_SAFE_REGION_SIZE_Y = LeaderboardConstants.FullLeaderboard.SETUP.ENTRIES_SAFE_REGION_SIZE_Y;
import FOOTER_SAFE_REGION_SIZE_Y = LeaderboardConstants.FullLeaderboard.SETUP.FOOTER_SAFE_REGION_SIZE_Y;
import HEADER_SAFE_REGION_SIZE_Y = LeaderboardConstants.FullLeaderboard.SETUP.HEADER_SAFE_REGION_SIZE_Y;
import INITIAL_ALPHA = LeaderboardConstants.FullLeaderboard.INITIAL_ALPHA;

type RecalculatedScreenSizes = {
    footerSizeY: number
    headerSizeY: number
    entriesSizeY: number
}

export class FullLeaderboard implements IFullLeaderboard {
    protected scrollAnimation: InertialAnimation;
    protected readonly screenTransform;
    private readonly destructionHelper = new DestructionHelper();
    protected activeTouchId = null;
    private entriesParent: SceneObject = null;
    private leaderboardBackground: LeaderboardBackground;
    private userRecords: UserRecord[] = [];
    private currentUserRecord: UserRecord = null;
    private entryWrappers: EntryWrapper[] = [];
    private readonly PRELOAD_ENTRY_COUNT: number = LeaderboardConstants.FullLeaderboard.PRELOAD_ENTRY_COUNT;
    private appliedScroll: vec2 = vec2.zero();
    private isHeaderEnabled = false;
    private isLeaderboardOpened: boolean = false;
    private outOfLeaderboardInteraction: InteractionComponent = null;
    private animations: FullLeaderboardAnimations = null;
    private isGlobalLeaderboard: boolean = false;
    private useTimer: boolean = true;
    private recalculatedScreenSizes: RecalculatedScreenSizes = {
        footerSizeY: 0,
        headerSizeY: 0,
        entriesSizeY: 0,
    };
    private entriesUpdateRequired: boolean = false;
    private lastSafeRenderSize: vec2 = new vec2(-1, -1);

    constructor(private readonly scriptComponent: ScriptComponent,
                private readonly leaderboardBackgroundPrefab: ObjectPrefab,
                private readonly leaderboardEntryPrefab: ObjectPrefab,
                private readonly onLeaderboardClosedCallback: Function,
                private readonly onLeaderboardOpenedCallback: Function,
                private readonly onLeaderboardClosingStartedCallback: Function,
                private readonly onLeaderboardOpeningStartedCallback: Function,
                private readonly renderOrder: number,
                private readonly bitmojiStickerLoader: BitmojiStickerLoader,
                backgroundCustomization: BackgroundCustomization,
                private readonly headerOption: HeaderOption = HeaderOption.None,
                private readonly useBlurEffect: boolean) {

        this.screenTransform = getOrCreateScreenTransform(this.scriptComponent.getSceneObject(), this.destructionHelper);
        this.screenTransform.anchors.setCenter(LeaderboardConstants.FullLeaderboard.INITIAL_PARENT_POSITION);

        this.scrollAnimation = this.createInertialAnimation(scriptComponent,
            LeaderboardConstants.InertialAnimation.MAX_SPEED,
            LeaderboardConstants.InertialAnimation.FRICTION,
            LeaderboardConstants.InertialAnimation.SNAP_DURATION,
            LeaderboardConstants.InertialAnimation.SPRINGNESS);
        this.scrollAnimation.enabled = false;

        const fullScreenParent = global.scene.createSceneObject("FullScreenParent");
        getOrCreateScreenTransform(fullScreenParent, this.destructionHelper);
        fullScreenParent.setParent(this.scriptComponent.getSceneObject());
        const fullFrame = fullScreenParent.createComponent("ScreenRegionComponent");
        fullFrame.region = ScreenRegionType.FullFrame;

        const leaderboardBackground = this.leaderboardBackgroundPrefab.instantiate(scriptComponent.getSceneObject());
        leaderboardBackground.enabled = true;

        const region = leaderboardBackground.createComponent("ScreenRegionComponent");
        region.region = ScreenRegionType.SafeRender;

        const safeRenderScreenTransform = region.getSceneObject().getComponent("ScreenTransform");

        this.recalculatedScreenSizes = {
            entriesSizeY: this.getDistanceFromLocalPointsScreenCoords(vec2.zero(), new vec2(0, ENTRIES_SAFE_REGION_SIZE_Y), safeRenderScreenTransform),
            footerSizeY: this.getDistanceFromLocalPointsScreenCoords(vec2.zero(), new vec2(0, FOOTER_SAFE_REGION_SIZE_Y), safeRenderScreenTransform),
            headerSizeY: this.getDistanceFromLocalPointsScreenCoords(vec2.zero(), new vec2(0, HEADER_SAFE_REGION_SIZE_Y), safeRenderScreenTransform),
        };

        this.leaderboardBackground = leaderboardBackground.getComponent("ScriptComponent") as LeaderboardBackground;

        this.animations = new FullLeaderboardAnimations(this, scriptComponent, this.screenTransform);

        this.entriesParent = this.leaderboardBackground.getEntriesSceneObject();

        this.initInteraction(fullScreenParent);
        this.setHeaderOption();
        this.leaderboardBackground.setPostEffectsEnabled(false);

        scriptComponent.createEvent("UpdateEvent").bind(() => {
            const safeRenderSize = safeRenderScreenTransform.anchors.getSize();
            if (!this.lastSafeRenderSize.equal(safeRenderSize)) {
                this.resizeEntriesParent(this.entryWrappers.length);
                this.lastSafeRenderSize = safeRenderSize;
            }

            if (this.entriesUpdateRequired) {
                this.entriesUpdateRequired = false;
                this.updateEntriesState();
            }
        });
        this.setMaskingRadiusBasedOnCanvas();
        this.setAlpha(INITIAL_ALPHA);
    }

    private setMaskingRadiusBasedOnCanvas() {
        const camera: Camera = findParentComponent(this.scriptComponent.getSceneObject(), 'Camera');
        const canvas = camera.getSceneObject().getComponent("Canvas");
        if (!isNull(canvas)) {
            if (canvas.unitType === Canvas.UnitType.World) {
                this.leaderboardBackground.setMaskingRadius(LeaderboardConstants.FullLeaderboard.MASKING_CORNER_RADIUS_WORLD);
            } else {
                this.leaderboardBackground.setMaskingRadius(LeaderboardConstants.FullLeaderboard.MASKING_CORNER_RADIUS_POINTS);
            }
        }
    }

    private getDistanceFromLocalPointsScreenCoords(from: vec2, to: vec2, screenTransform: ScreenTransform): number {
        const adjustedFrom = screenTransform.localPointToScreenPoint(from);
        const adjustedTo = screenTransform.localPointToScreenPoint(to);

        return adjustedFrom.distance(adjustedTo);
    }

    private getDistanceFromScreenPointsToParentCoords(from: vec2, to: vec2, screenTransform: ScreenTransform): number {
        const adjustedFrom = screenTransform.screenPointToParentPoint(from);
        const adjustedTo = screenTransform.screenPointToParentPoint(to);

        return adjustedFrom.distance(adjustedTo);
    }

    public setLeaderboardName(name: string): void {
        this.leaderboardBackground.setLeaderboardName(name);
    }

    public setBitmoji(bitmojiTexture: Texture): void {
        this.leaderboardBackground.setBitmojiTextureHeader(bitmojiTexture);
    }

    public setCustomTextureHeader(customTexture: Texture): void {
        this.leaderboardBackground.setFixedSizedTextureHeader(customTexture);
    }

    public show(duration?: number): void {
        this.animateLeaderboard(true, duration);
    }

    public hide(duration?: number) {
        this.animateLeaderboard(false, duration);
    }

    public visualiseEntries(leaderboardRecordsWithCurrentUser: Leaderboard.UserRecord[], currentUserRecord: Leaderboard.UserRecord): void {
        this.userRecords = leaderboardRecordsWithCurrentUser;
        this.currentUserRecord = currentUserRecord;

        if (leaderboardRecordsWithCurrentUser.length > 0 && this.headerOption === HeaderOption.TopScore) {
            this.leaderboardBackground.setHeaderTopScore(leaderboardRecordsWithCurrentUser[0].score);
        }

        this.resizeEntriesParent(leaderboardRecordsWithCurrentUser.length);
        const entryWrappersNeededCount = Math.min(this.PRELOAD_ENTRY_COUNT, leaderboardRecordsWithCurrentUser.length);
        this.fillEntriesWrappersToSize(entryWrappersNeededCount);
        this.updateEntriesState();
    }

    public setHeaderOption(): void {
        switch (this.headerOption) {
            case HeaderOption.Title:
                this.leaderboardBackground.setHeaderEnabled(true);
                this.leaderboardBackground.setRegularHeaderChildEnabled(true);
                break;
            case HeaderOption.TopScore:
                this.leaderboardBackground.setHeaderEnabled(true);
                this.leaderboardBackground.setRegularHeaderChildEnabled(true);
                break;
            case HeaderOption.None:
                this.leaderboardBackground.setRegularHeaderChildEnabled(false);
                this.leaderboardBackground.setHeaderEnabled(false);
                break;
        }
    }

    public setTimerUiEnabled(enabled: boolean): void {
        if (this.useTimer !== enabled) {
            this.useTimer = enabled;
            this.leaderboardBackground.setTimerUiEnabled(enabled);
            this.leaderboardBackground.setFooterEnabled(enabled);
            this.resizeEntriesParent(this.entryWrappers.length);
        }
    }

    public setTimerText(text: string): void {
        this.leaderboardBackground.setResetText(text);
    }

    public setTimeLeft(miliseconds: number): void {
        this.leaderboardBackground.setTimeLeftText(convertMilisecondsToDateString(miliseconds));
    }

    public setIsGlobalLeaderboard(isGlobalLeaderboard: boolean): void {
        this.isGlobalLeaderboard = isGlobalLeaderboard;
    }

    public getAlpha(): number {
        return this.leaderboardBackground.getAlpha();
    }

    public setAlpha(alpha: number): void {
        this.leaderboardBackground.setAlpha(alpha);
        this.entryWrappers.forEach((entryWrapper) => {
            entryWrapper.leaderboardEntry.setAlpha(alpha);
        });
    }

    private resizeEntriesParent(entriesCount: number): void {
        const hasFooter = this.useTimer;
        const hasHeader = this.headerOption === HeaderOption.Title || this.headerOption === HeaderOption.TopScore;

        if (!hasFooter) {
            this.recalculatedScreenSizes.footerSizeY = 0;
        }

        if (!hasHeader) {
            this.recalculatedScreenSizes.headerSizeY = 0;
        }

        const entriesCountToPlace = Math.min(entriesCount, VISIBLE_ENTRIES_COUNT);
        const entriesNeededScreenSizeY = this.recalculatedScreenSizes.entriesSizeY / VISIBLE_ENTRIES_COUNT * entriesCountToPlace;

        const ttlScreenSizeY = this.recalculatedScreenSizes.headerSizeY +
            + this.recalculatedScreenSizes.footerSizeY + entriesNeededScreenSizeY;

        const hasEntries = ttlScreenSizeY > 0;

        const entriesTouchZone = this.leaderboardBackground.getEntriesTouchZoneScreenTransform();
        const parentWithMask = this.leaderboardBackground.getEntriesParentScreenTransform();

        const leaderboardSizeLocalCoordsY = this.getDistanceFromScreenPointsToParentCoords(vec2.zero(), new vec2(0, ttlScreenSizeY), parentWithMask);
        parentWithMask.anchors.bottom = -0.96;
        parentWithMask.anchors.top = -0.96 + leaderboardSizeLocalCoordsY;

        copyAnchors(parentWithMask.anchors, entriesTouchZone.anchors);

        const bgCustomizationSize = this.leaderboardBackground.getBackgroundCustomisationScreenTransform().anchors.getSize();
        this.leaderboardBackground.getBackgroundCustomisationScreenTransform().anchors.bottom = parentWithMask.anchors.top;
        this.leaderboardBackground.getBackgroundCustomisationScreenTransform().anchors.top = parentWithMask.anchors.top + bgCustomizationSize.y;
        let currentTop = 1;

        if (hasFooter) {
            const footerScreenTransform = this.leaderboardBackground.getEntriesFooterScreenTransform();
            const footerSizeLocalCoordsY = this.getDistanceFromScreenPointsToParentCoords(vec2.zero(), new vec2(0, this.recalculatedScreenSizes.footerSizeY), footerScreenTransform);
            footerScreenTransform.anchors.bottom = -1;
            footerScreenTransform.anchors.top = -1 + footerSizeLocalCoordsY;
        }

        if (hasHeader) {
            const headerScreenTransform = this.leaderboardBackground.getEntriesHeaderScreenTransform();
            const headerSizeLocalCoordsY = this.getDistanceFromScreenPointsToParentCoords(vec2.zero(), new vec2(0, this.recalculatedScreenSizes.headerSizeY), headerScreenTransform);
            headerScreenTransform.anchors.bottom = 1 - headerSizeLocalCoordsY;
            headerScreenTransform.anchors.top = 1;
            currentTop -= headerSizeLocalCoordsY;
        }

        if (hasEntries) {
            const entriesScreenTransform = this.leaderboardBackground.getEntriesScreenTransform();
            const entriesSizeLocalCoordsY = this.getDistanceFromScreenPointsToParentCoords(vec2.zero(), new vec2(0, this.recalculatedScreenSizes.entriesSizeY), entriesScreenTransform);
            entriesScreenTransform.anchors.bottom = currentTop - entriesSizeLocalCoordsY;
            entriesScreenTransform.anchors.top = currentTop;
        }
    }

    private getRealIndex(representingIndex: number, userRecord: Leaderboard.UserRecord): number {
        if (!this.isGlobalLeaderboard) {
            return representingIndex + 1;
        }

        if (!isNull(userRecord) && !isNull(userRecord.globalExactRank) && userRecord.globalExactRank !== 0) {
            return userRecord.globalExactRank;
        }
        return representingIndex + 1;
    }

    private fillEntriesWrappersToSize(arraySize: number) {
        for (let i = this.entryWrappers.length; i < arraySize; i++) {
            this.entryWrappers.push(this.createEntry(i));
        }
        this.checkIfLeaderboardScrollable();
        this.setLeaderboardEntriesEnabledBasedOnPosition();
    }

    private updateEntriesState(): void {
        this.entryWrappers.forEach((entryWrapper) => {
            this.updateEntryData(entryWrapper, this.userRecords[entryWrapper.representingIndex]);
        });
    }

    private createEntry(entryIndex: number): EntryWrapper {
        const currentEntriesCount = this.entriesParent.children.length;
        const topRelativeLimit: number = LeaderboardConstants.FullLeaderboard.ENTRIES_LIMIT_TOP_POSITION_Y;

        const bottomPosition: number = topRelativeLimit - (currentEntriesCount + 1) * LeaderboardConstants.FullLeaderboard.ENTRY_SIZE_Y;
        const topPosition: number = topRelativeLimit - currentEntriesCount * LeaderboardConstants.FullLeaderboard.ENTRY_SIZE_Y;
        const entry = this.leaderboardEntryPrefab.instantiate(this.entriesParent);
        entry.enabled = true;

        setRenderOrderRecursivelyRelativeToParent(entry, this.renderOrder);
        setRenderLayerRecursively(entry, this.entriesParent.layer);

        const screenTransform = entry.getComponent("ScreenTransform");
        screenTransform.anchors.top = topPosition;
        screenTransform.anchors.bottom = bottomPosition;

        const leaderboardEntry = entry.getComponent("ScriptComponent") as ILeaderboardEntry;
        if (leaderboardEntry && !this.isLeaderboardOpened) {
            leaderboardEntry.setAlpha(INITIAL_ALPHA);
        }

        const entryWrapper: EntryWrapper = {
            sceneObject: entry,
            leaderboardEntry: leaderboardEntry,
            screenTransform: screenTransform,
            representingIndex: entryIndex,
            isCurrentUser: false,
            bitmojiRequestId: null
        };

        return entryWrapper;
    }

    private getOnComplete(toShow: boolean): () => void {
        if (!toShow) {
            return () => {
                this.onLeaderboardClosedCallback?.();
                this.outOfLeaderboardInteraction.enabled = false;
                this.isLeaderboardOpened = false;
            };
        } else {
            return () => {
                this.isLeaderboardOpened = true;
                this.outOfLeaderboardInteraction.enabled = true;
                this.onLeaderboardOpenedCallback?.();
            };
        }
    }

    private getOnStartCallback(toShow: boolean): () => void {
        if (!toShow) {
            return () => {
                this.onLeaderboardClosingStartedCallback?.();
            };
        } else {
            return () => {
                this.onLeaderboardOpeningStartedCallback?.();
            };
        }
    }

    private animateLeaderboard(toShow: boolean, duration?: number): void {
        const defaultDuration = toShow ? LeaderboardConstants.FullLeaderboard.ANIMATION.DURATION_SHOW : LeaderboardConstants.FullLeaderboard.ANIMATION.DURATION_HIDE;
        const animationDuration = isNull(duration) ? defaultDuration : duration;
        this.animations.playAnimation(toShow, this.getOnComplete(toShow), this.getOnStartCallback(toShow), animationDuration);

        if (this.useBlurEffect) {
            this.leaderboardBackground.setPostEffectsEnabled(toShow);
        }
    }

    private checkIfEntriesShouldBeShuffled(isScrollToTop: boolean): void {
        if (this.entryWrappers.length < 1) {
            return;
        }

        let lastEntry = this.entryWrappers[this.entryWrappers.length - 1];
        const indexAboveLimit = Math.floor(this.appliedScroll.y / LeaderboardConstants.FullLeaderboard.ENTRY_SIZE_Y);

        if (isScrollToTop) {
            while (indexAboveLimit > this.entryWrappers[0].representingIndex && lastEntry.representingIndex < this.userRecords.length - 1) {
                this.moveEntryFromHeadToTail(lastEntry);

                lastEntry = this.entryWrappers[this.entryWrappers.length - 1];
            }
        } else {
            let bottomEntryYCoord = lastEntry.screenTransform.anchors.getCenter().y;
            while (bottomEntryYCoord < LeaderboardConstants.FullLeaderboard.MIN_Y_COORD_TO_SHOW_ENTRY && this.entryWrappers[0].representingIndex > 0) {
                this.moveEntryFromTailToHead(this.entryWrappers[0]);
                bottomEntryYCoord = lastEntry.screenTransform.anchors.getCenter().y;
            }
        }
    }

    private moveEntryFromTailToHead(headEntry: EntryWrapper): void {
        const outOfBoundEntry = this.entryWrappers.pop();
        const positionToSet: vec2 = this.entryWrappers.length > 0 ?
            headEntry.screenTransform.anchors.getCenter().add(new vec2(0, LeaderboardConstants.FullLeaderboard.ENTRY_SIZE_Y))
            : outOfBoundEntry.screenTransform.anchors.getCenter();
        this.entryWrappers.unshift(outOfBoundEntry);

        outOfBoundEntry.representingIndex = headEntry.representingIndex - 1;
        outOfBoundEntry.screenTransform.anchors.setCenter(positionToSet);

        this.updateEntryData(outOfBoundEntry, this.userRecords[outOfBoundEntry.representingIndex]);
    }

    private moveEntryFromHeadToTail(tailEntry: EntryWrapper) {
        const outOfBoundEntry = this.entryWrappers.shift();
        const positionToSet: vec2 = this.entryWrappers.length > 0 ?
            tailEntry.screenTransform.anchors.getCenter().sub(new vec2(0, LeaderboardConstants.FullLeaderboard.ENTRY_SIZE_Y))
            : outOfBoundEntry.screenTransform.anchors.getCenter();

        this.entryWrappers.push(outOfBoundEntry);

        outOfBoundEntry.representingIndex = tailEntry.representingIndex + 1;
        outOfBoundEntry.screenTransform.anchors.setCenter(positionToSet);

        this.updateEntryData(outOfBoundEntry, this.userRecords[outOfBoundEntry.representingIndex]);
    }

    private updateEntryData(entry: EntryWrapper, userRecord: Leaderboard.UserRecord): void {
        const hasSetEntryIndex = typeof entry.leaderboardEntry?.setEntryIndex === 'function';
        if (!hasSetEntryIndex) {
            this.entriesUpdateRequired = true;
            return;
        }

        entry.leaderboardEntry.setEntryIndex(this.getRealIndex(entry.representingIndex, userRecord));
        entry.leaderboardEntry.setUserRecord(userRecord, this.isGlobalLeaderboard);

        this.bitmojiStickerLoader.dismissToken(entry.bitmojiRequestId);

        entry.leaderboardEntry.setBitmoji(null);

        if (!isNull(userRecord.snapchatUser)) {
            const bitmojiRequestId = this.bitmojiStickerLoader.generateToken();
            entry.bitmojiRequestId = bitmojiRequestId;

            this.bitmojiStickerLoader.loadForUser(userRecord.snapchatUser, '').then((texture: Texture) => {
                if (this.bitmojiStickerLoader.isTokenValid(bitmojiRequestId)) {
                    entry.leaderboardEntry.setBitmoji(texture);
                }
            })
                .catch(() => {
                    if (this.bitmojiStickerLoader.isTokenValid(bitmojiRequestId)) {
                        entry.leaderboardEntry.setBitmoji(null);
                    }
                });
        } else {
            entry.leaderboardEntry.setBitmoji(null);
        }

        const isCurrentUserEntry = isSameUserEntry(userRecord, this.currentUserRecord);
        entry.leaderboardEntry.setIsCurrentUserEntry(isCurrentUserEntry);
    }

    private checkIfLeaderboardScrollable(): void {
        this.scrollAnimation.enabled = this.entryWrappers.length >= LeaderboardConstants.FullLeaderboard.ENTRIES_NEEDED_FOR_SCROLL;
    }

    private createInertialAnimation(scriptComponent: ScriptComponent, maxSpeed: number, friction: number, snapDuration: number, springiness: number): InertialAnimation {
        return new InertialAnimation(scriptComponent, (delta) => {
            this.applyScroll(delta);
        }, () => {
        }, new vec2(0, 1), maxSpeed, friction, snapDuration);
    }

    private applyScroll(delta: vec2): void {
        if (this.entryWrappers.length <= 0) {
            return;
        }

        let offsetToApply = delta;
        if (delta.y > 0) {
            const bottomPositionInit = this.entryWrappers[this.entryWrappers.length - 1].screenTransform.anchors.getCenter();
            const bottomPositionAfterScroll = bottomPositionInit.add(delta);
            const bottomLimit = this.isHeaderEnabled ? LeaderboardConstants.FullLeaderboard.ENTRIES_BOTTOM_LIMIT_POSITION_HEADER : LeaderboardConstants.FullLeaderboard.ENTRIES_BOTTOM_LIMIT_POSITION_NO_HEADER;

            if (bottomPositionAfterScroll.y > bottomLimit) {
                offsetToApply = offsetToApply = new vec2(0, bottomLimit - bottomPositionInit.y);
            }
        } else {
            const topPositionInit = this.entryWrappers[0].screenTransform.anchors.getCenter();
            const topPositionAfterScroll = topPositionInit.add(delta);

            if (topPositionAfterScroll.y < LeaderboardConstants.FullLeaderboard.ENTRIES_TOP_LIMIT_POSITION) {
                offsetToApply = new vec2(0, LeaderboardConstants.FullLeaderboard.ENTRIES_TOP_LIMIT_POSITION - topPositionInit.y);
            }
        }

        this.applyOffset(offsetToApply);
        this.checkIfEntriesShouldBeShuffled(delta.y > 0);
    }

    private applyOffset(offset: vec2): void {
        this.entryWrappers.forEach((entryWrappers) => {
            let center = entryWrappers.screenTransform.anchors.getCenter();
            center = center.add(offset);
            entryWrappers.screenTransform.anchors.setCenter(center);
        });

        this.setLeaderboardEntriesEnabledBasedOnPosition();

        this.appliedScroll = this.appliedScroll.add(offset);
    }

    private setLeaderboardEntriesEnabledBasedOnPosition(): void {
        this.entryWrappers.forEach((entryWrappers) => {
            const center = entryWrappers.screenTransform.anchors.getCenter();

            if (center.y > LeaderboardConstants.FullLeaderboard.MAX_Y_COORD_TO_SHOW_ENTRY
                || center.y < LeaderboardConstants.FullLeaderboard.MIN_Y_COORD_TO_SHOW_ENTRY) {
                entryWrappers.sceneObject.enabled = false;
            } else {
                entryWrappers.sceneObject.enabled = true;
            }
        });
    }

    private initInteraction(fullFrameSo: SceneObject): void {
        const interaction = this.getOrCreateInteraction(this.leaderboardBackground.getTouchZoneSceneObject());
        interaction.isFilteredByDepth = true;

        interaction.onTouchStart.add(args => {
            if (!this.isInTouchZone(args.position)) return;
            if (this.activeTouchId == null) {
                this.activeTouchId = args.touchId;
                this.scrollAnimation.onTouchStart(this.screenPointToLocalPoint(args.position));
            }
        });
        interaction.onTouchMove.add(args => {
            if (this.activeTouchId == args.touchId) {
                this.scrollAnimation.onTouchMove(this.screenPointToLocalPoint(args.position));
            }
        });
        interaction.onTouchEnd.add(args => {
            if (this.activeTouchId == args.touchId) {
                this.activeTouchId = null;
                this.scrollAnimation.onTouchEnd(this.screenPointToLocalPoint(args.position));
            }
        });

        // fix for the interaction recognizing a touch end as a tap while opening the leaderboard
        let hasStartedTouchOutside = false;
        this.outOfLeaderboardInteraction = this.getOrCreateInteraction(fullFrameSo);
        this.outOfLeaderboardInteraction.isFilteredByDepth = true;
        this.outOfLeaderboardInteraction.onTouchStart.add(() => {
            if (this.isLeaderboardOpened) {
                hasStartedTouchOutside = true;
            }
        });
        this.outOfLeaderboardInteraction.onTap.add(() => {
            if (this.isLeaderboardOpened && hasStartedTouchOutside) {
                this.hide();
            }
            hasStartedTouchOutside = false;
        });
        this.outOfLeaderboardInteraction.enabled = false;
    }

    protected screenPointToLocalPoint(screenPosition: vec2): vec2 {
        return this.screenTransform.screenPointToLocalPoint(screenPosition);
    }

    protected isInTouchZone(screenPos: vec2): boolean {
        return this.screenTransform.containsScreenPoint(screenPos);
    }

    protected getOrCreateInteraction(sceneObject: SceneObject): InteractionComponent {
        let interaction = sceneObject.getComponent('Component.InteractionComponent');
        if (isNull(interaction)) {
            interaction = this.destructionHelper.createComponent(sceneObject, 'Component.InteractionComponent');
            interaction.setCamera(findParentComponent(sceneObject, 'Component.Camera'));
            interaction.isFilteredByDepth = true;
            interaction.setMinimumTouchSize(0);
            const rmv = sceneObject.getComponent('Component.Image');
            if (!rmv) {
                // an invisible render mesh visual for proper touch handling by InteractionComponent
                const image = this.destructionHelper.createComponent(sceneObject, 'Component.Image');
                image.stretchMode = StretchMode.Stretch;
                image.mainMaterial = this.leaderboardBackground.getInvisibleMaterial().clone();

                interaction.addMeshVisual(image);
            }
        }
        return interaction;
    }

    reset(): void {
        this.userRecords = [];
        this.currentUserRecord = null;
        this.entryWrappers = [];

        this.entriesParent.children.forEach((entryScObj) => {
            entryScObj.destroy();
        });
    }
}
