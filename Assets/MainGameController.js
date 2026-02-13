//@input Asset.ObjectPrefab[] myPrefabs   // array of prefabs to randomly spawn from
//@input Asset.ObjectPrefab myPrefab   // kept for backward compatibility (deprecated, use myPrefabs instead)
//@input string BeforeBounce_Tween
//@input string AfterBounce_Tween
//@input Component.Text debugText   // assign your Text component here
//@input Component.Text hitQualityDebugText   // assign your Text component here
//@input Component.Text secondsText
//@input Component.Text scoreText
//@input Component.Text highScoreText
//@input Component.Text wicketsText   // assign your Text component here for wickets remaining display
//@input Component.Text currentScoreText   // text to show current score for the hit (e.g., "1 run", "4 runs")
//@input string currentScoreScaleUpTween   // tween name to scale up to 1 when enabled
//@input string currentScoreScaleDownTween   // tween name to scale down to 0 when disabled
//@input Component.ScriptComponent Leaderboard   // assign your Leaderboard component here
//@input string OutTween1   // first tween to play when player gets out
//@input string OutTween2   // second tween to play when player gets out
//@input string OutTween3   // third tween to play when player gets out
//@input string OutTween4   // fourth tween to play when player gets out
//@input string OutTween5   // fifth tween to play when player gets out
//@input SceneObject[] objectsToReset   // objects whose positions/rotations need to be reset
//@input Component.Image playerImage   // image component to change materials on
//@input Asset.Material idleMaterial   // material for idle state
//@input Asset.Material shotMaterial   // material for shot state
//@input Asset.Material outMaterial   // material for out state
//@input Asset.Material winningMaterial   // material for winning/game over state
//@input Component.AnimatedTexture shotAnimTex   // animated texture to play when shot material is enabled
//@input Component.AnimatedTexture outAnimTex   // animated texture to play when out material is enabled
//@input Asset.Material colorChangeMaterial   // material whose color property will change on out
//@input SceneObject steamObject   // object to enable when player gets out
//@input SceneObject confettiObject   // confetti object to enable when game is over
//@input SceneObject screenBreakObject   // object to enable when player hits six
//@input SceneObject StartButton   // button to enable after game resets
//@input SceneObject spawnPosition
//@input SceneObject objectToMove   // object with ScreenTransform to move on x-axis when ball spawns
//@input Component.Image wicketImage1   // first wicket image
//@input Component.Image wicketImage2   // second wicket image
//@input Component.Image wicketImage3   // third wicket image
//@input Asset.Texture wicketLostSprite1   // sprite to show when first wicket is lost
//@input Asset.Texture wicketLostSprite2   // sprite to show when second wicket is lost
//@input Asset.Texture wicketLostSprite3   // sprite to show when third wicket is lost

//@input Component.AnimatedTexture animTex
//@input SceneObject gameOverTweenObject   // scene object with tween components to enable on game over
//@input Component.ScriptComponent gameOverTween1   // first tween component to enable/disable
//@input Component.ScriptComponent gameOverTween2   // second tween component to enable/disable

//@input 


// CONFIG
var SPAWN_INTERVAL = 5.0;        // seconds between spawns
var HIT_WINDOW = 1.0;            // seconds player has to hit (counts down 2 -> 0)
var DESTROY_AFTER = 5.0;         // safety destroy
var DESTROY_DELAY_ON_HIT = 2.0;  // delay before destroying ball after hit
var SHOT_ANIMATION_DELAY = 1;  // delay before re-enabling idleObject and disabling shotObject
var OUT_TWEEN_DISPLAY_DELAY = 1.0;  // delay after tweens complete to see animation
var RESET_DELAY = 1.0;           // delay before resetting game after tweens complete
var OUT_OBJECT_DISPLAY_DELAY = 2.0;  // delay before disabling out object
var CURRENT_SCORE_RESET_DELAY = 2.0;  // delay before resetting current score text to "0 runs"
var SCORE_ANIMATION_SPEED = 0.05;  // time between each number increment (lower = faster)

// Threshold percentages of HIT_WINDOW (0.0 to 1.0)
var PERFECT_PERCENT = 0.10;      // 10% of HIT_WINDOW => perfect (6 runs)
var GOOD_PERCENT = 0.30;         // 30% of HIT_WINDOW => good (4 runs)
var NORMAL_PERCENT = 0.35;       // 35% of HIT_WINDOW => normal (2 runs)
var WEAK_PERCENT = 0.50;         // 50% of HIT_WINDOW => weak (1 run)
// Above 50% => Early Miss - OUT

// Calculate actual thresholds from percentages
var PERFECT_THRESHOLD = HIT_WINDOW * PERFECT_PERCENT;
var GOOD_THRESHOLD = HIT_WINDOW * GOOD_PERCENT;
var NORMAL_THRESHOLD = HIT_WINDOW * NORMAL_PERCENT;
var WEAK_THRESHOLD = HIT_WINDOW * WEAK_PERCENT;

// scoring & ball tracking
var runs = 0;
var ballsBowled = 0; // counts deliveries (resets on OUT)
var wicketsRemaining = 3; // player gets out after 3 wickets

