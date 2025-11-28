import {
    LeaderboardConstants,
} from "./Interfaces/LeaderboardConstants";
import CENTER_POS = LeaderboardConstants.FullLeaderboard.ANIMATION.CENTER_POS;
import INITIAL_PARENT_POSITION = LeaderboardConstants.FullLeaderboard.INITIAL_PARENT_POSITION;
import INITIAL_ALPHA = LeaderboardConstants.FullLeaderboard.INITIAL_ALPHA;
import END_ALPHA = LeaderboardConstants.FullLeaderboard.END_ALPHA;
import { PropertyAnimator } from './Modules/Animation/PropertyAnimator';
import { ScreenTransformAnchorsPositionConfiguration } from './Modules/Animation/Configurations/AnchorsConfiguration';
import { Easing } from "./Modules/Animation/Easing";
import { FullLeaderboard } from "./FullLeaderboard";

export class FullLeaderboardAnimations {
    private positionAnimator: PropertyAnimator;
    private alphaAnimator: PropertyAnimator;

    constructor(private fullLeaderboard: FullLeaderboard, scriptComponent: ScriptComponent, private mainScreenTransform: ScreenTransform) {
        this.positionAnimator = new PropertyAnimator({
            scriptComponent: scriptComponent,
            defaultDuration: 0,
            easing: Easing.Cubic.Out,
        });
        this.positionAnimator.configure(new ScreenTransformAnchorsPositionConfiguration(), this.mainScreenTransform);
        this.alphaAnimator = new PropertyAnimator({
            scriptComponent: scriptComponent,
            defaultDuration: 0,
            easing: Easing.Cubic.Out,
        });
        this.alphaAnimator.setupAnimation(
            () => this.fullLeaderboard.getAlpha(),
            (alpha) => this.fullLeaderboard.setAlpha(alpha as number),
            MathUtils.lerp
        );
    }

    isPlaying(): boolean {
        return this.positionAnimator.isAnimating() || this.alphaAnimator.isAnimating();
    }

    playAnimation(toShow: boolean, onComplete: () => void, onStart: () => void, duration: number): void {
        const endAlpha = toShow ? END_ALPHA : INITIAL_ALPHA;
        const endPosition = toShow ? CENTER_POS : INITIAL_PARENT_POSITION;
        const currentPosition = this.mainScreenTransform.anchors.getCenter();

        if (this.fullLeaderboard.getAlpha() == endAlpha && currentPosition.distance(endPosition) < 1e-6) {
            return;
        }

        this.positionAnimator.stopAnimation();
        this.alphaAnimator.stopAnimation();

        onStart();

        this.positionAnimator.setCallbackOnFinish(onComplete);
        if (toShow) {
            this.positionAnimator.startAnimation(endPosition, duration);
        } else {
            this.alphaAnimator.setCallbackOnFinish(() => {
                this.alphaAnimator.setCallbackOnFinish(null);
                this.positionAnimator.startAnimation(endPosition, 0);
            });
        }

        this.alphaAnimator.startAnimation(endAlpha, duration);
    }
}
