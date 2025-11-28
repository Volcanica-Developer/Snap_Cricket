import { TokenManager } from "./TokenManager";
import { StickerDataEntry } from "./Interfaces/LeaderboardRelated";

export class BitmojiStickerLoader extends TokenManager {
    private stickerData: Array<StickerDataEntry> = [];
    private currentUserPromises: Map<string, Promise<Texture>> = new Map();

    constructor(private readonly bitmojiModule: BitmojiModule,
                private readonly remoteMediaModule: RemoteMediaModule) {
        super();
    }

    updateStorageWithCurrentUser(currentSnapchatUser: SnapchatUser): void {
        const stickerDataEntry = this.findStickerDataEntry(currentSnapchatUser);
        if (stickerDataEntry) {
            for (const [stickerId, promise] of stickerDataEntry.stickerMap) {
                if (!this.currentUserPromises.has(stickerId)) {
                    this.currentUserPromises.set(stickerId, promise);
                }
            }
            stickerDataEntry.stickerMap = this.currentUserPromises;
        } else {
            this.stickerData.push({
                snapchatUser: currentSnapchatUser,
                stickerMap: this.currentUserPromises,
            });
        }
    }

    async loadForUser(snapchatUser: SnapchatUser | null, stickerId: string): Promise<Texture> {
        if (isNull(snapchatUser)) {
            if (isNull(this.currentUserPromises.get(stickerId))) {
                this.currentUserPromises.set(stickerId, this.loadBitmoji(null, stickerId));
            }

            return this.currentUserPromises.get(stickerId);
        }

        const stickerDataEntry: StickerDataEntry | undefined = this.findStickerDataEntry(snapchatUser);
        const isPromiseForStickerExists = stickerDataEntry && stickerDataEntry.stickerMap.has(stickerId);
        if (isPromiseForStickerExists) {
            return stickerDataEntry.stickerMap.get(stickerId);
        }

        const promise = this.loadBitmoji(snapchatUser, stickerId);

        if (!stickerDataEntry) {
            this.stickerData.push({
                snapchatUser: snapchatUser,
                stickerMap: new Map([[stickerId, promise]]),
            });
        } else {
            stickerDataEntry.stickerMap.set(stickerId, promise);
        }
        return promise;
    }

    private loadBitmoji(user: SnapchatUser | null, poseId: string): Promise<Texture> {
        const options: Bitmoji2DOptions = Bitmoji2DOptions.create();
        if (!isNull(user)) {
            options.user = user;
        }

        if (poseId !== '') {
            options.poseId = poseId;
        }

        return new Promise((resolve, reject) => {
            this.bitmojiModule.requestBitmoji2DResource(options, (resource: DynamicResource) => {
                this.remoteMediaModule.loadResourceAsImageTexture(resource,
                    texture => resolve(texture),
                    reject);
            });
        });
    }

    private findStickerDataEntry(snapchatUser: SnapchatUser): StickerDataEntry | undefined {
        return this.stickerData.find((stickerDataEntry: StickerDataEntry) => stickerDataEntry.snapchatUser.isSame(snapchatUser));
    }
}