// internals
var root = script.getSceneObject();
var activeBalls = []; // array of { instance, spawnTime, hit }

var highScoreKey = "cricket_high_score";

var persistentStorage = global.persistentStorageSystem.store;
var highScore = persistentStorage.getFloat(highScoreKey) || 0;

// store initial positions and rotations for reset
var initialTransforms = [];
var isResetting = false; // flag to prevent multiple reset sequences

// store initial textures for wicket images
var initialWicketTextures = [];

// store initial position of target (objectToMove)
var initialTargetPosition = null;

// store initial material for player image
var initialPlayerMaterial = null;

// store initial color for color change image
var initialColorChangeColor = null;

// variable to store the current score reset event
var currentScoreResetEvent = null;

// variables for animated score counting
var previousScore = 0;
var targetScore = 0;
var isAnimatingScore = false;
var scoreAnimationEvent = null;  



// ---------- helpers ----------
function storeInitialTransforms() {
    initialTransforms = [];
    if (script.objectsToReset && script.objectsToReset.length > 0) {
        for (var i = 0; i < script.objectsToReset.length; i++) {
            var obj = script.objectsToReset[i];
            if (obj) {
                var screenTransform = obj.getComponent('Component.ScreenTransform');
                if (screenTransform) {
                    var pos = screenTransform.position;
                    var rot = screenTransform.rotation;
                    // create new instances to store the values
                    initialTransforms.push({
                        object: obj,
                        position: new vec3(pos.x, pos.y, pos.z),
                        rotation: new quat(rot.x, rot.y, rot.z, rot.w)
                    });
                }
            }
        }
    }
}

function storeInitialTargetPosition() {
    if (script.objectToMove) {
        var screenTransform = script.objectToMove.getComponent('Component.ScreenTransform');
        if (screenTransform) {
            var pos = screenTransform.position;
            initialTargetPosition = new vec3(pos.x, pos.y, pos.z);
            print("Stored initial target position: (" + pos.x + ", " + pos.y + ", " + pos.z + ")");
        } else {
            print("Warning: objectToMove does not have a ScreenTransform component");
        }
    }
}

function resetTargetPosition() {
    if (script.objectToMove && initialTargetPosition) {
        var screenTransform = script.objectToMove.getComponent('Component.ScreenTransform');
        if (screenTransform) {
            screenTransform.position = initialTargetPosition;
            print("Reset target position to original");
        }
    }
}

function storeInitialPlayerMaterial() {
    if (script.playerImage) {
        try {
            var materials = script.playerImage.mainMaterial;
            if (materials) {
                // mainMaterial can be an array or single material
                initialPlayerMaterial = Array.isArray(materials) ? materials[0] : materials;
                print("Stored initial player material");
            }
        } catch (e) {
            print("Error storing initial player material: " + e);
        }
    }
}

function storeInitialColorChangeColor() {
    if (script.colorChangeMaterial) {
        try {
            var material = script.colorChangeMaterial;
            if (material && material.mainPass) {
                // For flat materials, the Color property is accessed via mainPass.baseColor
                var color = null;
                
                // Direct access to baseColor property (most common for flat materials)
                if (material.mainPass.baseColor !== undefined && material.mainPass.baseColor !== null) {
                    color = material.mainPass.baseColor;
                    print("Stored initial color from mainPass.baseColor");
                }
                // Try getParameter for shader graph parameters
                else if (material.mainPass.getParameter) {
                    try {
                        color = material.mainPass.getParameter("baseColor");
                        if (color) {
                            print("Stored initial color from mainPass.getParameter('baseColor')");
                        }
                    } catch (e) {
                        print("Could not get baseColor via getParameter: " + e);
                    }
                }
                // Try material-level getParameter
                else if (material.getParameter) {
                    try {
                        color = material.getParameter("baseColor");
                        if (color) {
                            print("Stored initial color from material.getParameter('baseColor')");
                        }
                    } catch (e) {
                        print("Could not get baseColor via material.getParameter: " + e);
                    }
                }
                
                if (color) {
                    initialColorChangeColor = color;
                    print("Stored initial color: (" + color.x + ", " + color.y + ", " + color.z + ", " + color.w + ")");
                } else {
                    // Default to white if we can't get the color
                    initialColorChangeColor = new vec4(1.0, 1.0, 1.0, 1.0);
                    print("Could not get Color property, defaulting to white");
                }
            }
        } catch (e) {
            print("Error storing initial color change color: " + e);
            // Default to white on error
            initialColorChangeColor = new vec4(1.0, 1.0, 1.0, 1.0);
        }
    }
}

