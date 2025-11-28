import {
    IScoresWidget,
    IScoreWidgetControl,
    ScoresWidgetType
} from "./Interfaces/LeaderboardRelated";
import { LeaderboardConstants, } from "./Interfaces/LeaderboardConstants";
import { BitmojiStickerLoader } from "./BitmojiStickerLoader";
import FRIENDS_PLAYED_TEXT = LeaderboardConstants.ScoresWidget.FRIENDS_PLAYED_TEXT;
import MAX_FRIENDS_TO_COUNT = LeaderboardConstants.ScoresWidget.MAX_FRIENDS_TO_COUNT;
import ANIMATION_DURATION = LeaderboardConstants.SingleBadge.ANIMATION_DURATION;
import { PropertyAnimator } from "./Modules/Animation/PropertyAnimator";
import { Easing } from "./Modules/Animation/Easing";

export class ScoresWidget implements IScoresWidget {
    private scoresWidgetControl: IScoreWidgetControl = null;
    private scoresWidget: SceneObject = null;
    private isVisualisationTriggered: boolean = false;
    private animator: PropertyAnimator = null;
    private isWidgetReady: boolean = false;
    private isHideRequested: boolean = false;

    constructor(private readonly scriptComponent: ScriptComponent, private readonly stickerLoader: BitmojiStickerLoader,
                private readonly delayToHide: number = null, parent: SceneObject, scoresWidgetPrefab: ObjectPrefab,) {

        this.scoresWidget = scoresWidgetPrefab.instantiate(parent);
        this.scoresWidget.enabled = true;
        this.scoresWidgetControl = this.scoresWidget.getComponent("ScriptComponent") as unknown as IScoreWidgetControl;
        this.scoresWidgetControl.setAlpha(0);

        const safeRenderRegion = this.scoresWidget.createComponent("ScreenRegionComponent");
        safeRenderRegion.region = ScreenRegionType.SafeRender;

        this.animator = new PropertyAnimator({
            scriptComponent,
            defaultDuration: 0,
            easing: Easing.Quadratic.InOut,
        });
        this.animator.setupAnimation(
            this.scoresWidgetControl.getAlpha,
            this.scoresWidgetControl.setAlpha,
            MathUtils.lerp
        );
    }

    visualiseEntries(leaderboardRecordsWithCurrentUser: Leaderboard.UserRecord[], currentUserRecord: Leaderboard.UserRecord) {
        if (this.isVisualisationTriggered) {
            return;
        }
        this.isVisualisationTriggered = true;
        const bitmojiLoadingPromises = [];
        const maxUsersToLoad = Math.min(leaderboardRecordsWithCurrentUser.length, 3);
        let maxScore = null;

        if (leaderboardRecordsWithCurrentUser.length > 0 && !isNull(leaderboardRecordsWithCurrentUser[0].score)) {
            maxScore = leaderboardRecordsWithCurrentUser[0].score;
        }

        for (let i = 0; i < maxUsersToLoad; i++) {
            if (!isNull(leaderboardRecordsWithCurrentUser[i]) &&
                !isNull(leaderboardRecordsWithCurrentUser[i].snapchatUser)) {
                bitmojiLoadingPromises.push(this.stickerLoader.loadForUser(leaderboardRecordsWithCurrentUser[i].snapchatUser, ''));
            }
        }

        Promise.all(bitmojiLoadingPromises).then((bitmojiTexturesArray: Texture[]) => {
            this.scoresWidgetControl.setBitmojiTetxures(bitmojiTexturesArray);
            const bitmojisCount = bitmojiTexturesArray.length;

            if (bitmojisCount === 1) {
                this.scoresWidgetControl.setActiveWidget(ScoresWidgetType.SingleSticker);
                if (maxScore !== null) {
                    this.scoresWidgetControl.setCurrentUserScoreAndEnableVisual(maxScore);
                }
            } else if (bitmojisCount === 2) {
                this.scoresWidgetControl.setActiveWidget(ScoresWidgetType.TwoStickers);
            } else if (bitmojisCount > 2) {
                this.scoresWidgetControl.setActiveWidget(ScoresWidgetType.ThreeStickers);

                let firendsPlayedCount = leaderboardRecordsWithCurrentUser.length;
                if (!isNull(currentUserRecord)) {
                    firendsPlayedCount -= 1;
                }
                firendsPlayedCount = Math.min(firendsPlayedCount, MAX_FRIENDS_TO_COUNT);

                const message = firendsPlayedCount + FRIENDS_PLAYED_TEXT;
                this.scoresWidgetControl.setFriendsPlayedText(message);
            }

            this.animateOnLoad();
            this.isWidgetReady = true;
        });
    }

    isReady(): boolean {
        return this.isWidgetReady;
    }

    show(duration?: number): void {
        if (!this.isWidgetReady) {
            return;
        }

        const animationDuration = isNull(duration) ? ANIMATION_DURATION : duration;
        this.animateLeaderboard(true, animationDuration);
    }

    hide(duration?: number): void {
        this.isHideRequested = true;
        if (!this.isWidgetReady) {
            return;
        }

        const animationDuration = isNull(duration) ? ANIMATION_DURATION : duration;
        this.animateLeaderboard(false, animationDuration);
    }

    getSceneObject(): SceneObject {
        return this.scoresWidget;
    }

    private animateLeaderboard(toShow: boolean, duration: number): void {
        const startAlpha = this.scoresWidgetControl.getAlpha();
        const endAlpha = toShow ? 1 : 0;
        const distanceAdjustedDuration = Math.abs(startAlpha - endAlpha) * ANIMATION_DURATION;

        if (distanceAdjustedDuration === 0 && duration !== 0) {
            return;
        }

        this.animator.stopAnimation();
        this.animator.startAnimation(endAlpha, distanceAdjustedDuration);
    }

    private animateOnLoad() {
        if (this.isHideRequested) {
            return;
        }

        this.animateLeaderboard(true, ANIMATION_DURATION);

        const delayToStartAniamtion = this.scriptComponent.createEvent("DelayedCallbackEvent");
        delayToStartAniamtion.bind(() => {
            this.scriptComponent.removeEvent(delayToStartAniamtion);
            this.animateLeaderboard(false, ANIMATION_DURATION);
        });
        delayToStartAniamtion.reset(this.delayToHide);
    }
}
