type Destroyable = { destroy(): void };

export class DestructionHelper {
    destroyObjects: Destroyable[] = [];

    getOrAddComponent<K extends keyof ComponentNameMap>(so: SceneObject, componentType: K): ComponentNameMap[K] {
        const component: ComponentNameMap[K] = so.getComponent(componentType);
        if (isNull(component)) {
            return this.createComponent(so, componentType);
        }
        return component;
    }

    addOrOverrideComponent<K extends keyof ComponentNameMap>(so: SceneObject, componentType: K): ComponentNameMap[K] {
        const component: ComponentNameMap[K] = so.getComponent(componentType);
        if (!isNull(component)) {
            component.destroy();
        }
        return this.createComponent(so, componentType);
    }

    createSceneObject(parent?: SceneObject, name?: string): SceneObject {
        const so: SceneObject = global.scene.createSceneObject(name ? name : '');
        so.setParent(parent ? parent : null);
        this.destroyObjects.push(so);
        return so;
    }

    createComponent<K extends keyof ComponentNameMap>(so: SceneObject, componentType: K): ComponentNameMap[K] {
        const component: ComponentNameMap[K] = so.createComponent(componentType);
        this.destroyObjects.push(component);
        return component;
    }

    createExtentsTarget(parent: SceneObject, visual: BaseMeshVisual, name: string): SceneObject {
        const extentsSO: SceneObject = global.scene.createSceneObject(name);
        const extentsST: ScreenTransform = extentsSO.createComponent('ScreenTransform');
        extentsSO.setParent(parent);
        visual.extentsTarget = extentsST;
        return extentsSO;
    }

    findRecursivelyOrInstantiate(parent: SceneObject, name: string, prefab: ObjectPrefab): SceneObject {
        let so: SceneObject = this.findChildObjectWithNameRecursively(parent, name);
        if (!so) {
            so = this.instantiatePrefab(prefab, parent);
            this.setRenderLayerRecursively(so, parent.layer);
            so.name = name;
        }
        return so;
    }

    findChildObjectWithNameRecursively(so: SceneObject, childName: string): SceneObject {
        const childCount: number = so.getChildrenCount();
        for (let i = 0; i < childCount; i++) {
            const child: SceneObject = so.getChild(i);
            if (child.name == childName) {
                return child;
            }
            const result: SceneObject = this.findChildObjectWithNameRecursively(child, childName);
            if (result) {
                return result;
            }
        }
        return null;
    }

    instantiatePrefab(prefab: ObjectPrefab, parent: SceneObject): SceneObject {
        const so: SceneObject = prefab.instantiate(parent);
        this.destroyObjects.push(so);
        return so;
    }

    setRenderLayerRecursively(so: SceneObject, layer: LayerSet): void {
        so.layer = layer;
        let child: SceneObject;
        for (let i = 0; i < so.getChildrenCount(); i++) {
            child = so.getChild(i);
            this.setRenderLayerRecursively(child, layer);
        }
    }

    setRenderOrderRecursively(so: SceneObject, renderOrder: number): void {
        const visuals: Visual[] = so.getComponents('Visual');
        for (const visual of visuals) {
            visual.setRenderOrder(renderOrder);
        }

        for (let i = 0; i < so.getChildrenCount(); i++) {
            this.setRenderOrderRecursively(so.getChild(i), renderOrder);
        }
    }

    getComponentRecursively<K extends keyof ComponentNameMap>(so: SceneObject, componentType: K): ComponentNameMap[K] {
        const component: ComponentNameMap[K] = so.getComponent(componentType);
        if (component) {
            return component;
        }
        const childCount: number = so.getChildrenCount();
        for (let i = 0; i < childCount; i++) {
            const result: ComponentNameMap[K] = this.getComponentRecursively(so.getChild(i), componentType);
            if (result) {
                return result;
            }
        }
        return null;
    }

    getCameraRenderOrder(so: SceneObject): number {
        if (!so) {
            print('Warning! Please, add component to hierarchy within orthographic camera.');
            return -1;
        }

        const camera: Camera = so.getComponent('Component.Camera');
        if (camera) {
            return camera.renderOrder;
        } else {
            return this.getCameraRenderOrder(so.getParent());
        }
    }

    destroyObject(o: Destroyable) {
        if (!isNull(o)) {
            try {
                o.destroy();
            } catch (e) {
                print('Suppressed: ' + e + ':\n' + e?.stack);
            }
        }
    }

    destroyAll() {
        this.destroyObjects.splice(0).forEach(o => this.destroyObject(o));
    }
}
