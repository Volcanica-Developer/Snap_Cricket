import { Event } from './Modules/Event';

import { FullLeaderboard } from "./FullLeaderboard";
import { DestructionHelper } from './DestructionHelper';
import {
    findEnabledParentComponent,
    findParentComponent,
    findSoWithComponent,
    getOrCreateScreenTransform,
    setRenderLayerRecursively,
    setRenderOrderRecursivelyRelativeToParent
} from './ComponentUtils';
import {
    BackgroundCustomization,
    EndStateOption,
    HeaderOption,
    HighScoreWidgetOption,
    IDependencies,
    LeaderboardInitializationOptions,
    ScoreResetIntervalOption,
    TestScenario
} from "./Interfaces/LeaderboardRelated";
import { LeaderboardConstants, } from "./Interfaces/LeaderboardConstants";
import { LeaderboardStorageScoresTracker } from "./LeaderboardStorageScoresTracker";
import { ScoresWidget } from "./ScoresWidget";
import UserRecord = Leaderboard.UserRecord;
import UsersType = Leaderboard.UsersType;
import SIDE_SWITCHER_SETTINGS = LeaderboardConstants.FullLeaderboard.SIDE_SWITCHER_SETTINGS;
import {
    DebugMode,
    LeaderboardCore,
    ScoreLifetimeOptionsToResetString
} from "./LeaderboardCore";

@component
export class LeaderboardComponent extends LeaderboardCore {
    @ui.group_start('Customization')

    @input('int', '1')
    @widget(new ComboBoxWidget()
        .addItem('None', 0)
        .addItem('Title', 1)
        .addItem('Top Score', 2))
    private readonly headerOption: HeaderOption;

    @input('int', '0')
    @label("Custom Background")
    @widget(new ComboBoxWidget()
        .addItem('None', 0)
        .addItem('Bitmoji', 1)
        .addItem('Texture', 2))
    private readonly backgroundCustomization: BackgroundCustomization;
    @input()
    @showIf('backgroundCustomization', 2)
    private readonly backgroundTexture: Texture;

    @input()
    @showIf('backgroundCustomization', 1)
    @hint('Please enter bitmoji sticker id or leave empty to use selfie sticker')
    protected customStickerId: string;

    @input()
    @label("Background Blur")
    private readonly useBackgroundBlur: boolean = false;

    @ui.group_end

    @input('Asset.ObjectPrefab')
    private readonly leaderboardVisuals: ObjectPrefab;

    @input('Asset.ObjectPrefab')
    private readonly componentDependencies: ObjectPrefab;

    @ui.group_start('Start state')

    @input()
    @label("Notification")
    private readonly useNotification: boolean = true;

    @input()
    private readonly useScoreWidget: boolean = false;

    @input('int', '1')
    @showIf('useScoreWidget', true)
    @widget(new ComboBoxWidget()
        .addItem('Delay', 0)
        .addItem('Manual', 1))
    private readonly hideScoreWidgetOption: HighScoreWidgetOption;

    @ui.label('Use .showScoreWidget() .hideScoreWidget() api')
    @showIf('hideScoreWidgetOption', 1)

    @input()
    @showIf('hideScoreWidgetOption', 0)
    private readonly delayTime: number;

    @ui.group_end

    @ui.group_start('End state')
    @input('int', '2')
    @label("On Submit Score")
    @widget(new ComboBoxWidget()
        .addItem('None', 0)
        .addItem('Side Switcher', 1)
        .addItem('Leaderboard', 2))
    private readonly endStateOption: EndStateOption;
    @ui.group_end

    @ui.group_start('Customizable Prefabs')
    @showIf('customisablePrefabs')

    @input('Asset.ObjectPrefab')
    @hint('This Prefab contains LeaderboardEntry script which can be customized')
    private readonly leaderboardEntry: ObjectPrefab;

    @input('Asset.ObjectPrefab')
    private readonly scoreWidgetPrefab: ObjectPrefab;
    @ui.group_end

    @ui.separator
    @input('int', '1')
    private readonly renderOrder: number = 1;

