const ZERO = vec2.zero();
const EPS = 0.001;

class FingerVelocityFilter {
    readonly points: number[] = [];
    private readonly taps: number[] = [];

    constructor(private readonly size = 5) {
        // reduce finger liftoff and older movement influence
        const peak = 0.8;
        for (let i = 1; i <= size; ++i) {
            const x = i / size;
            this.taps.push(1 - (x / peak - 1) ** 2);
        }
    }

    push(value: number) {
        if (!isFinite(value)) return;

        if (this.points.length >= this.size) {
            this.points.shift();
        }
        this.points.push(value);
    }

    reset() {
        this.points.splice(0);
    }

    get value() {
        let sum = 0;
        let weight = 0;
        const off = this.taps.length - this.points.length;
        for (let i = 0; i < this.points.length; i++) {
            const value = this.points[i];
            const w = this.taps[off + i];
            sum += value * w;
            weight += w;
        }
        return sum / weight;
    }
}

export class InertialAnimation {
    public enabled: boolean = true;
    public snapError: vec2 = ZERO;
    public velocity: number;
    public get isAnimating(): boolean {
        return this.event.enabled;
    }

    private readonly event: UpdateEvent;
    private readonly tmp = vec2.zero();
    private readonly filteredVelocity = new FingerVelocityFilter();

    private lastPosition: vec2 = ZERO;
    private lastUpdateAt = 0;
    private mode: 'inertia' | 'tween' = 'inertia';

    constructor(private readonly script: ScriptComponent,
        private onUpdate: (delta: vec2) => void,
        private onFinish: () => void,
        private readonly direction: vec2,
        private readonly maxSpeed: number,
        private readonly friction: number,
        private readonly snapDuration: number,) {
        this.event = script.createEvent('LateUpdateEvent');
        this.event.bind(args => this.doUpdate(args));
        this.event.enabled = false;
    }

    onTouchStart(position: vec2) {
        if (!this.enabled) return;
        this.event.enabled = false;
        this.filteredVelocity.reset();
        this.lastPosition = position;
        this.lastUpdateAt = getTime();
        this.mode = 'inertia';
    }

    onTouchMove(position: vec2) {
        if (!this.enabled) return;
        const now = getTime();
        const change = position.sub(this.lastPosition);
        this.onUpdate(this.direction.mult(change));

        const delta = this.direction.dot(change);
        const dt = now - this.lastUpdateAt;
        const velocity = delta / dt;
        this.filteredVelocity.push(velocity);
        this.lastPosition = position;
        this.lastUpdateAt = now;
    }

    onTouchEnd(position: vec2) {
        if (!this.enabled) return;
        this.event.enabled = true;
        this.onTouchMove(position);
        this.velocity = this.filteredVelocity.value;

        const filteredVelocity = this.filteredVelocity.value;
        this.velocity = filteredVelocity < 0
            ? MathUtils.clamp(filteredVelocity, -this.maxSpeed, 0)
            : MathUtils.clamp(filteredVelocity, 0, this.maxSpeed);

    }

    stop() {
        this.event.enabled = false;
    }

    private doUpdate(args: UpdateEvent) {
        if (!this.enabled) return;
        const dt = args.getDeltaTime();
        const velocity = this.velocity;

        const change = 2 * this.friction * dt * Math.sign(this.velocity);
        if (this.mode == 'inertia') {
            if (Math.abs(velocity) > Math.abs(change)) {
                this.velocity -= change;
                this.onUpdate(this.direction.uniformScale(this.velocity * dt));
            } else {
                this.mode = 'tween';
                this.lastUpdateAt = getTime();
            }
        }
        if (this.mode == 'tween') {
            let t = (getTime() - this.lastUpdateAt - dt) / this.snapDuration;
            t = MathUtils.clamp((Math.exp(t) - 1) / (Math.E - 1), 0, 1);
            if (t >= 1) {
                this.onUpdate(this.snapError);
                this.event.enabled = this.snapError.length > EPS;
                if (!this.event.enabled) {
                    this.onFinish();
                }
            } else {
                const x = this.snapError.x * t;
                const y = this.snapError.y * t;
                const tmp = this.tmp;
                tmp.x = x;
                tmp.y = y;

                this.onUpdate(tmp);
            }

        }
    }
}
