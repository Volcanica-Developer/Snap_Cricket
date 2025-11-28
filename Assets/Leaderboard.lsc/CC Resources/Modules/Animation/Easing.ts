/**
 * Easing Types and their realizations.
 */

export type EasingFunction = (t: number) => number;

export namespace Easing {
    export namespace Linear {
        export const None: EasingFunction = (k: number): number => k;
    }

    export namespace Quadratic {
        export const In: EasingFunction = (k: number): number => k * k;
        export const Out: EasingFunction = (k: number): number => k * (2 - k);
        export const InOut: EasingFunction = (k: number): number => (k *= 2) < 1 ? 0.5 * k * k : -0.5 * (--k * (k - 2) - 1);
    }

    export namespace Cubic {
        export const In: EasingFunction = (k: number): number => k * k * k;
        export const Out: EasingFunction = (k: number): number => --k * k * k + 1;
        export const InOut: EasingFunction = (k: number): number => (k *= 2) < 1 ? 0.5 * k * k * k : 0.5 * ((k -= 2) * k * k + 2);
    }

    export namespace Quartic {
        export const In: EasingFunction = (k: number): number => k * k * k * k;
        export const Out: EasingFunction = (k: number): number => 1 - (--k * k * k * k);
        export const InOut: EasingFunction = (k: number): number => (k *= 2) < 1 ? 0.5 * k * k * k * k : -0.5 * ((k -= 2) * k * k * k - 2);
    }

    export namespace Quintic {
        export const In: EasingFunction = (k: number): number => k * k * k * k * k;
        export const Out: EasingFunction = (k: number): number => --k * k * k * k * k + 1;
        export const InOut: EasingFunction = (k: number): number => (k *= 2) < 1 ? 0.5 * k * k * k * k * k : 0.5 * ((k -= 2) * k * k * k * k + 2);
    }

    export namespace Sinusoidal {
        export const In: EasingFunction = (k: number): number => 1 - Math.cos(k * Math.PI / 2);
        export const Out: EasingFunction = (k: number): number => Math.sin(k * Math.PI / 2);
        export const InOut: EasingFunction = (k: number): number => 0.5 * (1 - Math.cos(Math.PI * k));
    }

    export namespace Exponential {
        export const In: EasingFunction = (k: number): number => k === 0 ? 0 : Math.pow(1024, k - 1);
        export const Out: EasingFunction = (k: number): number => k === 1 ? 1 : 1 - Math.pow(2, -10 * k);
        export const InOut: EasingFunction = (k: number): number => {
            if (k === 0 || k === 1) return k;
            if ((k *= 2) < 1) return 0.5 * Math.pow(1024, k - 1);
            return 0.5 * (-Math.pow(2, -10 * (k - 1)) + 2);
        };
    }

    export namespace Circular {
        export const In: EasingFunction = (k: number): number => 1 - Math.sqrt(1 - k * k);
        export const Out: EasingFunction = (k: number): number => Math.sqrt(1 - (--k * k));
        export const InOut: EasingFunction = (k: number): number => (k *= 2) < 1 ? -0.5 * (Math.sqrt(1 - k * k) - 1) : 0.5 * (Math.sqrt(1 - (k -= 2) * k) + 1);
    }

    export namespace Elastic {
        export const In: EasingFunction = (k: number): number => {
            if (k === 0 || k === 1) return k;
            return -Math.pow(2, 10 * (k - 1)) * Math.sin((k - 1.1) * 5 * Math.PI);
        };

        export const Out: EasingFunction = (k: number): number => {
            if (k === 0 || k === 1) return k;
            return Math.pow(2, -10 * k) * Math.sin((k - 0.1) * 5 * Math.PI) + 1;
        };

        export const InOut: EasingFunction = (k: number): number => {
            if (k === 0 || k === 1) return k;
            k *= 2;
            if (k < 1) return -0.5 * Math.pow(2, 10 * (k - 1)) * Math.sin((k - 1.1) * 5 * Math.PI);
            return 0.5 * Math.pow(2, -10 * (k - 1)) * Math.sin((k - 1.1) * 5 * Math.PI) + 1;
        };
    }

    export namespace Back {
        const s = 1.70158;
        export const In: EasingFunction = (k: number): number => k * k * ((s + 1) * k - s);
        export const Out: EasingFunction = (k: number): number => --k * k * ((s + 1) * k + s) + 1;
        export const InOut: EasingFunction = (k: number): number => {
            const s = 1.70158 * 1.525;
            if ((k *= 2) < 1) return 0.5 * (k * k * ((s + 1) * k - s));
            return 0.5 * ((k -= 2) * k * ((s + 1) * k + s) + 2);
        };
    }

    export namespace Bounce {
        export const In: EasingFunction = (k: number): number => 1 - Bounce.Out(1 - k);
        export const Out: EasingFunction = (k: number): number => {
            if (k < (1 / 2.75)) {
                return 7.5625 * k * k;
            } else if (k < (2 / 2.75)) {
                return 7.5625 * (k -= (1.5 / 2.75)) * k + 0.75;
            } else if (k < (2.5 / 2.75)) {
                return 7.5625 * (k -= (2.25 / 2.75)) * k + 0.9375;
            } else {
                return 7.5625 * (k -= (2.625 / 2.75)) * k + 0.984375;
            }
        };
        export const InOut: EasingFunction = (k: number): number => {
            if (k < 0.5) return In(k * 2) * 0.5;
            return Out(k * 2 - 1) * 0.5 + 0.5;
        };
    }
}