    @input('int', '0')
    @label('Debugging')
    @widget(new ComboBoxWidget()
        .addItem('None', 0)
        .addItem('ScoreSubmit', 1)
        .addItem('ScoresWidget', 2))
    private testingScenario: TestScenario;

    @input('int', '10')
    protected readonly entriesCount: number;

    @input('int', '100')
    @showIf('testingScenario', 1)
    protected readonly scoreToSubmit: number;

    @input("bool", "true")
    @label("Print Info")
    protected printDebugStatements: boolean;

    @input("bool", "true")
    @label("Print Warnings")
    protected printWarningStatements: boolean;

    onShow: Event = new Event();
    onHide: Event = new Event();
    onShown: Event = new Event();
    onHidden: Event = new Event();

    private readonly destructionHelper = new DestructionHelper();
    protected readonly screenTransform = getOrCreateScreenTransform(this.getSceneObject(), this.destructionHelper);
    private isVisible: boolean = false;

    private dependencies: IDependencies = null;
    private scoreWidget: ScoresWidget = null;
    private leaderboardVisualsControl: FullLeaderboard;
    private isFirstScoreRetrieval: boolean = true;
    private isSideSwitcherNotificationShown: boolean = false;

    onAwake() {
        if (!global.deviceInfoSystem.isEditor()) {
            this.testingScenario = TestScenario.None;
        }
        this.debugMode = this.testingScenario as number as DebugMode;

        this.createEvent("OnDestroyEvent").bind(() => {
            this.destructionHelper.destroyAll();
        });

        this.createEvent("OnEnableEvent").bind(this.onEnable);
        this.createEvent("OnDisableEvent").bind(this.onDisable);

        if (!this.isInputValid()) {
            return;
        }

        const dependenciesParent: SceneObject = this.componentDependencies.instantiate(this.getSceneObject().getParent());
        dependenciesParent.enabled = true;

        this.dependencies = dependenciesParent.getComponent("Component.ScriptComponent") as IDependencies;
        this.dependencies.enabled = true;

        this.initializeSideSwitcher();
        this.initializeLeaderboardVisuals();

        setRenderOrderRecursivelyRelativeToParent(this.getSceneObject(), this.renderOrder);
        setRenderLayerRecursively(this.getSceneObject(), this.getSceneObject().layer);

        if (this.backgroundCustomization === BackgroundCustomization.Texture) {
            this.leaderboardVisualsControl.setCustomTextureHeader(this.backgroundTexture);
        }

        this.onLeaderboardRecordsUpdated.add(() => {
            this.updateVisuals();
        });

        if (this.autoInitialize) {
            this.leaderboardVisualsControl.setTimerUiEnabled(true);
            this.leaderboardVisualsControl.setTimerText(ScoreLifetimeOptionsToResetString[this.scoreLifetimeOption]);
        }

        super.onAwake();
    }

    get visible(): boolean {
        return this.isVisible;
    }

    public show(duration?: number): void {
        this.leaderboardVisualsControl.show(duration);
    }

    public hide(): void {
        this.leaderboardVisualsControl.hide();
    }

    public getSideSwitcher(): CustomSideSwitcher {
        return this.dependencies.getSideSwitcher();
    }

    public showScoreWidget(duration?: number): void {
        if (!this.useScoreWidget) {
            return;
        }

        this.scoreWidget.show(duration);
    }

    public hideScoreWidget(duration?: number): void {
        if (!this.useScoreWidget) {
            return;
        }

        this.scoreWidget.hide(duration);
    }

    public get isScoreWidgetReady(): boolean {
        if (!this.useScoreWidget) {
            return false;
        }

        return this.scoreWidget.isReady();
    }

    protected initializeLeaderboard(initializationOptions: LeaderboardInitializationOptions): void {
        super.initializeLeaderboard(initializationOptions);

        if (this.useTimer) {
            this.leaderboardVisualsControl.setTimerText(ScoreLifetimeOptionsToResetString[initializationOptions.scoreResetInterval]);
        }

        this.leaderboardVisualsControl.setIsGlobalLeaderboard(initializationOptions.userType === UsersType.Global);
    }

