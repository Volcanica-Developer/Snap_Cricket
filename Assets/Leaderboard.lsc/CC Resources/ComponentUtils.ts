import { DestructionHelper } from "./DestructionHelper";

export function findOneByType<T>(components: ScriptComponent[], type: string): (T & ScriptComponent)[] {
    if (!components) return [];
    for (const c of components) {
        if (c.isOfType(type)) {
            return [c as any];
        }
    }
    return [];
}

export function findParentComponent<K extends keyof ComponentNameMap>(sceneObject: SceneObject,
    componentType: K,): ComponentNameMap[K] | null {
    let so = sceneObject;
    while (so != null) {
        const comp = so.getComponent(componentType);
        if (comp) return comp;
        so = so.getParent();
    }
    return null;
}

export function findEnabledParentComponent<T extends keyof ComponentNameMap>(sceneObject: SceneObject, componentType: T): ComponentNameMap[T] | null {
    let so = sceneObject;
    while (so != null) {
        const components = so.getComponents(componentType);
        const enabledComponent = components.find(c => c.enabled);
        if (enabledComponent) return enabledComponent;
        so = so.getParent();
    }
    return null;
}

export function findSoWithComponent<K extends keyof ComponentNameMap>(so: SceneObject, componentType: K, soArray?: Array<SceneObject>): Array<SceneObject> {
    if (!soArray) {
        soArray = [];
    }
    const comp = so.getComponent(componentType);

    if (!isNull(comp)) {
        soArray.push(so);
    }

    for (let i = 0; i < so.getChildrenCount(); i++) {
        findSoWithComponent(so.getChild(i), componentType, soArray);
    }
    return soArray;
}

export function forEachChild(so: SceneObject, fn: (so: SceneObject) => void) {
    if (!isNull(so)) fn(so);
    so.children.forEach(so => forEachChild(so, fn));
}

export function findParent(so: SceneObject, predicate: (so: SceneObject) => boolean) {
    let parent = so;
    do {
        parent = parent.getParent();
    } while (parent && !predicate(parent));
    return parent;
}

export function setRenderOrderRecursively(so: SceneObject, renderOrder: number): void {
    const visuals: Visual[] = so.getComponents('Visual');
    for (const visual of visuals) {
        visual.setRenderOrder(renderOrder);
    }
    for (let i = 0; i < so.getChildrenCount(); i++) {
        setRenderOrderRecursively(so.getChild(i), renderOrder);
    }
}

export function setRenderOrderRecursivelyRelativeToParent(so: SceneObject, renderOrder: number): void {
    const visuals: Visual[] = so.getComponents('Visual');
    for (const visual of visuals) {
        visual.setRenderOrder(visual.getRenderOrder() + renderOrder);
    }
    for (let i = 0; i < so.getChildrenCount(); i++) {
        setRenderOrderRecursivelyRelativeToParent(so.getChild(i), renderOrder);
    }
}

export function getOrCreateScreenTransform(sceneObject: SceneObject, destructionHelper: DestructionHelper): ScreenTransform {
    let st = sceneObject.getComponent('Component.ScreenTransform');
    if (isNull(st)) {
        st = destructionHelper.createComponent(sceneObject, 'Component.ScreenTransform');
    }
    st.position = new vec3(0, 0, 0);
    return st;
}

export function setRenderLayerRecursively(so: SceneObject, layer: LayerSet): void {
    so.layer = layer;
    let child: SceneObject;
    for (let i = 0; i < so.getChildrenCount(); i++) {
        child = so.getChild(i);
        setRenderLayerRecursively(child, layer);
    }
}

export function copyAnchors(anchorsFrom: Rect, anchorsTo: Rect): void {
    anchorsTo.top = anchorsFrom.top;
    anchorsTo.bottom = anchorsFrom.bottom;
    anchorsTo.left = anchorsFrom.left;
    anchorsTo.right = anchorsFrom.right;
}
