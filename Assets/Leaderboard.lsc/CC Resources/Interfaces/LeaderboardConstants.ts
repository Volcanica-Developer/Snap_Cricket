export namespace LeaderboardConstants {
    export namespace FullLeaderboard {
        export const PRELOAD_ENTRY_COUNT = 20;
        export const VISIBLE_ENTRIES_COUNT = 3;
        export const ENTRY_SIZE_Y = 2 / VISIBLE_ENTRIES_COUNT;
        export const ENTRIES_LIMIT_TOP_POSITION_Y = 1;
        export const ENTRIES_NEEDED_FOR_SCROLL = 4;

        export const MIN_Y_COORD_TO_SHOW_ENTRY = -1 - ENTRY_SIZE_Y / 2;
        export const MAX_Y_COORD_TO_SHOW_ENTRY = 1 + ENTRY_SIZE_Y;

        export const ENTRIES_BOTTOM_LIMIT_POSITION_HEADER = -1 + ENTRY_SIZE_Y / 2;
        export const ENTRIES_BOTTOM_LIMIT_POSITION_NO_HEADER = -1 + ENTRY_SIZE_Y / 2;
        export const ENTRIES_TOP_LIMIT_POSITION = ENTRIES_LIMIT_TOP_POSITION_Y - ENTRY_SIZE_Y / 2;

        export const MASKING_CORNER_RADIUS_POINTS = 40;
        export const MASKING_CORNER_RADIUS_WORLD = 0.40;

        export namespace SIDE_SWITCHER_SETTINGS {
            export const ICON_OPACITY_DISABLED = 0.65;
            export const ICON_OPACITY_ENABLED = 1;
        }

        export namespace ANIMATION {
            export const CENTER_POS: vec2 = new vec2(0, 0);
            export const DURATION_SHOW = 0.120;
            export const DURATION_HIDE = 0.175;
        }

        export namespace SETUP {
            export const FOOTER_SAFE_REGION_SIZE_Y = 0.064;
            export const HEADER_SAFE_REGION_SIZE_Y = 0.115;
            export const ENTRIES_SAFE_REGION_SIZE_Y = 0.39;
        }

        export const INITIAL_PARENT_POSITION = new vec2(0, -0.15);
        export const INITIAL_ALPHA = 0;
        export const END_ALPHA = 1;

        export const DAILY_RESET_STRING = "Resets daily";
        export const WEEKLY_RESET_STRING = "Resets weekly";
        export const MONTHLY_RESET_STRING = "Resets monthly";
        export const YEARLY_RESET_STRING = "Resets yearly";
    }

    export namespace SingleBadge {
        export const POSITION =  new vec2(-0.70, -0.90);
        export const POSITION_OUT_OF_SCREEN =  new vec2(-3, -0.90);
        export const ANIMATION_DURATION = 0.5;
    }

    export namespace ScoresWidget {
        export const MAX_FRIENDS_TO_COUNT = 5;
        export const FRIENDS_PLAYED_TEXT = "+ Friends Played";
        export const ANIMATION_DURATION = 0.4;
    }

    export namespace InertialAnimation {
        export const MAX_SPEED = 4;
        export const FRICTION = 1.5;
        export const SNAP_DURATION = 0.3;
        export const SPRINGNESS = 1000;
    }

    export namespace Component {
        export const USER_LIMIT_FRIENDS = 50;
        export const USER_LIMIT_GLOBAL = 10;
    }

}
