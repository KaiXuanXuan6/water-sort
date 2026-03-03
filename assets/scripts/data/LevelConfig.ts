import { assetManager, JsonAsset } from 'cc';

/**
 * 水层定义
 * 单个水块的数据结构
 */
export interface WaterLayer {
    /** 颜色ID */
    colorId: number;
    /** 水层类型（普通、特殊等） */
    type?: 'normal' | 'special';
}

/**
 * 瓶子状态数据
 * 单个瓶子的完整数据
 */
export interface BottleState {
    /** 瓶子唯一ID */
    id: string;
    /** 瓶子容量（最大水层数） */
    capacity: number;
    /** 水层数据（从底到顶） */
    waters: WaterLayer[];
    /** 瓶子类型（用于UI样式） */
    bottleType?: number;
}

/**
 * 关卡配置数据
 * 单个关卡的完整配置
 */
export interface LevelData {
    /** 关卡ID */
    id: string;
    /** 关卡序号 */
    level: number;
    /** 瓶子列表 */
    bottles: BottleState[];
    /** 关卡难度 */
    difficulty: 'easy' | 'medium' | 'hard' | 'expert';
    /** 背景图ID */
    backgroundId?: number;
    /** 推荐最少步数 */
    minMoves?: number;
}

/**
 * 关卡配置类
 * 关卡数据的加载和验证、关卡 ID 与序号的转换（统一格式 level_001，避免各处重复解析）
 */
export class LevelConfig {
    private static readonly LEVELS_DIR = 'config/levels';

    /**
     * 动态统计 resources/config/levels 下以 level 开头的 json 数量
     */
    static getTotalLevels(): number {
        const infos = assetManager.resources.getDirWithPath(LevelConfig.LEVELS_DIR, JsonAsset);
        if (!infos || infos.length === 0) {
            return 1;
        }
        const total = infos.filter((info) => {
            const fileName = info.path.split('/').pop() ?? '';
            return fileName.toLowerCase().startsWith('level');
        }).length;
        return Math.max(1, total);
    }

    /**
     * 关卡 ID 转关卡序号（1-based）
     * 如 level_001 -> 1，无效返回 1
     */
    static levelIdToLevelNum(levelId: string): number {
        const match = levelId.match(/level_(\d+)/);
        const num = match ? parseInt(match[1], 10) : 1;
        return Math.max(1, num);
    }

    /**
     * 关卡序号转关卡 ID
     * 如 1 -> level_001
     */
    static levelNumToLevelId(num: number): string {
        return `level_${String(Math.max(1, Math.floor(num))).padStart(3, '0')}`;
    }

    /**
     * 验证关卡数据有效性
     */
    static validate(data: LevelData): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!data.id || data.id.trim() === '') {
            errors.push('关卡ID不能为空');
        }

        if (data.level <= 0) {
            errors.push('关卡序号必须大于0');
        }

        if (!data.bottles || data.bottles.length === 0) {
            errors.push('瓶子列表不能为空');
        }

        for (let i = 0; i < data.bottles.length; i++) {
            const bottle = data.bottles[i];
            if (bottle.capacity <= 0) {
                errors.push(`瓶子${i}的容量必须大于0`);
            }
            if (bottle.waters.length > bottle.capacity) {
                errors.push(`瓶子${i}的水层数量超过容量`);
            }
            for (const water of bottle.waters) {
                if (water.colorId <= 0) {
                    errors.push(`瓶子${i}的颜色ID必须大于0`);
                }
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }
}
