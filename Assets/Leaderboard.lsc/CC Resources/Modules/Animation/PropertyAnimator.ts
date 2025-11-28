/**
 * PropertyAnimator is an alternative for Tweens.
 * This can be useful when developing a custom component to avoid additional dependencies such as TweenManager.
 *
 * Usage:
 * const animator: PropertyAnimator = new PropertyAnimator({
 *     scriptComponent: this,
 *     defaultDuration: 0.5,
 *     easing: Easing.Quadratic.InOut
 * });
 *
 * animator.configure(new ScreenTransformScaleConfiguration(), this.screenTransform);
 * animator.startAnimation(vec3.zero());
 *
 * Use `configure()` for existing Configurations or `setupAnimation()` for custom configurations.
 */

import {
    AnimationOptions,
    AnimationValueGetter,
    AnimationValueSetter,
    LerpFunction
} from "./AnimationUtils";
import { EasingFunction } from "./Easing";
import { AnimatedObject, IAnimatorConfiguration } from "./Configurations/IConfiguration";

type AnimationValue = number | vec2 | vec3 | vec4 | quat;

export class PropertyAnimator {

    private animationEvent: UpdateEvent = null;
    private animationTime: number = 0.0;
    private duration: number;

    private startValue: AnimationValue = 0.0;
    private endValue: AnimationValue = 1.0;

    private scriptC: ScriptComponent;

    private getter: AnimationValueGetter;
    private setter: AnimationValueSetter;
    private lerp: LerpFunction;
    private easing: EasingFunction;

    private callbackOnFinish?: () => void;

    constructor(options: AnimationOptions) {
        this.scriptC = options.scriptComponent;
        this.duration = options.defaultDuration;
        this.easing = options.easing || ((t) => t);
    }

    setupAnimation(getter: AnimationValueGetter, setter: AnimationValueSetter, lerp: LerpFunction): void {
        this.getter = getter;
        this.setter = setter;
        this.lerp = lerp;
    }

    configure(config: IAnimatorConfiguration, options?: AnimatedObject | AnimatedObject[]): void {
        if (Array.isArray(options)) {
            config.configureArray(this, options);
        } else {
            config.configure(this, options);
        }
    }

    setCallbackOnFinish(cb: () => void): void {
        this.callbackOnFinish = cb;
    }

    startAnimation(endValue: AnimationValue, duration?: number): void {
        this.endValue = endValue;
        this.startValue = this.getter();
        this.duration = duration || this.duration;
        this.animationTime = 0;

        this.removeAnimationEvent();
        this.animationEvent = this.scriptC.createEvent("UpdateEvent");
        this.animationEvent.bind((ev) => this.update(ev));
    }

    private update(eventData: UpdateEvent) {
        this.animationTime += eventData.getDeltaTime();
        const t = Math.min(this.animationTime / this.duration, 1);
        const easedT = this.easing(t);
        const value = this.lerp(this.startValue, this.endValue, easedT);
        this.setter(value);

        if (t >= 1) {
            this.setter(this.endValue);
            this.stopAnimation();
        }
    }

    stopAnimation(): void {
        if (!this.isAnimating()) {
            return;
        }
        this.removeAnimationEvent();
        this.callbackOnFinish && this.callbackOnFinish();
    }

    isAnimating(): boolean {
        return this.animationEvent !== null && this.animationEvent.enabled;
    }

    private removeAnimationEvent(): void {
        if (this.animationEvent) {
            this.scriptC.removeEvent(this.animationEvent);
            this.animationEvent.enabled = false;
            this.animationEvent = null;
        }
    }
}
