//@input Asset.ObjectPrefab myPrefab
//@input string BeforeBounce_Tween
//@input string AfterBounce_Tween
//@input Component.Text debugText   // assign your Text component here
//@input Component.Text hitQualityDebugText   // assign your Text component here
//@input Component.Text secondsText
//@input Component.Text scoreText
//@input Component.Text highScoreText
//@input Component.ScriptComponent Leaderboard   // assign your Leaderboard component here

// CONFIG
var SPAWN_INTERVAL = 5.0;        // seconds between spawns
var HIT_WINDOW = 2.0;            // seconds player has to hit (counts down 2 -> 0)
var DESTROY_AFTER = 5.0;         // safety destroy

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

// internals
var root = script.getSceneObject();
var activeBalls = []; // array of { instance, spawnTime, hit }

var highScoreKey = "cricket_high_score";

var persistentStorage = global.persistentStorageSystem.store;
var highScore = persistentStorage.getFloat(highScoreKey) || 0;  



// ---------- helpers ----------
function resetGameOnOut() {

    // update high score
    if (runs > highScore) { 
        highScore = runs;
        persistentStorage.putFloat(highScoreKey, highScore);

        script.hitQualityDebugText.text = "NEW HIGH SCORE: " + highScore;
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
            try { e.instance.destroy(); } catch (err) {}
        }
    }
    activeBalls = [];

    // reset score and balls
    runs = 0;
    ballsBowled = 0;
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
    var instance = script.myPrefab.instantiate(root);
    instance.getTransform().setWorldPosition(new vec3(0, 0, 20));

    global.tweenManager.startTween(instance, "Rotation_Tween");
    global.tweenManager.startTween(instance, script.BeforeBounce_Tween, function () {
        global.tweenManager.startTween(instance, script.AfterBounce_Tween);
    });

    // increment balls as this is a new delivery
    ballsBowled += 1;

    var spawnTime = Date.now() / 1000.0;
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
    var inst = ballEntry.instance;
    print("HIT! quality: " + quality);
    script.hitQualityDebugText.text = "HIT! quality: " + quality;

    // scoring
    if (quality === "Perfect") {
        runs += 6;
    } else if (quality === "Good") {
        runs += 4;
    } else if (quality === "Normal") {
        runs += 2;
    } else if (quality === "Weak") {
        runs += 1;
    }   

    try {
        global.tweenManager.startTween(inst, "Hit_Flyaway_Tween");
    } catch (e) { }
    safeDestroyInstance(inst);
    removeBallEntry(inst);
}

function onBallOut(ballEntry, reason) {
    var inst = ballEntry.instance;
    print(reason);
    script.hitQualityDebugText.text = reason;

    try {
        global.tweenManager.startTween(inst, "Miss_Fall_Tween");
    } catch (e) { }
    safeDestroyInstance(inst);
    removeBallEntry(inst);

    // If it's an OUT (any reason that contains "OUT"), reset balls & score
    if (reason && reason.indexOf("OUT") !== -1) {
        resetGameOnOut();
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
        
    script.scoreText.text = "SCORE : " +runs + "";
    script.highScoreText.text = "HIGHSCORE : " + highScore + "";
}

// Update HUD every frame
var updateEvent = script.createEvent("UpdateEvent");
updateEvent.bind(function () {
    updateDebugHUD();
});

// ---------- input bindings ----------
var tapEvent = script.createEvent("TapEvent");
tapEvent.bind(function () { onPlayerTap(); });

    // var blinkEvent = script.createEvent("EyeBlinkEvent");
    // blinkEvent.bind(function () {
    //     onPlayerTap();   // now blink triggers hit
    // });

// spawn loop
var repeatEvent = script.createEvent("DelayedCallbackEvent");
repeatEvent.bind(function () {
    spawnObject();
    repeatEvent.reset(SPAWN_INTERVAL);
});
repeatEvent.reset(0.1);