    public setLeaderboardName(name: string) {
        this.leaderboardVisualsControl.setLeaderboardName(name);
    }

    private initializeSideSwitcher(): void {
        const sideSwitcher: CustomSideSwitcher = this.dependencies.getSideSwitcher();

        sideSwitcher.setNotificationEnabled(false);
        sideSwitcher.disableInteractable();
        sideSwitcher.iconOpacity = SIDE_SWITCHER_SETTINGS.ICON_OPACITY_DISABLED;

        sideSwitcher.onSwitch.add(() => {
            this.leaderboardVisualsControl.show();
            sideSwitcher.hide();
        });

        sideSwitcher.onShow.add(() => {
            if (this.isSideSwitcherNotificationShown) {
                sideSwitcher.setNotificationEnabled(false);
            }
        });

        sideSwitcher.onHide.add(() => {
            if (sideSwitcher.tooltip) {
                sideSwitcher.tooltip.hide();
            }

        });

        setRenderOrderRecursivelyRelativeToParent(sideSwitcher.getSceneObject(), this.renderOrder + 1);
        setRenderLayerRecursively(sideSwitcher.getSceneObject(), this.getSceneObject().layer);
        this.applySideSwitcherDepthFix(sideSwitcher.getSceneObject());
    }

    private applySideSwitcherDepthFix(sideSwitcherSo: SceneObject): void {
        const interactions = findSoWithComponent(sideSwitcherSo, "Component.InteractionComponent");
        interactions.forEach((soWithInteraction) => {
            const screenTransform = soWithInteraction.getComponent("Component.ScreenTransform");
            if (!isNull(screenTransform)) {
                screenTransform.position = new vec3(screenTransform.position.x, screenTransform.position.y, 0);
            }
        });
    }

    private initializeLeaderboardVisuals(): void {
        if (this.useScoreWidget) {
            this.initializeScoreWidget();
        }

        this.leaderboardVisualsControl = new FullLeaderboard(this, this.leaderboardVisuals, this.leaderboardEntry, () => this.onLeaderboardClosingStarted(), () => this.onLeaderboardOpeningStarted(), () => this.onLeaderboardHidden(), () => this.onLeaderboardShown(), this.renderOrder, this.bitmojiStickerLoader, this.backgroundCustomization, this.headerOption, this.useBackgroundBlur) as FullLeaderboard;
    }

    private onLeaderboardShown(): void {
        this.isVisible = true;
        this.onShow.trigger();
    }

    private onLeaderboardHidden(): void {
        this.dependencies.getSideSwitcher().show();
        this.isVisible = false;
        this.onHide.trigger();
    }

    private onLeaderboardOpeningStarted(): void {
        this.onShown.trigger();
    }

    private onLeaderboardClosingStarted(): void {
        this.onHidden.trigger();
    }

    private initializeScoreWidget(): void {
        const scoreWidgetParent = global.scene.createSceneObject("ScoreWidgetParent");
        scoreWidgetParent.setParent(this.getSceneObject().getParent());
        getOrCreateScreenTransform(scoreWidgetParent, this.destructionHelper);

        const delay = this.hideScoreWidgetOption === HighScoreWidgetOption.Delay ? this.delayTime : null;
        this.scoreWidget = new ScoresWidget(this, this.bitmojiStickerLoader, delay, scoreWidgetParent, this.scoreWidgetPrefab,);

        setRenderLayerRecursively(scoreWidgetParent, this.getSceneObject().layer);
        setRenderOrderRecursivelyRelativeToParent(scoreWidgetParent, this.renderOrder);

        this.dependencies.getSideSwitcher().onHide.add(() => {
            this.scoreWidget.hide();
        });
    }

    protected onSubmitScoreSuccess(currentUserRecord: UserRecord) {
        super.onSubmitScoreSuccess(currentUserRecord);
        this.updateVisuals();
        this.updateNotificationState(false);
        this.triggerEndState();
    }

