//@input SceneObject[] allAudiences   // main list: all audience objects in the scene
//@input Component.Image[] withCapRedAudiences   // list for "with cap red" type
//@input Component.Image[] withoutCapRedAudiences   // list for "without cap red" type

// CONFIG
var ANIMATION_RESET_DELAY = 2.0;  // delay in seconds before resetting animations back to idle

// Materials for each audience type and animation (red only)
//@input Asset.Material withCapRedIdleMaterial   // idle material for "with cap red"
//@input Asset.Material withCapRedCheerMaterial   // cheer material for "with cap red"
//@input Asset.Material withCapRedSadMaterial   // sad material for "with cap red"
//@input Asset.Material withCapRedCelebrationMaterial   // celebration material for "with cap red"

//@input Asset.Material withoutCapRedIdleMaterial   // idle material for "without cap red"
//@input Asset.Material withoutCapRedCheerMaterial   // cheer material for "without cap red"
//@input Asset.Material withoutCapRedSadMaterial   // sad material for "without cap red"
//@input Asset.Material withoutCapRedCelebrationMaterial   // celebration material for "without cap red"

// Internal data structures (red audience only)
var audienceData = {
    withCapRed: {
        list: [],
        idleMaterial: null,
        cheerMaterial: null,
        sadMaterial: null,
        celebrationMaterial: null
    },
    withoutCapRed: {
        list: [],
        idleMaterial: null,
        cheerMaterial: null,
        sadMaterial: null,
        celebrationMaterial: null
    }
};

// Animation types
var AnimationType = {
    IDLE: "idle",
    CHEER: "cheer",
    SAD: "sad",
    CELEBRATION: "celebration"
};

// Store current animation state for each audience
var audienceStates = {}; // key: audience object, value: { type: string, currentAnimation: string }

// ---------- Initialization ----------
function initializeAudienceData() {
    // Load materials for each type (red only)
    loadMaterialsForType("withCapRed", script.withCapRedIdleMaterial, script.withCapRedCheerMaterial, 
                         script.withCapRedSadMaterial, script.withCapRedCelebrationMaterial);
    loadMaterialsForType("withoutCapRed", script.withoutCapRedIdleMaterial, script.withoutCapRedCheerMaterial, 
                         script.withoutCapRedSadMaterial, script.withoutCapRedCelebrationMaterial);
    
    // Randomly populate the 2 red lists from all audiences
    randomlyPopulateLists();
    
    // Set default idle animation for all audiences
    setDefaultIdleAnimations();
}

function loadMaterialsForType(type, idleMat, cheerMat, sadMat, celebrationMat) {
    if (idleMat) {
        audienceData[type].idleMaterial = idleMat;
    }
    if (cheerMat) {
        audienceData[type].cheerMaterial = cheerMat;
    }
    if (sadMat) {
        audienceData[type].sadMaterial = sadMat;
    }
    if (celebrationMat) {
        audienceData[type].celebrationMaterial = celebrationMat;
    }
}

function randomlyPopulateLists() {
    if (!script.allAudiences || script.allAudiences.length === 0) {
        print("Warning: No audiences assigned in allAudiences list");
        return;
    }
    
    // Create a copy of all audiences for random selection
    var availableAudiences = [];
    for (var i = 0; i < script.allAudiences.length; i++) {
        if (script.allAudiences[i]) {
            availableAudiences.push(script.allAudiences[i]);
        }
    }
    
    // Shuffle the array for randomness
    shuffleArray(availableAudiences);
    
    // Distribute audiences randomly to the 2 red lists
    var listIndex = 0;
    var lists = [
        { scriptList: script.withCapRedAudiences, dataKey: "withCapRed" },
        { scriptList: script.withoutCapRedAudiences, dataKey: "withoutCapRed" }
    ];
    
    for (var i = 0; i < availableAudiences.length; i++) {
        var audience = availableAudiences[i];
        var targetList = lists[listIndex % lists.length];
        
        // Get Image and AnimatedTexture components from the audience SceneObject
        var imageComponent = getImageComponent(audience);
        var animTexComponent = getAnimatedTextureComponent(audience);
        if (imageComponent) {
            // Add to internal data structure
            audienceData[targetList.dataKey].list.push({
                sceneObject: audience,
                imageComponent: imageComponent,
                animTexComponent: animTexComponent
            });
            
            // Store initial state
            audienceStates[audience] = {
                type: targetList.dataKey,
                currentAnimation: AnimationType.IDLE
            };
        }
        
        listIndex++;
    }
    
    print("Randomly distributed " + availableAudiences.length + " audiences across 2 red types");
    print("  - With Cap Red: " + audienceData.withCapRed.list.length);
    print("  - Without Cap Red: " + audienceData.withoutCapRed.list.length);
}

