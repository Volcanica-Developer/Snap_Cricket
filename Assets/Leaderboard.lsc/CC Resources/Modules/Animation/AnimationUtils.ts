import { EasingFunction } from "./Easing";

export type AnimationValue = number | vec2 | vec3 | vec4 | quat;
export type AnimationValueGetter = () => AnimationValue;
export type AnimationValueSetter = (value: AnimationValue) => void;

export type LerpFunction = (start: AnimationValue, end: AnimationValue, t: number) => AnimationValue;

export interface AnimationOptions {
    scriptComponent: ScriptComponent;
    defaultDuration: number;
    easing?: EasingFunction;
}