    private triggerEndState(): void {
        switch (this.endStateOption) {
            case EndStateOption.Leaderboard:
                this.show();
                if (this.useScoreWidget) this.scoreWidget.hide();
                this.getSideSwitcher().hide();
                break;
            case EndStateOption.SideSwitcher:
                this.getSideSwitcher().show();
                break;
            default:
                break;
        }
    }

    private updateVisuals(): void {
        this.getSideSwitcher().iconOpacity = SIDE_SWITCHER_SETTINGS.ICON_OPACITY_ENABLED;
        this.getSideSwitcher().enableInteractable();

        this.leaderboardVisualsControl.visualiseEntries(this.allMergedRecords, this.currentUserRecord);

        if (this.useScoreWidget && this.userType === UsersType.Friends) {
            this.scoreWidget.visualiseEntries(this.allMergedRecords, this.currentUserRecord);
        }
    }

    private updateNotificationState(showNotification: boolean): void {
        if (!this.useNotification) {
            return;
        }

        const checksum = this.calculateChecksum(this.allMergedRecords);
        const leaderboardName = this.leaderboardParams.leaderboardName;
        const lastChecksum = LeaderboardStorageScoresTracker.getInstance().getLeaderboardLastChecksumOrNull(leaderboardName);

        if (lastChecksum !== checksum) {
            if (showNotification && this.isFirstScoreRetrieval) {
                this.getSideSwitcher().setNotificationEnabled(true);
                this.isSideSwitcherNotificationShown = true;
            }
        }

        LeaderboardStorageScoresTracker.getInstance().saveChecksum(checksum, leaderboardName);
        this.isFirstScoreRetrieval = false;
    }

    protected onLeaderboardInfoRetrievedSuccessful(otherRecords: Leaderboard.UserRecord[], currentUserRecord: Leaderboard.UserRecord, token: number) {
        super.onLeaderboardInfoRetrievedSuccessful(otherRecords, currentUserRecord, token);
        this.updateVisuals();
        this.updateNotificationState(true);
    }

    protected onCurrentUserBitmojiLoaded(texture: Texture) {
        super.onCurrentUserBitmojiLoaded(texture);
        if (this.backgroundCustomization === BackgroundCustomization.Bitmoji) {
            this.leaderboardVisualsControl.setBitmoji(texture);
        }
    }

    private validateCamera(): boolean {
        const camera: Camera = findParentComponent(this.getSceneObject(), 'Camera');
        if (isNull(camera) || camera.type !== Camera.Type.Orthographic) {
            return false;
        }
        return true;
    }

    private validateCanvas(): boolean {
        const canvas: Canvas = findEnabledParentComponent(this.getSceneObject(), 'Canvas');
        return !isNull(canvas) && canvas!.enabled;
    }

    protected isInputValid(): boolean {
        if (!super.isInputValid()) {
            return false;
        }

        if (isNull(this.getSceneObject().getParent()) || !this.validateCamera()) {
            this.printWarning("Please place Leaderboard under the Orthographic Camera");
            return false;
        }

        if (!this.validateCanvas()) {
            this.printWarning("Please place Leaderboard under a scene object with an enabled Canvas component");
            return false;
        }

        return true;
    }

    protected recreateLeaderboard(): void {
        super.recreateLeaderboard();
        this.leaderboardVisualsControl.reset();
    }

    protected onUpdate() {
        super.onUpdate();
        if (this.useTimer) {
            this.leaderboardVisualsControl.setTimeLeft(this.leaderboardParams.leaderboardDetails.timeToFinish);
        }
        this.leaderboardVisualsControl.setTimerUiEnabled(this.useTimer);
    };

    private onEnable = () => {
        this.getSideSwitcher().getSceneObject().enabled = true;
        if (this.useScoreWidget) {
            this.scoreWidget.getSceneObject().enabled = true;
        }
    };

    private onDisable = () => {
        this.getSideSwitcher().getSceneObject().enabled = false;
        if (this.useScoreWidget) {
            this.scoreWidget.getSceneObject().enabled = false;
        }
    };

    private calculateChecksum(allRecords: Leaderboard.UserRecord[]): number {
        let checksum = 0;
        allRecords.forEach((record) => {
            checksum += record.score;
        });

        return checksum;
    }
}
