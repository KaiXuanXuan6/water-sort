import { assetManager, SpriteFrame } from 'cc';

/**
 * 资源加载器
 * 负责动态加载游戏资源
 */
export class AssetLoader {
    /** 资源缓存 */
    private static _spriteFrameCache: Map<string, SpriteFrame> = new Map();
    private static _loadingPromises: Map<string, Promise<SpriteFrame | null>> = new Map();

    /**
     * 加载瓶子图片
     * @param bottleType 瓶子类型 (1-48)
     * @param state 状态 (1=正常, 2=选中)
     * @returns Promise<SpriteFrame>
     */
    public static async loadBottleSprite(bottleType: number, state: number = 1): Promise<SpriteFrame | null> {
        const key = `bottle_${bottleType}_${state}`;

        // 检查缓存
        if (this._spriteFrameCache.has(key)) {
            return this._spriteFrameCache.get(key)!;
        }

        // 检查是否正在加载
        if (this._loadingPromises.has(key)) {
            const promise = this._loadingPromises.get(key)!;
            return promise as Promise<SpriteFrame>;
        }

        // 加载资源
        const promise = new Promise<SpriteFrame | null>((resolve) => {
            const path = `Bottles/${bottleType}_${state}/spriteFrame`;

            assetManager.resources.load(path, SpriteFrame, (err, asset) => {
                if (err) {
                    console.error(`[AssetLoader] 加载瓶子图片失败: ${path}`, err);
                    resolve(null);
                } else {
                    this._spriteFrameCache.set(key, asset);
                    console.log(`[AssetLoader] 加载瓶子图片成功: ${path}`);
                    resolve(asset);
                }
            });
        });

        this._loadingPromises.set(key, promise);

        return promise.finally(() => {
            this._loadingPromises.delete(key);
        });
    }

    /**
     * 预加载瓶子图片（正常和选中状态）
     */
    public static async preloadBottle(bottleType: number): Promise<[SpriteFrame | null, SpriteFrame | null]> {
        const [normal, selected] = await Promise.all([
            this.loadBottleSprite(bottleType, 1),
            this.loadBottleSprite(bottleType, 2)
        ]);
        return [normal, selected];
    }

}
