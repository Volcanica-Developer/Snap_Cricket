//@input SceneObject mainMenuController;
//@input SceneObject button;
//@input SceneObject gameObject1   // first game object to enable/disable
//@input SceneObject gameObject2   // second game object to enable/disable
//@input SceneObject gameObject3   // third game object to enable/disable
//@input Component.ScriptComponent gameOverTween1   // first tween component to disable on startgame
//@input Component.ScriptComponent gameOverTween2   // second tween component to disable on startgame
//@input SceneObject gameOverTweenObject   // scene object with tweens to play on startgame
//@input SceneObject tweenObject1   // first object to play tween on after mainMenuController enabled
//@input SceneObject tweenObject2   // second object to play tween on after mainMenuController enabled
//@input string tweenName1   // tween name for first object
//@input string tweenName2   // tween name for second object
//@input SceneObject confettiObject   // confetti object to enable/disable

// CONFIG
var OBJECT_TOGGLE_DURATION = 1.0;  // duration in seconds each object stays enabled
var OBJECT_ENABLE_DELAY = 1;     // delay between enabling each object
var TWEEN_TO_MENU_DELAY = 1.5;   // delay after tweens play before enabling mainMenuController

// Store initial scale for all objects
var initialScales = [];

function storeInitialScales() {
    initialScales = [];
    // Store scale for gameObjects and tween objects
    var objectsToStore = [
        script.gameObject1,
        script.gameObject2,
        script.gameObject3,
        script.tweenObject1,
        script.tweenObject2
    ];
    
    for (var i = 0; i < objectsToStore.length; i++) {
        var obj = objectsToStore[i];
        if (obj) {
            var screenTransform = obj.getComponent('Component.ScreenTransform');
            if (screenTransform) {
                try {
                    var scale = screenTransform.scale;
                    if (scale) {
                        var scaleData = new vec3(scale.x, scale.y, scale.z);
                        initialScales.push({
                            object: obj,
                            scale: scaleData
                        });
                        print("Stored initial scale for object " + i + ": x=" + scale.x + 
                              ", y=" + scale.y + ", z=" + scale.z);
                    }
                } catch (e) {
                    print("Error storing scale for object " + i + ": " + e);
                }
            }
        }
    }
}

function resetObjectScales() {
    // Reset scale for all stored objects
    for (var i = 0; i < initialScales.length; i++) {
        var entry = initialScales[i];
        if (entry && entry.object && entry.scale) {
            var screenTransform = entry.object.getComponent('Component.ScreenTransform');
            if (screenTransform) {
                try {
                    screenTransform.scale = entry.scale;
                    print("Reset scale for object: x=" + entry.scale.x + ", y=" + entry.scale.y + ", z=" + entry.scale.z);
                } catch (e) {
                    print("Error resetting scale: " + e);
                }
            }
        }
    }
}

function handleStartGame() {
    print("Game is Starting");
    script.button.enabled = false;
    
    // Revert player material back to idle at the start of the game
    if (global.gameController && global.gameController.setPlayerIdle) {
        try {
            global.gameController.setPlayerIdle();
            print("Reset player material to idle at game start");
        } catch (e) {
            print("Error resetting player material to idle: " + e);
        }
    }
    
    // Disable confetti object at the beginning
    if (script.confettiObject) {
        script.confettiObject.enabled = false;
    }
    
    // Reset scale to original values at the beginning
    resetObjectScales();
    
    // Play back tweens when starting game
    if (script.gameOverTweenObject) {
        try {
            global.tweenManager.startTween(script.gameOverTweenObject, "ScoreMoveBack");
        } catch (e) {
            print("Error starting ScoreMoveBack tween: " + e);
        }
        try {
            global.tweenManager.startTween(script.gameOverTweenObject, "ScoreScaleBack");
        } catch (e) {
            print("Error starting ScoreScaleBack tween: " + e);
        }
    }
    
    // Enable and disable objects one by one with delays
    // Enable first object immediately
    if (script.gameObject1) {
        script.gameObject1.enabled = true;
    }
    
    // Disable first object after duration
    var disableObject1Event = script.createEvent("DelayedCallbackEvent");
    disableObject1Event.bind(function() {
        if (script.gameObject1) {
            script.gameObject1.enabled = false;
        }
    });
    disableObject1Event.reset(OBJECT_TOGGLE_DURATION);
    
    // Enable second object after delay
    var enableObject2Event = script.createEvent("DelayedCallbackEvent");
    enableObject2Event.bind(function() {
        if (script.gameObject2) {
            script.gameObject2.enabled = true;
        }
        
        // Disable second object after duration
        var disableObject2Event = script.createEvent("DelayedCallbackEvent");
        disableObject2Event.bind(function() {
            if (script.gameObject2) {
                script.gameObject2.enabled = false;
            }
        });
        disableObject2Event.reset(OBJECT_TOGGLE_DURATION);
    });
    enableObject2Event.reset(OBJECT_ENABLE_DELAY);
    
    // Enable third object after second delay
    var enableObject3Event = script.createEvent("DelayedCallbackEvent");
    enableObject3Event.bind(function() {
        if (script.gameObject3) {
            script.gameObject3.enabled = true;
        }
        
        // Disable third object after duration
        var disableObject3Event = script.createEvent("DelayedCallbackEvent");
        disableObject3Event.bind(function() {
            if (script.gameObject3) {
                script.gameObject3.enabled = false;
            }
            
            // Play 2 separate tweens at once after all objects are disabled
            if (script.tweenObject1 && script.tweenName1 && script.tweenName1 !== "") {
                try {
                    global.tweenManager.startTween(script.tweenObject1, script.tweenName1);
                } catch (e) {
                    print("Error starting tween1 (" + script.tweenName1 + "): " + e);
                }
            }
            
            if (script.tweenObject2 && script.tweenName2 && script.tweenName2 !== "") {
                try {
                    global.tweenManager.startTween(script.tweenObject2, script.tweenName2);
                } catch (e) {
                    print("Error starting tween2 (" + script.tweenName2 + "): " + e);
                }
            }
            
            // After tweens play, wait for delay then enable mainMenuController
            var enableMenuEvent = script.createEvent("DelayedCallbackEvent");
            enableMenuEvent.bind(function() {
                if (script.mainMenuController) {
                    script.mainMenuController.enabled = true;
                }
            });
            enableMenuEvent.reset(TWEEN_TO_MENU_DELAY);
        });
        disableObject3Event.reset(OBJECT_TOGGLE_DURATION);
    });
    enableObject3Event.reset(OBJECT_ENABLE_DELAY * 2);
}

script.onPress = function(button_Event){
    switch (button_Event) {
        case "StartGame":
            handleStartGame();
            break;
    
        default:
            break;
    }
}

// Store initial scales when script initializes
storeInitialScales();