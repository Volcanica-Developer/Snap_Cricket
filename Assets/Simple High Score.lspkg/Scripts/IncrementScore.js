// IncrementScore.js
// Version: 1.0.0
// Event: Tapped
// Description: Calls the increment score api on Tapped

// @input Component.ScriptComponent highScoreController

function onTap(){
    script.highScoreController.incrementScore();
}

var tapEvent = script.createEvent("TouchStartEvent");
tapEvent.bind(onTap);