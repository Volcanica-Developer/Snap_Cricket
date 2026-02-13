//@input Asset.AudioTrackAsset batHitSound   // sound to play when bat hits ball
//@input Asset.AudioTrackAsset outSound   // sound to play when player gets out
//@input Asset.AudioTrackAsset perfectHitSound   // sound to play for perfect hit
//@input Asset.AudioTrackAsset goodHitSound   // sound to play for good hit
//@input Asset.AudioTrackAsset normalHitSound   // sound to play for normal hit
//@input Asset.AudioTrackAsset weakHitSound   // sound to play for weak hit
//@input Asset.AudioTrackAsset ballSpawnSound   // sound to play when ball spawns
//@input Asset.AudioTrackAsset wicketLostSound   // sound to play when wicket is lost
//@input Asset.AudioTrackAsset gameOverSound   // sound to play when game is over
//@input Asset.AudioTrackAsset bgSound   // background sound to play after initialization
//@input float volume = 1.0   // volume for sounds (0.0 to 1.0)
//@input float fadeIn = 0.0   // fade in duration in seconds
//@input float fadeOut = 0.0   // fade out duration in seconds

// Pre-instantiated audio components (created at startup, never destroyed)
var audioComponents = {};

// Debouncing to prevent sounds from playing multiple times
var lastPlayTimes = {}; // Track last play time for each audio track
var SOUND_DEBOUNCE_TIME = 0.1; // Minimum time between playing the same sound (in seconds)

// Initialize all audio components at startup
function initializeAudioComponents() {
    var rootObject = script.getSceneObject();
    
    // Create audio components for each sound
    if (script.batHitSound) {
        var audioComp = rootObject.createComponent("Component.AudioComponent");
        audioComp.audioTrack = script.batHitSound;
        audioComp.volume = script.volume;
        if (script.fadeIn > 0) audioComp.fadeInTime = script.fadeIn;
        if (script.fadeOut > 0) audioComp.fadeOutTime = script.fadeOut;
        audioComponents.batHit = audioComp;
    }
    
    if (script.outSound) {
        var audioComp = rootObject.createComponent("Component.AudioComponent");
        audioComp.audioTrack = script.outSound;
        audioComp.volume = script.volume;
        if (script.fadeIn > 0) audioComp.fadeInTime = script.fadeIn;
        if (script.fadeOut > 0) audioComp.fadeOutTime = script.fadeOut;
        audioComponents.out = audioComp;
    }
    
    if (script.perfectHitSound) {
        var audioComp = rootObject.createComponent("Component.AudioComponent");
        audioComp.audioTrack = script.perfectHitSound;
        audioComp.volume = script.volume;
        if (script.fadeIn > 0) audioComp.fadeInTime = script.fadeIn;
        if (script.fadeOut > 0) audioComp.fadeOutTime = script.fadeOut;
        audioComponents.perfectHit = audioComp;
    }
    
    if (script.goodHitSound) {
        var audioComp = rootObject.createComponent("Component.AudioComponent");
        audioComp.audioTrack = script.goodHitSound;
        audioComp.volume = script.volume;
        if (script.fadeIn > 0) audioComp.fadeInTime = script.fadeIn;
        if (script.fadeOut > 0) audioComp.fadeOutTime = script.fadeOut;
        audioComponents.goodHit = audioComp;
    }
    
    if (script.normalHitSound) {
        var audioComp = rootObject.createComponent("Component.AudioComponent");
        audioComp.audioTrack = script.normalHitSound;
        audioComp.volume = script.volume;
        if (script.fadeIn > 0) audioComp.fadeInTime = script.fadeIn;
        if (script.fadeOut > 0) audioComp.fadeOutTime = script.fadeOut;
        audioComponents.normalHit = audioComp;
    }
    
    if (script.weakHitSound) {
        var audioComp = rootObject.createComponent("Component.AudioComponent");
        audioComp.audioTrack = script.weakHitSound;
        audioComp.volume = script.volume;
        if (script.fadeIn > 0) audioComp.fadeInTime = script.fadeIn;
        if (script.fadeOut > 0) audioComp.fadeOutTime = script.fadeOut;
        audioComponents.weakHit = audioComp;
    }
    
    if (script.ballSpawnSound) {
        var audioComp = rootObject.createComponent("Component.AudioComponent");
        audioComp.audioTrack = script.ballSpawnSound;
        audioComp.volume = script.volume;
        if (script.fadeIn > 0) audioComp.fadeInTime = script.fadeIn;
        if (script.fadeOut > 0) audioComp.fadeOutTime = script.fadeOut;
        audioComponents.ballSpawn = audioComp;
    }
    
    if (script.wicketLostSound) {
        var audioComp = rootObject.createComponent("Component.AudioComponent");
        audioComp.audioTrack = script.wicketLostSound;
        audioComp.volume = script.volume;
        if (script.fadeIn > 0) audioComp.fadeInTime = script.fadeIn;
        if (script.fadeOut > 0) audioComp.fadeOutTime = script.fadeOut;
        audioComponents.wicketLost = audioComp;
    }
    
    if (script.gameOverSound) {
        var audioComp = rootObject.createComponent("Component.AudioComponent");
        audioComp.audioTrack = script.gameOverSound;
        audioComp.volume = script.volume;
        if (script.fadeIn > 0) audioComp.fadeInTime = script.fadeIn;
        if (script.fadeOut > 0) audioComp.fadeOutTime = script.fadeOut;
        audioComponents.gameOver = audioComp;
    }
    
    if (script.bgSound) {
        var audioComp = rootObject.createComponent("Component.AudioComponent");
        audioComp.audioTrack = script.bgSound;
        audioComp.volume = script.volume;
        if (script.fadeIn > 0) audioComp.fadeInTime = script.fadeIn;
        if (script.fadeOut > 0) audioComp.fadeOutTime = script.fadeOut;
        audioComponents.bgSound = audioComp;
    }
    
    print("SoundManager: Initialized " + Object.keys(audioComponents).length + " audio components");
    
    // Play background sound after all sounds are initialized
    if (script.bgSound && audioComponents.bgSound) {
        try {
            audioComponents.bgSound.play(1);
            print("SoundManager: Playing background sound");
        } catch (e) {
            print("SoundManager: Error playing background sound: " + e);
        }
    }
}