function getImageComponent(sceneObject) {
    if (!sceneObject) return null;
    
    // Try to get Image component
    var imageComponent = sceneObject.getComponent("Component.Image");
    if (imageComponent) {
        return imageComponent;
    }
    
    // If not found, try to get it from children
    var childrenCount = sceneObject.getChildrenCount();
    for (var i = 0; i < childrenCount; i++) {
        var child = sceneObject.getChild(i);
        if (child) {
            imageComponent = child.getComponent("Component.Image");
            if (imageComponent) {
                return imageComponent;
            }
        }
    }
    
    return null;
}

function getAnimatedTextureComponent(sceneObject) {
    if (!sceneObject) return null;
    
    // Try to get AnimatedTexture component
    var animTexComponent = sceneObject.getComponent("Component.AnimatedTexture");
    if (animTexComponent) {
        return animTexComponent;
    }
    
    // If not found, try to get it from children
    var childrenCount = sceneObject.getChildrenCount();
    for (var i = 0; i < childrenCount; i++) {
        var child = sceneObject.getChild(i);
        if (child) {
            animTexComponent = child.getComponent("Component.AnimatedTexture");
            if (animTexComponent) {
                return animTexComponent;
            }
        }
    }
    
    return null;
}

function shuffleArray(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
}

function setDefaultIdleAnimations() {
    // Set idle animation for all red audience types
    setAnimationForType("withCapRed", AnimationType.IDLE);
    setAnimationForType("withoutCapRed", AnimationType.IDLE);
}

// ---------- Animation Control ----------
function setAnimationForType(audienceType, animationType) {
    var typeData = audienceData[audienceType];
    if (!typeData) {
        print("Error: Unknown audience type: " + audienceType);
        return;
    }
    
    var material = null;
    switch (animationType) {
        case AnimationType.IDLE:
            material = typeData.idleMaterial;
            break;
        case AnimationType.CHEER:
            material = typeData.cheerMaterial;
            break;
        case AnimationType.SAD:
            material = typeData.sadMaterial;
            break;
        case AnimationType.CELEBRATION:
            material = typeData.celebrationMaterial;
            break;
        default:
            print("Error: Unknown animation type: " + animationType);
            return;
    }
    
    if (!material) {
        print("Warning: No material found for " + audienceType + " - " + animationType);
        return;
    }
    
    // Apply animation to all audiences of this type
    for (var i = 0; i < typeData.list.length; i++) {
        var audience = typeData.list[i];
        if (audience && audience.imageComponent) {
            try {
                audience.imageComponent.mainMaterial = material;
                
                // Update state
                if (audienceStates[audience.sceneObject]) {
                    audienceStates[audience.sceneObject].currentAnimation = animationType;
                }
            } catch (e) {
                print("Error setting material for audience: " + e);
            }
        }
    }
}

// Public functions to trigger animations (to be called from other scripts)
function triggerCheerAnimation() {
    setAnimationForType("withCapRed", AnimationType.CHEER);
    setAnimationForType("withoutCapRed", AnimationType.CHEER);
    
    // Reset to idle after delay
    scheduleResetToIdle();
}

function triggerSadAnimation() {
    setAnimationForType("withCapRed", AnimationType.SAD);
    setAnimationForType("withoutCapRed", AnimationType.SAD);
    
    // Reset to idle after delay
    scheduleResetToIdle();
}

function triggerCelebrationAnimation() {
    setAnimationForType("withCapRed", AnimationType.CELEBRATION);
    setAnimationForType("withoutCapRed", AnimationType.CELEBRATION);
    
    // Reset to idle after delay
    scheduleResetToIdle();
}

function resetToIdleAnimation() {
    setAnimationForType("withCapRed", AnimationType.IDLE);
    setAnimationForType("withoutCapRed", AnimationType.IDLE);
}

// Variable to store the reset event
var resetToIdleEvent = null;

function scheduleResetToIdle() {
    // Cancel any existing reset event to avoid multiple resets
    if (resetToIdleEvent) {
        resetToIdleEvent.enabled = false;
    }
    
    // Create new delayed event to reset to idle
    resetToIdleEvent = script.createEvent("DelayedCallbackEvent");
    resetToIdleEvent.bind(function() {
        resetToIdleAnimation();
    });
    resetToIdleEvent.reset(ANIMATION_RESET_DELAY);
}

// Make functions accessible globally
global.audienceAnimationHandler = {
    triggerCheer: triggerCheerAnimation,
    triggerSad: triggerSadAnimation,
    triggerCelebration: triggerCelebrationAnimation,
    resetToIdle: resetToIdleAnimation
};

// Initialize on startup
initializeAudienceData();

