//@input Component.Text[] texts
//@input SceneObject[] widgets
//@input Component.Text currentUserScore
//@input Component.Text friendsPlayedText
//@input Asset.Material bitmojiMaterialLeft
//@input Asset.Material bitmojiMaterialMiddle
//@input Asset.Material bitmojiMaterialRight
//@input Asset.Material[] materials
//@input Asset.Material[] bimojiMaterials
//@input vec4 bgColorLeft {"widget":"color"}
//@input vec4 bgColorMiddle{"widget":"color"}
//@input vec4 bgColorRight{"widget":"color"}

script.setActiveWidget = setActiveWidget;
script.setBitmojiTetxures = setBitmojiTetxures;
script.setCurrentUserScoreAndEnableVisual = setCurrentUserScoreAndEnableVisual;
script.setAlpha = setAlpha;
script.getAlpha = getAlpha;
script.setFriendsPlayedText = setFriendsPlayedText;

let currentAlpha = 1;

function setActiveWidget(widgetId) {
    script.widgets.forEach((so) => so.enabled = false);
    script.widgets[widgetId].enabled = true;
}

function setBitmojiTetxures(bitmojiTexturesArray) {
    bitmojiTexturesArray.forEach((material, idx) => {
        if (idx === 0) {
            script.bitmojiMaterialLeft.mainPass.bitmojiTex = bitmojiTexturesArray[idx];
            script.bitmojiMaterialLeft.mainPass.bgColor = script.bgColorLeft;
        } else if (idx === bitmojiTexturesArray.length - 1) {
            const middleColor = bitmojiTexturesArray.length === 2 ? script.bgColorMiddle : script.bgColorRight;
            script.bitmojiMaterialRight.mainPass.bitmojiTex = bitmojiTexturesArray[idx];
            script.bitmojiMaterialRight.mainPass.bgColor = middleColor;
        } else {
            script.bitmojiMaterialMiddle.mainPass.bitmojiTex = bitmojiTexturesArray[idx];
            script.bitmojiMaterialMiddle.mainPass.bgColor = script.bgColorMiddle;
        }
    });
}

function setCurrentUserScoreAndEnableVisual(score) {
    script.currentUserScore.text = score + "";
    script.currentUserScore.getSceneObject().enabled = true;
}

function setAlpha(alpha) {
    script.materials.forEach((material) => {
        material.mainPass.CustomAlpha = alpha;
    });
    script.texts.forEach((textComp) => {
        const currentColor = textComp.textFill.color;
        currentColor.a = alpha;
        textComp.textFill.color = currentColor;
    });
    currentAlpha = alpha;
}

function getAlpha() {
    return currentAlpha;
}

function setFriendsPlayedText(text) {
    script.friendsPlayedText.text = text;
}
