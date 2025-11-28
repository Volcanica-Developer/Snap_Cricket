// EndGame.js
// Version: 1.0.0
// Event: Tapped
// Description: Calls the end game api on Tapped

// @input Component.ScriptComponent highScoreController

function onTap(){
    script.highScoreController.endGame();
}

var tapEvent = script.createEvent("TouchStartEvent");
tapEvent.bind(onTap);