function changeColorChangeImageColor(color) {
    if (!script.colorChangeMaterial) {
        return;
    }
    
    try {
        var material = script.colorChangeMaterial;
        if (material && material.mainPass) {
            var success = false;
            
            // For flat materials, directly set mainPass.baseColor (this is the Color property in inspector)
            if (material.mainPass.baseColor !== undefined) {
                try {
                    material.mainPass.baseColor = color;
                    success = true;
                    print("Changed Color property via mainPass.baseColor = (" + color.x + ", " + color.y + ", " + color.z + ", " + color.w + ")");
                } catch (e) {
                    print("Error setting mainPass.baseColor: " + e);
                }
            }
            
            // Try setParameter for shader graph parameters
            if (!success && material.mainPass.setParameter) {
                try {
                    material.mainPass.setParameter("baseColor", color);
                    success = true;
                    print("Changed Color property via mainPass.setParameter('baseColor')");
                } catch (e) {
                    print("Error setting parameter via mainPass.setParameter: " + e);
                }
            }
            
            // Try material-level setParameter as fallback
            if (!success && material.setParameter) {
                try {
                    material.setParameter("baseColor", color);
                    success = true;
                    print("Changed Color property via material.setParameter('baseColor')");
                } catch (e) {
                    print("Error setting parameter via material.setParameter: " + e);
                }
            }
            
            if (!success) {
                print("Warning: Could not change Color property");
            }
        }
    } catch (e) {
        print("Error changing color change material color: " + e);
    }
}

function changePlayerMaterial(material) {
    if (!script.playerImage || !material) {
        return;
    }
    
    try {
        script.playerImage.mainMaterial = material;
        print("Changed player material");
    } catch (e) {
        print("Error changing player material: " + e);
    }
}

function setPlayerIdle() {
    // Stop out animation if it's playing
    if (script.outAnimTex) {
        try {
            script.outAnimTex.control.stop();
            print("Stopped out animated texture");
        } catch (e) {
            print("Error stopping out animated texture: " + e);
        }
    }
    
    // Revert color change image back to white (or original color)
    if (initialColorChangeColor) {
        changeColorChangeImageColor(initialColorChangeColor);
    } else {
        // Default to white if we don't have the original color
        changeColorChangeImageColor(new vec4(1.0, 1.0, 1.0, 1.0));
    }
    
    if (script.idleMaterial) {
        changePlayerMaterial(script.idleMaterial);
    } else if (initialPlayerMaterial) {
        // Fallback to initial material if idleMaterial not assigned
        changePlayerMaterial(initialPlayerMaterial);
    }
}

function setPlayerShot() {
    if (script.shotMaterial) {
        changePlayerMaterial(script.shotMaterial);
        
        // Play animated texture if assigned
        if (script.shotAnimTex) {
            try {
                script.shotAnimTex.control.play(1, 0.0);
                print("Playing shot animated texture");
            } catch (e) {
                print("Error playing shot animated texture: " + e);
            }
        }
    }
}

function setPlayerOut() {
    if (script.outMaterial) {
        changePlayerMaterial(script.outMaterial);
        
        // Play animated texture continuously (loop) until switched back to idle
        if (script.outAnimTex) {
            try {
                // -1 means loop indefinitely
                script.outAnimTex.control.play(-1, 0.0);
                print("Playing out animated texture (looping)");
            } catch (e) {
                print("Error playing out animated texture: " + e);
            }
        }
        
        // Change color to #ff9799 (RGB: 255, 151, 153, normalized: 1.0, 0.592, 0.600)
        var outColor = new vec4(1.0, 0.592, 0.600, 1.0);
        changeColorChangeImageColor(outColor);
    }
}

function setPlayerWinning() {
    if (script.winningMaterial) {
        changePlayerMaterial(script.winningMaterial);
        print("Set player to winning material");
    }
}

function animateScoreCount(fromScore, toScore) {
    if (!script.scoreText) return;
    
    isAnimatingScore = true;
    targetScore = toScore;
    var currentCount = fromScore;
    
    // Cancel any existing animation
    if (scoreAnimationEvent) {
        scoreAnimationEvent.enabled = false;
    }
    
    function updateCount() {
        if (currentCount < toScore) {
            currentCount++;
            script.scoreText.text = "Score : " + currentCount + "";
            
            // Schedule next increment
            scoreAnimationEvent = script.createEvent("DelayedCallbackEvent");
            scoreAnimationEvent.bind(updateCount);
            scoreAnimationEvent.reset(SCORE_ANIMATION_SPEED);
        } else {
            // Animation complete
            script.scoreText.text = "Score : " + toScore + "";
            previousScore = toScore;
            isAnimatingScore = false;
        }
    }
    
    // Start animation
    updateCount();
}

function tweenScaleToZeroAndDisable(sceneObject, screenTransform) {
    if (!sceneObject || !screenTransform) return;
    
    // Tween scale to 0
    if (script.currentScoreScaleDownTween && script.currentScoreScaleDownTween !== "") {
        try {
            global.tweenManager.startTween(sceneObject, script.currentScoreScaleDownTween, function() {
                // After tween completes, disable object and set scale to 0
                sceneObject.enabled = false;
                screenTransform.scale = new vec3(0, 0, 0);
            });
        } catch (e) {
            print("Error starting scale down tween: " + e);
            // Fallback: disable and set scale directly
            sceneObject.enabled = false;
            screenTransform.scale = new vec3(0, 0, 0);
        }
    } else {
        // No tween assigned, disable and set scale directly
        sceneObject.enabled = false;
        screenTransform.scale = new vec3(0, 0, 0);
    }
}

