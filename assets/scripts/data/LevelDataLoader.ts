import { assetManager } from 'cc';
import { LevelData, LevelConfig } from './LevelConfig';

/** resources 下关卡路径前缀（相对 resources，不含扩展名） */
const LEVEL_PATH_PREFIX = 'config/levels/';

/**
 * 从 resources 目录动态加载关卡 JSON，单一数据源，符合 DRY
 */
export function loadLevelFromResources(levelId: string): Promise<LevelData | null> {
    const path = LEVEL_PATH_PREFIX + levelId;
    return new Promise((resolve) => {
        assetManager.resources.load(path, (err, asset: any) => {
            if (err) {
                console.warn(`[LevelDataLoader] 加载关卡失败: ${path}`, err);
                resolve(null);
                return;
            }
            const raw = asset?.json ?? asset;
            if (!raw) {
                console.warn(`[LevelDataLoader] 关卡资源无 json 数据: ${path}`);
                resolve(null);
                return;
            }
            const data = raw as LevelData;
            const { valid, errors } = LevelConfig.validate(data);
            if (!valid) {
                console.warn(`[LevelDataLoader] 关卡校验失败: ${path}`, errors);
                resolve(null);
                return;
            }
            resolve(data);
        });
    });
}