// Function to play a pre-instantiated sound
function playSound(componentKey) {
    var audioComp = audioComponents[componentKey];
    if (!audioComp) {
        return;
    }
    
    // Debounce: prevent playing the same sound multiple times within a short time window
    var currentTime = getTime();
    
    if (lastPlayTimes[componentKey]) {
        var timeSinceLastPlay = currentTime - lastPlayTimes[componentKey];
        if (timeSinceLastPlay < SOUND_DEBOUNCE_TIME) {
            return; // Skip playing if too soon since last play
        }
    }
    
    // Update last play time
    lastPlayTimes[componentKey] = currentTime;
    
    try {
        audioComp.play(1);
    } catch (e) {
        print("SoundManager: Error playing sound: " + e);
    }
}

// Play bat hit sound
function playBatHit() {
    playSound("batHit");
}

// Play out sound
function playOut() {
    playSound("out");
}

// Play perfect hit sound
function playPerfectHit() {
    playSound("perfectHit");
}

// Play good hit sound
function playGoodHit() {
    playSound("goodHit");
}

// Play normal hit sound
function playNormalHit() {
    playSound("normalHit");
}

// Play weak hit sound
function playWeakHit() {
    playSound("weakHit");
}

// Play ball spawn sound
function playBallSpawn() {
    playSound("ballSpawn");
}

// Play wicket lost sound
function playWicketLost() {
    playSound("wicketLost");
}

// Play game over sound
function playGameOver() {
    playSound("gameOver");
}

// Initialize audio components at startup
initializeAudioComponents();

// Make functions accessible globally (only initialize once to prevent multiple initializations)
if (!global.soundManager) {
    global.soundManager = {
        playBatHit: playBatHit,
        playOut: playOut,
        playPerfectHit: playPerfectHit,
        playGoodHit: playGoodHit,
        playNormalHit: playNormalHit,
        playWeakHit: playWeakHit,
        playBallSpawn: playBallSpawn,
        playWicketLost: playWicketLost,
        playGameOver: playGameOver
    };
}


