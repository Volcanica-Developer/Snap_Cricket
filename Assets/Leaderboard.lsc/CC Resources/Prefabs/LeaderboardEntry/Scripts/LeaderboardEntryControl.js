//@input vec4 defaultTextColor {"widget":"color"}
//@input vec4 currentUserTextColor {"widget":"color"}
//@input vec4 defaultBitmojiBackground {"widget":"color"}
//@input vec4 currentUserBitmojiBackground {"widget":"color"}
//@input vec4 defaultEntryBackground {"widget":"color"}
//@input vec4 currentUserEntryBackground {"widget":"color"}
// @input int displayNameLength = 15

//@ui {"widget":"group_start", "label":"Entry inputs"}
//@input Component.Text scoreText
//@input Component.Text[] displayNameTexts
//@input Component.Image bitmojiImage
//@input Component.Text placeText
//@input SceneObject medalSceneObject
//@input SceneObject placeSceneObject
//@input SceneObject currentUserBorderSceneObject
//@input Component.Image backgroundImage

//@input Asset.Texture invisiblePixel
//@input Asset.Material[] materials
//@ui {"widget":"group_end"}

const displayNameUtils = require("../../../Modules/DisplayNameUtils");

script.setEntryIndex = setEntryIndex;
script.setUserRecord = setUserRecord;
script.setBitmoji = setBitmoji;
script.setIsCurrentUserEntry = setIsCurrentUserEntry;
script.setAlpha = setAlpha;

let currentEntryIndex = 0;
let medalMaterial = null;
let bitmojiMaterial = null;
let backgroundMaterial = null;
const scoreIconMaterial = null;

function setIsCurrentUserEntry(isCurrent) {
    setColor(isCurrent);
    script.currentUserBorderSceneObject.enabled = isCurrent;
}

function setColor(isCurrentUser) {
    if (isCurrentUser) {
        script.displayNameTexts.forEach((displayNameText) => {
            displayNameText.textFill.color = script.currentUserTextColor;
        });
        script.scoreText.textFill.color = script.currentUserTextColor;
        script.placeText.textFill.color = script.currentUserTextColor;

        bitmojiMaterial.mainPass.bgColor = script.currentUserBitmojiBackground;
        backgroundMaterial.mainPass.bgColor = script.currentUserEntryBackground;

        if (scoreIconMaterial) {
            scoreIconMaterial.mainPass.textureSwitcher = 1;
        }
    } else {
        script.displayNameTexts.forEach((displayNameText) => {
            displayNameText.textFill.color = script.defaultTextColor;
        });
        script.scoreText.textFill.color = script.defaultTextColor;
        script.placeText.textFill.color = script.defaultTextColor;

        bitmojiMaterial.mainPass.bgColor = script.defaultBitmojiBackground;
        backgroundMaterial.mainPass.bgColor = script.defaultEntryBackground;

        if (scoreIconMaterial) {
            scoreIconMaterial.mainPass.textureSwitcher = 0;
        }
    }

    setAlpha(bitmojiMaterial.mainPass.CustomAlpha);
}

function setEntryIndex(entryIndex) {
    if (isNull(entryIndex)) {
        return;
    }

    currentEntryIndex = entryIndex;

    if (entryIndex <= 3 && entryIndex >= 1) {
        script.medalSceneObject.enabled = true;
        script.placeSceneObject.enabled = false;

        if (medalMaterial) {
            medalMaterial.mainPass.medalType = entryIndex - 1;
        }
    } else {
        script.medalSceneObject.enabled = false;
        script.placeSceneObject.enabled = true;

        const leaderboardPlace = entryIndex;
        const entryIndexString = leaderboardPlace <= 999 ? ("#" + leaderboardPlace) : "999+";

        script.placeText.text = entryIndexString;
    }
}

function getMedalImage() {
    return script.medalSceneObject.getComponent("Component.Image");
}

function setBitmoji(bitmoji) {
    if (!isNull(bitmojiMaterial) && !isNull(bitmoji)) {
        bitmojiMaterial.mainPass.bitmojiTex = bitmoji;
    } else {
        bitmojiMaterial.mainPass.bitmojiTex = script.invisiblePixel;
    }
}

function setUserRecord(userRecord, isGlobalLeaderboard) {
    setDisplayName("");

    if (isNull(userRecord)) {
        return;
    }

    if (!isNull(userRecord.score)) {
        script.scoreText.text = userRecord.score + "";
    }

    if (userRecord.snapchatUser && !isNull(userRecord.snapchatUser.displayName) && userRecord.snapchatUser.displayName !== "") {
        setDisplayName(displayNameUtils.formatDisplayName(userRecord.snapchatUser.displayName, script.displayNameLength) + "");
    } else {
        if (!isGlobalLeaderboard && userRecord.snapchatUser && !isNull(userRecord.snapchatUser.userName)) {
            setDisplayName(userRecord.snapchatUser.userName);
        }
    }
}

function setDisplayName(displayName) {
    script.displayNameTexts.forEach((displayNameText) => {
        displayNameText.text = displayName;
    });
}

const originalTextsAlpha = {};

function setAlpha(alpha) {
    script.materials.forEach((material) => {
        material.mainPass.CustomAlpha = alpha;
    });
    [
        ...script.displayNameTexts,
        script.scoreText,
        script.placeText
    ].forEach((textComp) => {
        if (!(textComp.uniqueIdentifier in originalTextsAlpha)) {
            originalTextsAlpha[textComp.uniqueIdentifier] = textComp.textFill.color.a;
        }
        const original = originalTextsAlpha[textComp.uniqueIdentifier];
        const currentColor = textComp.textFill.color;
        currentColor.a = alpha * original;
        textComp.textFill.color = currentColor;
    });
    bitmojiMaterial.mainPass.CustomAlpha = alpha;
    backgroundMaterial.mainPass.CustomAlpha = alpha;
    getMedalImage().mainMaterial.mainPass.CustomAlpha = alpha;
}

function initialize() {
    medalMaterial = getMedalImage().mainMaterial.clone();
    getMedalImage().mainMaterial = medalMaterial;

    bitmojiMaterial = script.bitmojiImage.mainMaterial.clone();
    script.bitmojiImage.mainMaterial = bitmojiMaterial;

    backgroundMaterial = script.backgroundImage.mainMaterial.clone();
    script.backgroundImage.mainMaterial = backgroundMaterial;
}

initialize();
