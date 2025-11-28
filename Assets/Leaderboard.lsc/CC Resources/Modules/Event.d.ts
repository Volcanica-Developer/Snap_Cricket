export class Event<T = any> implements IEvent<T> {
    private listeners: Array<(data: T) => void>;
    private onceListeners: Array<(data: T) => void>;
    private enabled: boolean;

    add(listener: (data: T) => void): void;
    addOnce(listener: (data: T) => void): void;
    remove(listener: (data: T) => void): void;
    clear(): void;
    trigger(data: T): void;
    disable(): void;
    enable(): void;
    listenerCount(): number;
}
