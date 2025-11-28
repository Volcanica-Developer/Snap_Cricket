import { PropertyAnimator } from "../PropertyAnimator";

export type AnimatedObject = MaterialMeshVisual | Text | ScreenTransform;
export interface IAnimatorConfiguration {
    configure(animator: PropertyAnimator, animatedObjects?: AnimatedObject): void;
    configureArray?(animator: PropertyAnimator, animatedObjects?: AnimatedObject[]): void;
}
