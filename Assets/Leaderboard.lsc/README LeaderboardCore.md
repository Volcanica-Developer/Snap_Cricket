# Leaderboard Core

**LeaderboardCore** is a lightweight, logic-only component that powers real-time score tracking via Snapchat’s leaderboard system.
This component exposes all core leaderboard APIs — including initialization, score submission, and user rank queries — while letting developers handle their own custom visuals and game logic.

## Usage

In the Scene Panel:

1. Add the Leaderboard Core component to the scene hierarchy.
2. Use your own script with Leaderboard Core as an input to interact with the component.
3. Use the provided APIs to submit scores and subscribe to updates.

## API

| Name                                                                                   | Description                                                                                                    |
|----------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------|
| `submitScore(score: number)`: void                                                     | Submits score to leaderboard. Does not wait for the score to be submitted.                                     |
| `submitScoreAsync(score: number)`: Promise&lt;void&gt;                                 | Submits score to leaderboard asynchronously. The Promise is resolved once the score is submitted successfully. |
| `initializeWithOptions(initializationOptions: LeaderboardInitializationOptions)`: void | Initializes leaderboard from code.                                                                             |
| `getLeaderboard()`: Promise&lt;Leaderboard&gt;                                         | Returns Leaderboard object.                                                                                    |
| `getCurrentUser()`: Promise&lt;SnapchatUser&gt;                                        | Returns the SnapchatUser object for the current user.                                                          |
| `getCurrentUserBitmoji()`: Promise&lt;Texture&gt;                                      | Returns texture with current user bitmoji sticker.                                                             |

## API Events

| Name                                                                  | Description                                                                                                                                                                                                                                                                                                       |
|-----------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `onLeaderboardRecordsUpdated`: Event&lt;LeaderboardRecordsWrapper&gt; | Triggers when any records are updated and returns a LeaderboardRecordsWrapper object. This object contains two properties: <br/>**_userRecords_**: UserRecord[] – An array of records for all players.<br/>**_currentUserRecord_**: UserRecord \| null – The record for the current user, or null if none exists. |
| `onScoreSubmittedSuccess`: Event&lt;LeaderboardRecordsWrapper&gt;     | Triggers when a score has been submitted successfully and returns a LeaderboardRecordsWrapper object like `onLeaderboardRecordsUpdated`                                                                                                                                                                           |

## Examples

Subscribing on score updates.

```javascript
//@input Component.ScriptComponent LeaderboardCore

script.LeaderboardCore.onLeaderboardRecordsUpdated.add(
    (leaderboardRecordsWrapper) => {
        print(leaderboardRecordsWrapper.userRecords);
        print(leaderboardRecordsWrapper.currentUserRecord);
    }
);
```

Manual initialization from code.

```javascript
//@input Component.ScriptComponent LeaderboardCore

script.LeaderboardCore.initializeWithOptions({
    name: 'name',
    userType: Leaderboard.UsersType.Friends,
    scoreOrdering: Leaderboard.OrderingType.Descending,
    userLimit: 10,
    scoreResetInterval: script.LeaderboardCore.ScoreResetIntervalOption.Week,
    useTimer: true,
    leaderboardStartDate: '9/27/2024',
});

const tap = script.createEvent('TapEvent');
tap.bind(() => {
    script.LeaderboardCore.submitScore(Math.ceil(Math.random() * 100));
});
```