function updateCurrentScoreText(runsScored) {
    if (!script.currentScoreText) return;
    
    // Get the SceneObject from the Text component
    var currentScoreObject = script.currentScoreText.getSceneObject();
    if (!currentScoreObject) return;
    
    // Get ScreenTransform component
    var screenTransform = currentScoreObject.getComponent('Component.ScreenTransform');
    if (!screenTransform) return;
    
    // Handle "OUT" case
    if (runsScored === "OUT" || runsScored === "out") {
        currentScoreObject.enabled = true;
        
        // Tween scale to 1
        if (script.currentScoreScaleUpTween && script.currentScoreScaleUpTween !== "") {
            try {
                global.tweenManager.startTween(currentScoreObject, script.currentScoreScaleUpTween);
            } catch (e) {
                print("Error starting scale up tween: " + e);
            }
        }
        
        script.currentScoreText.text = "OUT";
        
        // Cancel any existing reset event
        if (currentScoreResetEvent) {
            currentScoreResetEvent.enabled = false;
        }
        
        // Schedule disable SceneObject and tween scale to 0 after delay
        currentScoreResetEvent = script.createEvent("DelayedCallbackEvent");
        currentScoreResetEvent.bind(function() {
            if (currentScoreObject && screenTransform) {
                tweenScaleToZeroAndDisable(currentScoreObject, screenTransform);
            }
        });
        currentScoreResetEvent.reset(CURRENT_SCORE_RESET_DELAY);
        return;
    }
    
    // Enable SceneObject and tween scale to 1 if runs scored > 0
    if (runsScored > 0) {
        currentScoreObject.enabled = true;
        
        // Tween scale to 1
        if (script.currentScoreScaleUpTween && script.currentScoreScaleUpTween !== "") {
            try {
                global.tweenManager.startTween(currentScoreObject, script.currentScoreScaleUpTween);
            } catch (e) {
                print("Error starting scale up tween: " + e);
            }
        }
    } else {
        // Disable and tween scale to 0
        tweenScaleToZeroAndDisable(currentScoreObject, screenTransform);
        return; // Don't update text if disabled
    }
    
    // Format text: "1 run" for single, "X runs" for multiple
    var scoreText = "";
    if (runsScored === 1) {
        scoreText = "1 run";
    } else if (runsScored > 1) {
        scoreText = runsScored + " runs";
    }
    
    script.currentScoreText.text = scoreText;
    
    // Cancel any existing reset event
    if (currentScoreResetEvent) {
        currentScoreResetEvent.enabled = false;
    }
    
    // Schedule disable SceneObject and tween scale to 0 after delay
    currentScoreResetEvent = script.createEvent("DelayedCallbackEvent");
    currentScoreResetEvent.bind(function() {
        if (currentScoreObject && screenTransform) {
            tweenScaleToZeroAndDisable(currentScoreObject, screenTransform);
        }
    });
    currentScoreResetEvent.reset(CURRENT_SCORE_RESET_DELAY);
}

function storeInitialWicketTextures() {
    initialWicketTextures = [];
    var wicketImages = [script.wicketImage1, script.wicketImage2, script.wicketImage3];
    
    for (var i = 0; i < wicketImages.length; i++) {
        var image = wicketImages[i];
        if (image) {
            try {
                var materials = image.mainMaterial;
                if (materials) {
                    // mainMaterial can be an array or single material
                    var material = Array.isArray(materials) ? materials[0] : materials;
                    if (material) {
                        // Try different ways to access the texture
                        var texture = null;
                        if (material.mainPass && material.mainPass.baseTex) {
                            texture = material.mainPass.baseTex;
                        } else if (material.baseTex) {
                            texture = material.baseTex;
                        } else if (material.getParameter) {
                            // Try getting baseTex parameter
                            try {
                                texture = material.getParameter("baseTex");
                            } catch (e) {}
                        }
                        
                        if (texture) {
                            initialWicketTextures.push({
                                image: image,
                                texture: texture,
                                material: material
                            });
                            print("Stored initial texture for wicket image " + (i + 1));
                        } else {
                            print("Warning: Could not find texture for wicket image " + (i + 1));
                            initialWicketTextures.push({ image: image, texture: null, material: material });
                        }
                    } else {
                        initialWicketTextures.push({ image: image, texture: null, material: null });
                    }
                } else {
                    initialWicketTextures.push({ image: image, texture: null, material: null });
                }
            } catch (e) {
                print("Error storing initial texture for wicket image " + (i + 1) + ": " + e);
                initialWicketTextures.push({ image: image, texture: null, material: null });
            }
        } else {
            initialWicketTextures.push({ image: null, texture: null, material: null });
        }
    }
}

