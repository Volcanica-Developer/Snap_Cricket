# Leaderboard

**Leaderboard** Custom Component is an all-in-one, UI-powered solution for adding social competition to your game.
It enables real-time score tracking, Bitmoji driven visual ranking, and customizable UI states like the Score Widget and Side Switcher — all designed to feel native to the Snapchat experience.

## Usage

In the Scene Panel:

1. Add the Leaderboard custom component to the hierarchy within Orthographic Camera.
2. Ensure the Render Layer matches with the Orthographic Camera.
3. Add Canvas component to the Orthographic Camera



## API

| Name                                                                                              | Description                                                                                                    |
|---------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------|
| `submitScore(score: number)`: void                                                                | Submits score to leaderboard. Does not wait for the score to be submitted.                                     |
| `submitScoreAsync(score: number)`: Promise&lt;void&gt;                                            | Submits score to leaderboard asynchronously. The Promise is resolved once the score is submitted successfully. |
| `show(duration?: number)`: void                                                                   | Shows table with scores.                                                                                       |
| `hide(duration?: number)`: void                                                                   | Hides table with scores.                                                                                       |
| `initializeWithOptions(leaderboardInitializationOptions: LeaderboardInitializationOptions)`: void | Initializes leaderboard from code.                                                                             |
| `getLeaderboard()`: Promise&lt;Leaderboard&gt;                                                    | Returns Leaderboard object.                                                                                    |
| `getCurrentUser()`: Promise&lt;SnapchatUser&gt;                                                   | Returns the SnapchatUser object for the current user.                                                          |
| `getCurrentUserBitmoji()`: Promise&lt;Texture&gt;                                                 | Returns texture with current user bitmoji sticker.                                                             |
| `getSideSwitcher()`: SideSwitcher                                                                 | Returns SideSwitcher custom component.                                                                         |
| `showScoreWidget(duration?: number)`: void                                                        | Shows score widget.                                                                                            |
| `hideScoreWidget(duration?: number)`: void                                                        | Hides score widget.                                                                                            |
| `setLeaderboardName(name: string)`: void                                                          | Sets custom name of the leaderboard.                                                                           |
| `visible:`: boolean                                                                               | Shows if leaderboard is visible.                                                                               |
| `isScoreWidgetReady`: boolean                                                                     | Returns the current sprint speed.                                                                              |

## API Events

| Name                                                                  | Description                                                                                                                                                                                                                                                                                                       |
|-----------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `onLeaderboardRecordsUpdated`: Event&lt;LeaderboardRecordsWrapper&gt; | Triggers when any records are updated and returns a LeaderboardRecordsWrapper object. This object contains two properties: <br/>**_userRecords_**: UserRecord[] – An array of records for all players.<br/>**_currentUserRecord_**: UserRecord \| null – The record for the current user, or null if none exists. |
| `onScoreSubmittedSuccess`: Event&lt;LeaderboardRecordsWrapper&gt;     | Triggers when a score has been submitted successfully and returns a LeaderboardRecordsWrapper object like `onLeaderboardRecordsUpdated`                                                                                                                                                                           |
| `onShow`: Event                                                       | Triggered when showing animation started.                                                                                                                                                                                                                                                                         |
| `onHide`: Event                                                       | Triggered when hiding animation started.                                                                                                                                                                                                                                                                          |
| `onShown`: Event                                                      | Triggered when showing animation finished.                                                                                                                                                                                                                                                                        |
| `onHidden`: Event                                                     | Triggered when hiding animation finished.                                                                                                                                                                                                                                                                         |

## Examples

Subscribing on score updates.
This object contains two properties:

```
//@input Component.ScriptComponent Leaderboard

script.Leaderboard.onLeaderboardRecordsUpdated.add(
  (leaderboardRecordsWrapper) => {
    print(leaderboardRecordsWrapper.userRecords);
    print(leaderboardRecordsWrapper.currentUserRecord);
  }
);
```

Initialization from code.

```
//@input Component.ScriptComponent Leaderboard

script.Leaderboard.getSideSwitcher().hide();
script.Leaderboard.initializeWithOptions({
  name: 'name',
  userType: Leaderboard.UsersType.Friends,
  scoreOrdering: Leaderboard.OrderingType.Descending,
  userLimit: 10,
  scoreResetInterval: script.Leaderboard.ScoreResetIntervalOption.Week,
  useTimer: true,
  leaderboardStartDate: '9/27/2024',
});
script.Leaderboard.setLeaderboardName('Custom leaderboard');

const tap = script.createEvent('TapEvent');
tap.bind(() => {
  script.Leaderboard.submitScore(Math.ceil(Math.random() * 100));
});
```
