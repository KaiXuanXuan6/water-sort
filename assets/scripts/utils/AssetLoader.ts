import { assetManager, SpriteFrame, Prefab } from 'cc';

/**
 * 资源加载器
 * 负责动态加载游戏资源
 */
export class AssetLoader {
    /** 资源缓存 */
    private static _spriteFrameCache: Map<string, SpriteFrame> = new Map();
    private static _prefabCache: Map<string, Prefab> = new Map();
    private static _loadingPromises: Map<string, Promise<SpriteFrame | Prefab>> = new Map();

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
            // 尝试从 resources 目录加载
            const path = `Bottles/${bottleType}_${state}`;

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

    /**
     * 批量预加载瓶子
     */
    public static async preloadBottles(types: number[]): Promise<void> {
        const promises = types.map(type => this.preloadBottle(type));
        await Promise.all(promises);
        console.log(`[AssetLoader] 预加载完成: ${types.length} 个瓶子类型`);
    }

    /**
     * 加载预制体
     */
    public static async loadPrefab(path: string): Promise<Prefab | null> {
        // 检查缓存
        if (this._prefabCache.has(path)) {
            return this._prefabCache.get(path)!;
        }

        // 检查是否正在加载
        if (this._loadingPromises.has(path)) {
            const promise = this._loadingPromises.get(path)!;
            return promise as Promise<Prefab>;
        }

        const promise = new Promise<Prefab | null>((resolve) => {
            assetManager.resources.load(path, Prefab, (err, asset) => {
                if (err) {
                    console.error(`[AssetLoader] 加载预制体失败: ${path}`, err);
                    resolve(null);
                } else {
                    this._prefabCache.set(path, asset);
                    resolve(asset);
                }
            });
        });

        this._loadingPromises.set(path, promise);

        return promise.finally(() => {
            this._loadingPromises.delete(path);
        });
    }

    /**
     * 从缓存获取 SpriteFrame
     */
    public static getSpriteFrame(key: string): SpriteFrame | undefined {
        return this._spriteFrameCache.get(key);
    }

    /**
     * 从缓存获取 Prefab
     */
    public static getPrefab(path: string): Prefab | undefined {
        return this._prefabCache.get(path);
    }

    /**
     * 清空缓存
     */
    public static clearCache(): void {
        this._spriteFrameCache.clear();
        this._prefabCache.clear();
        this._loadingPromises.clear();
        console.log('[AssetLoader] 缓存已清空');
    }

    /**
     * 获取缓存统计
     */
    public static getCacheStats(): { spriteFrames: number; prefabs: number; loading: number } {
        return {
            spriteFrames: this._spriteFrameCache.size,
            prefabs: this._prefabCache.size,
            loading: this._loadingPromises.size
        };
    }
}
