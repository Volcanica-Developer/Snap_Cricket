interface IEvent<T = any> {
    add(listener: (data: T) => void): void;
    addOnce(listener: (data: T) => void): void;
    remove(listener: (data: T) => void): void;
    clear(): void;
    trigger(data: T): void;
    disable(): void;
    enable(): void;
    listenerCount(): number;
}

interface Tooltip extends BaseScriptComponent {
    autostart: boolean,
    label: string,
    show(): void,
    hide(): void,
    direction: "Left"|"Right"|"Top"|"Bottom",
}

interface SideSwitcher extends ScriptComponent {
    switchToNext(): void
    switchTo(icon: number): void
    show(): void
    hide(): void
    disableIconBackground(): void
    enableIconBackground(): void
    enableInteractable(): void
    disableInteractable(): void
    tooltip?: Tooltip
    visible: boolean
    activeIconIndex: number
    eventTag: string
    iconOpacity: number
    backgroundOpacity: number
    icons: Texture[]

    onSwitch: IEvent<number>
    onShow: IEvent<number>
    onHide: IEvent<number>
}

interface CustomSideSwitcher extends SideSwitcher {
    setNotificationEnabled(enabled: boolean): void
}