function updateWicketImageSprite(wicketNumber) {
    // wicketNumber: 1, 2, or 3 (which wicket was lost)
    var image = null;
    var lostSprite = null;
    
    if (wicketNumber === 1 && script.wicketImage1) {
        image = script.wicketImage1;
        lostSprite = script.wicketLostSprite1;
    } else if (wicketNumber === 2 && script.wicketImage2) {
        image = script.wicketImage2;
        lostSprite = script.wicketLostSprite2;
    } else if (wicketNumber === 3 && script.wicketImage3) {
        image = script.wicketImage3;
        lostSprite = script.wicketLostSprite3;
    }
    
    if (image && lostSprite) {
        try {
            var materials = image.mainMaterial;
            if (materials) {
                // mainMaterial can be an array or single material
                var material = Array.isArray(materials) ? materials[0] : materials;
                if (material) {
                    // Try different ways to set the texture
                    var success = false;
                    if (material.mainPass) {
                        material.mainPass.baseTex = lostSprite;
                        success = true;
                    } else if (material.baseTex !== undefined) {
                        material.baseTex = lostSprite;
                        success = true;
                    } else if (material.setParameter) {
                        try {
                            material.setParameter("baseTex", lostSprite);
                            success = true;
                        } catch (e) {}
                    }
                    
                    if (success) {
                        print("Updated wicket image " + wicketNumber + " sprite");
                    } else {
                        print("Warning: Could not update texture for wicket image " + wicketNumber);
                    }
                }
            }
        } catch (e) {
            print("Error updating wicket image " + wicketNumber + " sprite: " + e);
        }
    }
}

function resetWicketImageSprites() {
    for (var i = 0; i < initialWicketTextures.length; i++) {
        var entry = initialWicketTextures[i];
        if (entry && entry.image && entry.texture) {
            try {
                var materials = entry.image.mainMaterial;
                if (materials) {
                    // mainMaterial can be an array or single material
                    var material = Array.isArray(materials) ? materials[0] : materials;
                    if (material) {
                        // Try different ways to set the texture
                        var success = false;
                        if (material.mainPass) {
                            material.mainPass.baseTex = entry.texture;
                            success = true;
                        } else if (material.baseTex !== undefined) {
                            material.baseTex = entry.texture;
                            success = true;
                        } else if (material.setParameter) {
                            try {
                                material.setParameter("baseTex", entry.texture);
                                success = true;
                            } catch (e) {}
                        }
                        
                        if (success) {
                            print("Reset wicket image " + (i + 1) + " sprite");
                        }
                    }
                }
            } catch (e) {
                print("Error resetting wicket image " + (i + 1) + " sprite: " + e);
            }
        }
    }
}

function resetTransforms() {

    global.tweenManager.startTween(root, "StumpsLeftReturn")
    global.tweenManager.startTween(root, "StumpsMiddleReturn")
    global.tweenManager.startTween(root, "StumpsRightReturn")

    for (var i = 0; i < initialTransforms.length; i++) {
        var entry = initialTransforms[i];
        if (entry && entry.object) {
            try {
                var screenTransform = entry.object.getComponent('Component.ScreenTransform');
                if (screenTransform) {
                    screenTransform.position = entry.position;
                    screenTransform.rotation = entry.rotation;
                }
            } catch (e) {
                print("Error resetting ScreenTransform: " + e);
            }
        }
    }
}

function playOutTweensSequentially(callback) {
    var tweens = [
        script.OutTween1,
        script.OutTween2,
        script.OutTween3,
        script.OutTween4,
        script.OutTween5
    ];

    // filter out empty tween names
    var validTweens = [];
    for (var i = 0; i < tweens.length; i++) {
        if (tweens[i] && tweens[i] !== "") {
            validTweens.push(tweens[i]);
        }
    }

    // if no valid tweens, call callback immediately
    if (validTweens.length === 0) {
        if (callback) callback();
        return;
    }

    // track how many tweens have completed
    var totalTweens = validTweens.length;
    var callbackCalled = false; // flag to ensure callback is only called once

    function onTweenComplete() {
        // when all tweens are done, wait for display delay then call the callback (only once)
        if (!callbackCalled) {
            callbackCalled = true;
            // add delay after tweens complete so animation can be seen
            var displayDelayEvent = script.createEvent("DelayedCallbackEvent");
            displayDelayEvent.bind(function () {
                if (callback) callback();
            });
            displayDelayEvent.reset(OUT_TWEEN_DISPLAY_DELAY);
        }
    }

    global.tweenManager.startTween(root, "StumpsLeft")
    global.tweenManager.startTween(root, "StumpsMiddle")
    global.tweenManager.startTween(root, "StumpsRight")
    global.tweenManager.startTween(root, "BellsLeft")
    global.tweenManager.startTween(root, "BellsRight")

    onTweenComplete();
}

