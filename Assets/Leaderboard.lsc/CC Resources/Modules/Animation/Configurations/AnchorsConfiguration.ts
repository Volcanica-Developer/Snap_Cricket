import { IAnimatorConfiguration } from "./IConfiguration";
import { PropertyAnimator } from "../PropertyAnimator";

export class ScreenTransformAnchorsPositionConfiguration implements IAnimatorConfiguration {
    configure(animator: PropertyAnimator, st: ScreenTransform) {
        animator.setupAnimation(
            () => st.anchors.getCenter(),
            (value) => {
                st.anchors.setCenter(value as vec2);
            },
            vec2.lerp
        );
    }
}
