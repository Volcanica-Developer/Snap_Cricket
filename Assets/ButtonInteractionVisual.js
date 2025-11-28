//@input Component.Image background
//@input Component.Text label
//@input string labelText = "Button"
//@input bool interactable = true
//@input bool useScaleAnimation = true
//@input float pressedScale = 0.92 {"showIf":"useScaleAnimation","showIfValue":true}

var root = script.getSceneObject();
var screenTransform = getOrCreateComponent(root, "Component.ScreenTransform");
var interactionComponent = getOrCreateComponent(root, "Component.InteractionComponent");

var currentPressed = false;
var defaultScale = screenTransform.scale;

initializeVisuals();
setupInteraction();

script.setInteractable = setInteractable;
script.setLabel = setLabel;

function initializeVisuals() {
    if (!script.background) {
        script.background = findComponentInChildren(root, "Component.Image");
    }

    if (!script.label) {
        script.label = findComponentInChildren(root, "Component.Text");
    }

    setLabel(script.labelText);
    applyInteractionState(script.interactable);
}

function setupInteraction() {
    interactionComponent.onTouchStart.add(onTouchStart);
    interactionComponent.onTouchMove.add(onTouchMove);
    interactionComponent.onTouchEnd.add(onTouchEnd);
}

function onTouchStart(eventData) {
    if (!script.interactable) {
        return;
    }
    currentPressed = true;
    applyPressedVisual(true);
}

function onTouchMove(eventData) {
    if (!currentPressed || !script.interactable) {
        return;
    }

    var isInside = screenTransform.containsScreenPoint(eventData.position);
    applyPressedVisual(isInside);
}

function onTouchEnd(eventData) {
    if (!currentPressed) {
        return;
    }

    var shouldTrigger = script.interactable && screenTransform.containsScreenPoint(eventData.position);
    currentPressed = false;

    applyPressedVisual(false);
}

function applyPressedVisual(isPressed) {
    if (!script.useScaleAnimation) {
        return;
    }

    var targetScale = isPressed ? defaultScale.uniformScale(script.pressedScale) : defaultScale;
    screenTransform.scale = targetScale;

    if (script.background) {
        script.background.mainPass.baseColor = isPressed ? adjustAlpha(script.background.mainPass.baseColor, 0.8) : adjustAlpha(script.background.mainPass.baseColor, 1.0);
    }
}

function applyInteractionState(enabled) {
    var alpha = enabled ? 1.0 : 0.5;
    if (script.background) {
        script.background.mainPass.baseColor = adjustAlpha(script.background.mainPass.baseColor, alpha);
    }
    if (script.label) {
        script.label.textFill.color = adjustAlpha(script.label.textFill.color, alpha);
    }
}

function setInteractable(enabled) {
    script.interactable = enabled;
    applyInteractionState(enabled);
}

function setLabel(text) {
    if (script.label) {
        script.label.text = text || "";
    }
}

function adjustAlpha(color, alpha) {
    return new vec4(color.x, color.y, color.z, alpha);
}

function findComponentInChildren(sceneObject, componentType) {
    if (!sceneObject) {
        return null;
    }

    var component = sceneObject.getComponent(componentType);
    if (component) {
        return component;
    }

    var count = sceneObject.getChildrenCount();
    for (var i = 0; i < count; i++) {
        var childComponent = findComponentInChildren(sceneObject.getChild(i), componentType);
        if (childComponent) {
            return childComponent;
        }
    }
    return null;
}

function getOrCreateComponent(sceneObject, componentType) {
    var component = sceneObject.getComponent(componentType);
    if (component) {
        return component;
    }
    return sceneObject.createComponent(componentType);
}