function resetGameOnOut() {
    // Apply winning material when game is over
    setPlayerWinning();
    // update high score
    if (runs > highScore) {
        highScore = runs;
        persistentStorage.putFloat(highScoreKey, highScore);

        script.hitQualityDebugText.text = "NEW HIGH SCORE: " + highScore;
    }

    // Update high score text immediately (before script is disabled)
    if (script.highScoreText) {
        script.highScoreText.text = "High Score: " + highScore + "";
    }

    // submit high score to leaderboard
    if (script.Leaderboard && highScore > 0) {
        try {
            script.Leaderboard.submitScore(highScore);
            print("Submitted high score to leaderboard: " + highScore);
        } catch (err) {
            print("Error submitting high score to leaderboard: " + err);
        }
    }

    // destroy all active balls
    for (var i = activeBalls.length - 1; i >= 0; i--) {
        var e = activeBalls[i];
        if (e && e.instance) {
            try { e.instance.destroy(); } catch (err) { }
        }
    }
    activeBalls = [];

    // reset score, balls, and wickets
    runs = 0;
    ballsBowled = 0;
    wicketsRemaining = 3;
    
    // reset wicket image sprites
    resetWicketImageSprites();

    // Enable confetti object when game is over
    if (script.confettiObject) {
        script.confettiObject.enabled = true;
    }

    // Play tweens on game over object before resetting
    if (script.gameOverTweenObject) {
        try {
            global.tweenManager.startTween(script.gameOverTweenObject, "ScoreMove");
        } catch (e) {
            print("Error starting scoreMove tween: " + e);
        }
        try {
            global.tweenManager.startTween(script.gameOverTweenObject, "ScoreScale");
        } catch (e) {
            print("Error starting ScoreScale tween: " + e);
        }
    }

    // Disable script and enable StartButton
    if (script.StartButton) {
        script.StartButton.enabled = true;
    }
    script.getSceneObject().enabled = false;
}

function safeDestroyInstance(inst) {
    if (inst && inst.getTransform) {
        try { inst.destroy(); } catch (e) { }
    }
}

function removeBallEntry(inst) {
    for (var i = activeBalls.length - 1; i >= 0; i--) {
        if (activeBalls[i].instance === inst) {
            activeBalls.splice(i, 1);
        }
    }
}

// ---------- spawn / lifecycle ----------
function spawnObject() {
    // Disable screen break object when next ball starts
    if (script.screenBreakObject) {
        script.screenBreakObject.enabled = false;
    }
    
    // increment balls as this is a new delivery
    ballsBowled += 1;
    
    var spawnTime = Date.now() / 1000.0;
    
    // Select a random prefab from the array
    var selectedPrefab = null;
    if (script.myPrefabs && script.myPrefabs.length > 0) {
        // Use array of prefabs
        var randomIndex = Math.floor(Math.random() * script.myPrefabs.length);
        selectedPrefab = script.myPrefabs[randomIndex];
        print("Selected prefab: " + selectedPrefab.name);
    } else if (script.myPrefab) {
        // Fallback to single prefab for backward compatibility
        selectedPrefab = script.myPrefab;
    } else {
        print("Error: No prefabs assigned!");
        return;
    }
    
    // Use synchronous instantiate (instantiateAsync doesn't exist on ObjectPrefab)
    var instance = selectedPrefab.instantiate(script.spawnPosition);
    global.tweenManager.startTween(instance, "TweenToCenter");
    
    // Move ScreenTransform object on x-axis with random offset between 0 and -100
    if (script.objectToMove) {
        var screenTransform = script.objectToMove.getComponent('Component.ScreenTransform');
        if (screenTransform) {
            var randomOffset = Math.random() * -100.0; // Random value between 0 and -100
            var currentPos = screenTransform.position;
            screenTransform.position = new vec3(currentPos.x + randomOffset, currentPos.y, currentPos.z);
        } else {
            print("Warning: objectToMove does not have a ScreenTransform component");
        }
    }
    
    // Create ball entry
    var ballEntry = { instance: instance, spawnTime: spawnTime, hit: false };
    activeBalls.push(ballEntry);

    // hit window end -> timeout/out
    var hitWindowEndEvent = script.createEvent("DelayedCallbackEvent");
    hitWindowEndEvent.bind(function () {
        for (var i = 0; i < activeBalls.length; i++) {
            if (activeBalls[i].instance === instance) {
                if (!activeBalls[i].hit) {
                    onBallOut(activeBalls[i], "Timeout - OUT");
                }
                break;
            }
        }
    });
    hitWindowEndEvent.reset(HIT_WINDOW);

    // safety destroy
    var destroyEvent = script.createEvent("DelayedCallbackEvent");
    destroyEvent.bind(function () {
        safeDestroyInstance(instance);
        removeBallEntry(instance);
    });
    destroyEvent.reset(DESTROY_AFTER);
}

// ---------- tap / hit logic ----------
function onPlayerTap() {

    // Set callback to set idle material when animation completes
    script.animTex.control.setOnFinish(function () {
        setPlayerIdle();
    });

    script.animTex.control.play(1, 0.0);
    setPlayerShot();
    // trigger haptic feedback on touch
    try {
        global.hapticFeedbackSystem.playHapticFeedback(global.HapticFeedbackSystem.FeedbackType.Medium);
    } catch (e) {
        // haptic feedback not available on this device
    }

    var now = Date.now() / 1000.0;
    var best = null;
    var bestRemaining = Number.POSITIVE_INFINITY;

    for (var i = 0; i < activeBalls.length; i++) {
        var e = activeBalls[i];
        if (!e || !e.instance || !e.instance.getTransform) continue;
        if (e.hit) continue;
        var elapsed = now - e.spawnTime;
        if (elapsed < 0 || elapsed > HIT_WINDOW) continue;
        var remaining = HIT_WINDOW - elapsed;
        if (remaining < bestRemaining) {
            bestRemaining = remaining;
            best = e;
        }
    }

    if (!best) {
        script.hitQualityDebugText.text = "Tap: No hittable ball";
        // Reset to idle material if no ball was hit (animation callback will also handle this)
        // But we add a small delay to ensure it happens after the shot animation
        var noHitResetEvent = script.createEvent("DelayedCallbackEvent");
        noHitResetEvent.bind(function () {
            setPlayerIdle();
        });
        noHitResetEvent.reset(SHOT_ANIMATION_DELAY);
        return;
    }

    evaluateHit(best, bestRemaining);
}

