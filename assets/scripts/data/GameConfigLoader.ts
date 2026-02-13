import { assetManager } from 'cc';

/** 游戏全局配置 */
export interface GameConfig {
    /** 默认最大移动步数（-1 表示无限制） */
    defaultMaxMoves: number;
    /** 默认空瓶数量 */
    defaultEmptyBottleCount: number;
    /** 初始撤销道具次数，-1 表示无限 */
    initialUndoCount: number;
    /** 初始加管道具次数 */
    initialAddTubeCount: number;
}

const CONFIG_PATH = 'config/game_config';
let _cachedConfig: GameConfig | null = null;

/**
 * 从 resources 加载游戏配置，带缓存
 */
export function loadGameConfig(): Promise<GameConfig | null> {
    if (_cachedConfig !== null) {
        return Promise.resolve(_cachedConfig);
    }
    return new Promise((resolve) => {
        assetManager.resources.load(CONFIG_PATH, (err, asset: any) => {
            if (err) {
                console.warn('[GameConfigLoader] 加载配置失败', err);
                resolve(null);
                return;
            }
            const raw = asset?.json ?? asset;
            if (!raw) {
                console.warn('[GameConfigLoader] 配置资源无 json 数据');
                resolve(null);
                return;
            }
            const cfg = raw as GameConfig;
            _cachedConfig = {
                defaultMaxMoves: cfg.defaultMaxMoves ?? 20,
                defaultEmptyBottleCount: cfg.defaultEmptyBottleCount ?? 2,
                initialUndoCount: cfg.initialUndoCount ?? -1,
                initialAddTubeCount: cfg.initialAddTubeCount ?? 3
            };
            resolve(_cachedConfig);
        });
    });
}
