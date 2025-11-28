//@input Component.ScreenTransform entriesParentScreenTransform
//@input Component.ScreenTransform entriesHeaderScreenTransform
//@input Component.ScreenTransform entriesTouchZoneScreenTransform
//@input Component.ScreenTransform entriesScreenTransform
//@input Component.ScreenTransform entriesNormalizedScreenTransform
//@input Component.ScreenTransform entriesFooterScreenTransform
//@input Component.ScreenTransform backgroundCustomisationScreenTransform

//@input SceneObject touchZoneSceneObject
//@input SceneObject entriesSceneObject
//@input SceneObject regularHeaderChild
//@input SceneObject leaderboardEntriesHeader
//@input SceneObject leaderboardEntriesFooter

//@input Component.Text globalExactRankText
//@input Component.Text timeText
//@input Component.Text headerTopScore
//@input Component.Text resetsText
//@input Component.Text leaderboardName

//@input Component.Image bitmojiHeaderImage
//@input Component.Image customTextureImage

//@input Asset.Material timerMaterial
//@input Asset.Material invisibleMaterial
//@input Asset.Material[] materials

//@input SceneObject[] postEffects
//@input SceneObject[] timerSceneObjects

//@input Component.MaskingComponent masking

script.getEntriesSceneObject = getEntriesSceneObject;
script.getEntriesParentScreenTransform = getEntriesParentScreenTransform;
script.getEntriesScreenTransform = getEntriesScreenTransform;
script.getEntriesFooterScreenTransform = getEntriesFooterScreenTransform;
script.getEntriesTouchZoneScreenTransform = getEntriesTouchZoneScreenTransform;
script.getTouchZoneSceneObject = getTouchZoneSceneObject;
script.getEntriesHeaderScreenTransform = getEntriesHeaderScreenTransform;
script.setCurrentUserRecord = setCurrentUserRecord;
script.setHeaderEnabled = setHeaderEnabled;
script.setFooterEnabled = setFooterEnabled;
script.setFixedSizedTextureHeader = setFixedSizedTextureHeader;
script.setPostEffectsEnabled = setPostEffectsEnabled;
script.setLeaderboardName = setLeaderboardName;
script.setTimeLeftText = setTimeLeftText;
script.setResetText = setResetText;
script.setTimerUiEnabled = setTimerUiEnabled;
script.getInvisibleMaterial = getInvisibleMaterial;
script.setRegularHeaderChildEnabled = setRegularHeaderChildEnabled;
script.setHeaderTopScore = setHeaderTopScore;
script.getBackgroundCustomisationScreenTransform = getBackgroundCustomisationScreenTransform;
script.setBitmojiTextureHeader = setBitmojiTextureHeader;
script.setMaskingRadius = setMaskingRadius;
script.getAlpha = getAlpha;
script.setAlpha = setAlpha;

function getBackgroundCustomisationScreenTransform() {
    return script.backgroundCustomisationScreenTransform;
}

function getEntriesScreenTransform() {
    return script.entriesScreenTransform;
}

function getEntriesSceneObject() {
    return script.entriesSceneObject;
}

function getEntriesHeaderScreenTransform() {
    return script.entriesHeaderScreenTransform;
}

function getEntriesFooterScreenTransform() {
    return script.entriesFooterScreenTransform;
}

function getEntriesParentScreenTransform() {
    return script.entriesParentScreenTransform;
}

function getEntriesTouchZoneScreenTransform() {
    return script.entriesTouchZoneScreenTransform;
}

function getTouchZoneSceneObject() {
    return script.touchZoneSceneObject;
}

function setHeaderEnabled(enabled) {
    script.leaderboardEntriesHeader.enabled = enabled;
}

function setFooterEnabled(enabled) {
    script.leaderboardEntriesFooter.enabled = enabled;
}

function setRegularHeaderChildEnabled(enabled) {
    script.regularHeaderChild.enabled = enabled;
}

function setHeaderTopScore(score) {
    script.headerTopScore.text = score + "";
}

function setCurrentUserRecord(userRecord) {
    const isGlobalRankPercentileAvailable = !isNull(userRecord.globalRankPercentile) && userRecord.globalRankPercentile !== undefined && userRecord.globalRankPercentile !== 0;
    const isGlobalExactRankAvailable = !isNull(userRecord.globalExactRank) && userRecord.globalExactRank !== undefined && userRecord.globalExactRank !== 0;

    if (isGlobalExactRankAvailable) {
        script.globalExactRankText.text = userRecord.globalExactRank + "";
    }
}

function setFixedSizedTextureHeader(texture) {
    script.customTextureImage.getSceneObject().enabled = true;
    script.customTextureImage.mainPass.baseTex = texture;
}

function setBitmojiTextureHeader(bitmoji) {
    script.bitmojiHeaderImage.getSceneObject().enabled = true;
    script.bitmojiHeaderImage.mainPass.baseTex = bitmoji;
}

function setPostEffectsEnabled(enabled) {
    script.postEffects.forEach((so) => so.enabled = enabled);
}

function setLeaderboardName(leaderboardName) {
    script.leaderboardName.text = leaderboardName;
}

function setTimeLeftText(text) {
    script.timeText.text = text;
}

function setResetText(text) {
    script.resetsText.text = text;
}

function setTimerUiEnabled(enabled) {
    script.timerSceneObjects.forEach((scObj) => {
        scObj.enabled = enabled;
    });
}

function getInvisibleMaterial() {
    return script.invisibleMaterial;
}

function setMaskingRadius(radius) {
    script.masking.cornerRadius = radius;
}

const originalTextsAlpha = {};

function getAlpha() {
    return script.materials[0].mainPass.CustomAlpha;
}

function setAlpha(alpha) {
    script.materials.forEach((material) => {
        material.mainPass.CustomAlpha = alpha;
    });
    [
        script.globalExactRankText,
        script.timeText,
        script.headerTopScore,
        script.resetsText,
        script.leaderboardName
    ].forEach((textComp) => {
        if (!(textComp.uniqueIdentifier in originalTextsAlpha)) {
            originalTextsAlpha[textComp.uniqueIdentifier] = textComp.textFill.color.a;
        }
        const original = originalTextsAlpha[textComp.uniqueIdentifier];
        const color = textComp.textFill.color;
        color.a = alpha * original;
        textComp.textFill.color = color;
    });
}