function evaluateHit(ballEntry, remaining) {
    if (!ballEntry || !ballEntry.instance) return;
    ballEntry.hit = true;

    if (remaining <= PERFECT_THRESHOLD) {
        onBallHit(ballEntry, "Perfect"); // 6 runs
    } else if (remaining <= GOOD_THRESHOLD) {
        onBallHit(ballEntry, "Good"); // 4 runs
    } else if (remaining <= NORMAL_THRESHOLD) {
        onBallHit(ballEntry, "Normal"); // 2 runs
    } else if (remaining <= WEAK_THRESHOLD) {
        onBallHit(ballEntry, "Weak"); // 1 run
    } else {
        onBallOut(ballEntry, "Early Miss - OUT");
    }
}

function onBallHit(ballEntry, quality) {
    global.soundManager.playBatHit();
    var inst = ballEntry.instance;
    print("HIT! quality: " + quality);
    script.hitQualityDebugText.text = "HIT! quality: " + quality;

    // scoring
    var runsScored = 0;
    var oldScore = runs;
    if (quality === "Perfect") {
        global.soundManager.playPerfectHit();

        runsScored = 6;
        runs += 6;
    } else if (quality === "Good") {
        global.soundManager.playPerfectHit();

        runsScored = 4;
        runs += 4;
    } else if (quality === "Normal") {
        runsScored = 2;
        runs += 2;
    } else if (quality === "Weak") {
        runsScored = 1;
        runs += 1;
    }
    
    // Trigger score animation immediately when score changes
    if (runs !== oldScore) {
        animateScoreCount(oldScore, runs);
    }

    // Update current score text
    updateCurrentScoreText(runsScored);
    
    // Trigger audience animations based on runs scored
    try {
        if (runsScored === 6) {
            // Celebration animation for 6 runs (Perfect hit)
            global.audienceAnimationHandler.triggerCelebration();
            
            // Enable screen break object when player hits six
            if (script.screenBreakObject) {
                script.screenBreakObject.enabled = true;
            }
        } else if (runsScored === 4) {
            // Cheer animation for 4 runs (Good hit)
            global.audienceAnimationHandler.triggerCheer();
        }
    } catch (e) {
        print("Error triggering audience animation: " + e);
    }

    // Reset objectToMove x position to 0 after ball hit
    

    try {
        // randomly select between Shot1 and Shot2
        var shotTween = Math.random() < 0.5 ? "Shot1" : "Shot2";
        global.tweenManager.startTween(inst, "ShootBall");
    } catch (e) { }

    // delay before resetting to idle material after shot animation
    var shotAnimationEvent = script.createEvent("DelayedCallbackEvent");
    shotAnimationEvent.bind(function () {
        setPlayerIdle();
    });
    shotAnimationEvent.reset(SHOT_ANIMATION_DELAY);

    // delay destruction after hit
    var destroyEvent = script.createEvent("DelayedCallbackEvent");
    destroyEvent.bind(function () {
        if (script.objectToMove) {
            var screenTransform = script.objectToMove.getComponent('Component.ScreenTransform');
            if (screenTransform) {
                var currentPos = screenTransform.position;
                screenTransform.position = new vec3(0.0, currentPos.y, currentPos.z);
            }
        }
        safeDestroyInstance(inst);
        removeBallEntry(inst);
        // Ensure material is reset to idle after ball is destroyed
        setPlayerIdle();
    });
    destroyEvent.reset(DESTROY_DELAY_ON_HIT);
}

function onBallOut(ballEntry, reason) {
    global.soundManager.playOut();
    global.soundManager.playWicketLost();

    
    var inst = ballEntry.instance;
    print(reason);
    script.hitQualityDebugText.text = reason;

    safeDestroyInstance(inst);
    removeBallEntry(inst);

    // If it's an OUT (any reason that contains "OUT"), decrement wickets
    if (reason && reason.indexOf("OUT") !== -1) {
        // Show "OUT" in current score text
        updateCurrentScoreText("OUT");
        
        wicketsRemaining -= 1;
        
        // Trigger sad animation when player gets out
        try {
            global.audienceAnimationHandler.triggerSad();
        } catch (e) {
            print("Error triggering audience sad animation: " + e);
        }
        
        // Reset target to original position after every wicket
        resetTargetPosition();
        
        // Update wicket image sprite based on which wicket was lost
        // When wicketsRemaining goes from 3->2, update image 1
        // When wicketsRemaining goes from 2->1, update image 2
        // When wicketsRemaining goes from 1->0, update image 3
        var wicketNumber = 3 - wicketsRemaining; // 1, 2, or 3
        updateWicketImageSprite(wicketNumber);
        
        // Update wickets text display
        if (script.wicketsText) {
            script.wicketsText.text = "Wickets Remaining: " + wicketsRemaining;
        }
        
        // Play out tweens every time player gets out
        if (!isResetting) {
            isResetting = true;

            // Set out material when player gets out
            setPlayerOut();
            
            // Enable steamObject when out material is active
            if (script.steamObject) {
                script.steamObject.enabled = true;
            }

            // Reset to idle material after delay
            var outMaterialResetEvent = script.createEvent("DelayedCallbackEvent");
            outMaterialResetEvent.bind(function () {
                setPlayerIdle();
                
                // Disable steamObject when out material is reset
                if (script.steamObject) {
                    script.steamObject.enabled = false;
                }
            });
            outMaterialResetEvent.reset(OUT_OBJECT_DISPLAY_DELAY);

            playOutTweensSequentially(function () {
                // after all tweens complete, reset transforms immediately
                resetTransforms();

                // Only reset game when wickets reach 0
                if (wicketsRemaining <= 0) {
                    // delay before resetting the game
                    var resetDelayEvent = script.createEvent("DelayedCallbackEvent");
                    resetDelayEvent.bind(function () {
                        resetGameOnOut();
                        isResetting = false;
                    });
                    resetDelayEvent.reset(RESET_DELAY);
                } else {
                    // Still have wickets remaining, just reset the flag
                    isResetting = false;
                    script.hitQualityDebugText.text = reason + " (" + wicketsRemaining + " wickets remaining)";
                }
            });
        } else {
            // Still have wickets remaining, just show message
            script.hitQualityDebugText.text = reason + " (" + wicketsRemaining + " wickets remaining)";
        }
    }
}

// ---------- Debug HUD: show reverse countdown(s) + scoreboard ----------
function updateDebugHUD() {
    if (!script.debugText) return; // no debug text assigned

    var now = Date.now() / 1000.0;
    var lines = [];

    var bestRemaining = Number.POSITIVE_INFINITY;
    var bestIndex = -1;

    for (var i = 0; i < activeBalls.length; i++) {
        var e = activeBalls[i];
        if (!e || !e.instance) continue;
        var elapsed = now - e.spawnTime;
        var remaining = HIT_WINDOW - elapsed;
        // clamp for display
        if (remaining < 0) remaining = 0;
        if (remaining > HIT_WINDOW) remaining = HIT_WINDOW;
        lines.push(remaining.toFixed(2) + "s" + (e.hit ? " (hit)" : ""));
        script.secondsText.text = remaining.toFixed(2) + "s";
        if (!e.hit && remaining < bestRemaining) {
            bestRemaining = remaining;
            bestIndex = i;
        }
    }

    var bestLine = (bestIndex >= 0) ? ("Best: #" + bestIndex + " -> " + bestRemaining.toFixed(2) + "s") : "Best: -";
    var scoreLine = "Runs: " + runs + " | Balls: " + ballsBowled;
    var ballsActiveLine = "Active Balls: " + activeBalls.length;
    var highScoreLine = "High Score: " + highScore;

    script.debugText.text =
        "Runs: " + runs + " | Balls: " + ballsBowled +
        "\n" + "High Score: " + highScore +
        "\n" + ballsActiveLine +
        "\n" + lines.join("\n");

    // Animate score counting if it changed (only if not already animating)
    if (runs !== previousScore && !isAnimatingScore) {
        animateScoreCount(previousScore, runs);
    } else if (!isAnimatingScore) {
        // If not animating, just update directly
        script.scoreText.text = "Score : " + runs + "";
        previousScore = runs;
    }
    
    script.highScoreText.text = "High Score: " + highScore + "";
    
    // Update wickets remaining text
    if (script.wicketsText) {
        script.wicketsText.text = "Wickets Remaining: " + wicketsRemaining;
    }
}

// Update HUD every frame
var updateEvent = script.createEvent("UpdateEvent");
updateEvent.bind(function () {
    updateDebugHUD();
});

// ---------- input bindings ----------
var tapEvent = script.createEvent("TapEvent");
tapEvent.bind(function () { onPlayerTap(); });
storeInitialTransforms();
storeInitialWicketTextures();
storeInitialTargetPosition();
storeInitialPlayerMaterial();
storeInitialColorChangeColor();

// Make setPlayerIdle globally accessible for ButtonPressHandler
if (!global.gameController) {
    global.gameController = {};
}
global.gameController.setPlayerIdle = setPlayerIdle;

// spawn loop
var repeatEvent = script.createEvent("DelayedCallbackEvent");
repeatEvent.bind(function () {
    spawnObject();
    repeatEvent.reset(SPAWN_INTERVAL);
});
repeatEvent.reset(0.1);
