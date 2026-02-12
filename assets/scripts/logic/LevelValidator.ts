import { LevelData, BottleState, WaterLayer } from '../data/LevelConfig';
import { WaterSortEngine } from './WaterSortEngine';

/**
 * 关卡验证结果
 */
export interface ValidationResult {
    /** 是否有效 */
    valid: boolean;
    /** 错误列表 */
    errors: string[];
    /** 警告列表 */
    warnings: string[];
}

/**
 * 可解性检查结果
 */
export interface SolvabilityResult {
    /** 是否可解 */
    solvable: boolean;
    /** 找到解的步数（如果可解） */
    solutionSteps?: number;
    /** 检查耗时（毫秒） */
    checkTime: number;
}

/**
 * 颜色统计信息
 */
interface ColorStats {
    colorId: number;
    count: number;
    bottleCount: number;
}

/**
 * 关卡验证器
 * 验证关卡配置的有效性和可解性
 */
export class LevelValidator {
    /** 最大搜索深度（用于可解性检查） */
    public static readonly MAX_SEARCH_DEPTH = 100;

    /** 超时时间（毫秒） */
    public static readonly TIMEOUT_MS = 5000;

    /**
     * 验证关卡配置
     */
    public static validate(levelData: LevelData): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        // 1. 基本信息验证
        if (!levelData.id || levelData.id.trim() === '') {
            errors.push('关卡ID不能为空');
        }

        if (levelData.level <= 0) {
            errors.push('关卡序号必须大于0');
        }

        if (!levelData.bottles || levelData.bottles.length === 0) {
            errors.push('瓶子列表不能为空');
            return { valid: false, errors, warnings };
        }

        // 2. 瓶子验证
        for (let i = 0; i < levelData.bottles.length; i++) {
            const bottle = levelData.bottles[i];
            const bottleErrors = this.validateBottle(bottle, i);
            errors.push(...bottleErrors);
        }

        // 3. 颜色统计验证
        const colorStats = this._analyzeColors(levelData);
        const colorErrors = this.validateColors(colorStats, levelData.bottles.length);
        errors.push(...colorErrors);

        // 4. 空瓶验证
        const emptyBottleCount = levelData.bottles.filter(b => b.waters.length === 0).length;
        if (emptyBottleCount === 0) {
            warnings.push('没有空瓶，游戏可能无法完成');
        }
        if (emptyBottleCount > 2) {
            warnings.push('空瓶数量较多，可能降低游戏难度');
        }

        // 5. 最大步数验证
        if (levelData.maxMoves < -1) {
            errors.push('最大步数不能小于-1');
        }
        if (levelData.maxMoves === 0) {
            errors.push('最大步数为0表示立即失败');
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * 验证单个瓶子
     */
    private static validateBottle(bottle: BottleState, index: number): string[] {
        const errors: string[] = [];

        if (!bottle.id || bottle.id.trim() === '') {
            errors.push(`瓶子${index}的ID不能为空`);
        }

        if (bottle.capacity <= 0) {
            errors.push(`瓶子${index}的容量必须大于0`);
        }

        if (bottle.waters.length > bottle.capacity) {
            errors.push(`瓶子${index}的水层数量(${bottle.waters.length})超过容量(${bottle.capacity})`);
        }

        for (let j = 0; j < bottle.waters.length; j++) {
            const water = bottle.waters[j];
            if (water.colorId <= 0) {
                errors.push(`瓶子${index}的第${j}层水的颜色ID必须大于0`);
            }
        }

        return errors;
    }

    /**
     * 验证颜色分布
     */
    private static validateColors(colorStats: ColorStats[], bottleCount: number): string[] {
        const errors: string[] = [];

        if (colorStats.length === 0) {
            errors.push('没有找到任何颜色');
            return errors;
        }

        // 检查每种颜色的数量是否为4的倍数（假设瓶子容量为4）
        const capacity = 4;
        for (const stat of colorStats) {
            if (stat.count % capacity !== 0) {
                errors.push(`颜色${stat.colorId}的总数(${stat.count})不是${capacity}的倍数，无法完成游戏`);
            }
        }

        return errors;
    }

    /**
     * 分析关卡中的颜色分布
     */
    private static _analyzeColors(levelData: LevelData): ColorStats[] {
        const colorMap = new Map<number, ColorStats>();

        for (const bottle of levelData.bottles) {
            for (const water of bottle.waters) {
                const colorId = water.colorId;
                if (!colorMap.has(colorId)) {
                    colorMap.set(colorId, {
                        colorId,
                        count: 0,
                        bottleCount: 0
                    });
                }
                const stat = colorMap.get(colorId)!;
                stat.count++;
            }
        }

        // 统计每种颜色涉及的瓶子数量
        for (const bottle of levelData.bottles) {
            const colors = new Set(bottle.waters.map(w => w.colorId));
            for (const colorId of colors) {
                const stat = colorMap.get(colorId)!;
                stat.bottleCount++;
            }
        }

        return Array.from(colorMap.values());
    }

    /**
     * 检查关卡可解性（使用BFS搜索）
     */
    public static checkSolvability(levelData: LevelData): SolvabilityResult {
        const startTime = Date.now();

        // 创建引擎实例
        const engine = new WaterSortEngine();
        engine.loadLevel(levelData);

        // 检查是否已经胜利
        if (engine.checkWin()) {
            return {
                solvable: true,
                solutionSteps: 0,
                checkTime: Date.now() - startTime
            };
        }

        // BFS搜索
        const visited = new Set<string>();
        const queue: { state: string; steps: number }[] = [];
        const initialState = this._serializeState(levelData);

        queue.push({ state: initialState, steps: 0 });
        visited.add(initialState);

        const bottleCount = levelData.bottles.length;

        while (queue.length > 0) {
            // 检查超时
            if (Date.now() - startTime > this.TIMEOUT_MS) {
                console.warn('[LevelValidator] 可解性检查超时');
                break;
            }

            const current = queue.shift()!;

            // 检查搜索深度
            if (current.steps >= this.MAX_SEARCH_DEPTH) {
                continue;
            }

            // 尝试所有可能的移动
            for (let i = 0; i < bottleCount; i++) {
                for (let j = 0; j < bottleCount; j++) {
                    if (i === j) {
                        continue;
                    }

                    const validation = engine.canMove(i, j);
                    if (!validation.can) {
                        continue;
                    }

                    // 深拷贝当前状态
                    const tempLevel = engine.cloneLevelData(engine.levelData!);
                    const tempEngine = new WaterSortEngine();
                    tempEngine.loadLevel(tempLevel);

                    // 执行移动
                    const result = tempEngine.executeMove(i, j);
                    if (!result.success) {
                        continue;
                    }

                    // 检查是否胜利
                    if (tempEngine.checkWin()) {
                        return {
                            solvable: true,
                            solutionSteps: current.steps + 1,
                            checkTime: Date.now() - startTime
                        };
                    }

                    // 序列化新状态
                    const newState = this._serializeState(tempEngine.levelData!);

                    // 检查是否已访问
                    if (!visited.has(newState)) {
                        visited.add(newState);
                        queue.push({ state: newState, steps: current.steps + 1 });
                    }
                }
            }
        }

        return {
            solvable: false,
            checkTime: Date.now() - startTime
        };
    }

    /**
     * 序列化游戏状态（用于去重）
     */
    private static _serializeState(levelData: LevelData): string {
        const bottleStates = levelData.bottles.map(bottle => {
            const colors = bottle.waters.map(w => w.colorId).join(',');
            return `${colors}:${bottle.capacity}:${bottle.hasCap ? '1' : '0'}`;
        });
        return bottleStates.join('|');
    }

    /**
     * 计算最少步数（启发式估算）
     */
    public static estimateMinMoves(levelData: LevelData): number {
        const engine = new WaterSortEngine();
        engine.loadLevel(levelData);

        if (engine.checkWin()) {
            return 0;
        }

        // 计算未完成的瓶子数量
        let incompleteBottles = 0;
        for (const bottle of levelData.bottles) {
            if (bottle.waters.length === 0) {
                continue;
            }

            const firstColor = bottle.waters[0].colorId;
            let isComplete = true;

            for (const water of bottle.waters) {
                if (water.colorId !== firstColor) {
                    isComplete = false;
                    break;
                }
            }

            if (!isComplete || bottle.waters.length !== bottle.capacity) {
                incompleteBottles++;
            }
        }

        // 最少步数至少为未完成瓶子数量的一半（估算）
        return Math.ceil(incompleteBottles / 2);
    }

    /**
     * 生成随机关卡
     */
    public static generateRandomLevel(
        bottleCount: number,
        colorCount: number,
        capacity: number = 4
    ): LevelData {
        const watersPerColor = colorCount * capacity;
        const totalBottles = bottleCount;

        // 创建颜色池
        const colorPool: number[] = [];
        for (let i = 1; i <= colorCount; i++) {
            for (let j = 0; j < watersPerColor; j++) {
                colorPool.push(i);
            }
        }

        // 打乱颜色池
        this._shuffleArray(colorPool);

        // 创建瓶子
        const bottles: BottleState[] = [];
        const emptyBottleCount = totalBottles - colorCount;

        // 填充有水的瓶子
        for (let i = 0; i < colorCount; i++) {
            const waters: WaterLayer[] = [];
            for (let j = 0; j < capacity; j++) {
                waters.push({
                    colorId: colorPool[i * capacity + j],
                    type: 'normal'
                });
            }
            bottles.push({
                id: `bottle_${i}`,
                capacity,
                waters,
                hasCap: false
            });
        }

        // 添加空瓶子
        for (let i = colorCount; i < totalBottles; i++) {
            bottles.push({
                id: `bottle_${i}`,
                capacity,
                waters: [],
                hasCap: false
            });
        }

        // 模拟打乱（通过随机移动）
        const levelData: LevelData = {
            id: `random_${Date.now()}`,
            level: 0,
            bottles,
            maxMoves: -1,
            difficulty: 'easy'
        };

        // 随机打乱
        const engine = new WaterSortEngine();
        engine.loadLevel(levelData);

        const shuffleMoves = 50;
        const moves: [number, number][] = [];

        for (let i = 0; i < shuffleMoves; i++) {
            const possibleMoves: [number, number][] = [];

            for (let from = 0; from < totalBottles; from++) {
                for (let to = 0; to < totalBottles; to++) {
                    if (from !== to) {
                        const validation = engine.canMove(from, to);
                        if (validation.can) {
                            possibleMoves.push([from, to]);
                        }
                    }
                }
            }

            if (possibleMoves.length === 0) {
                break;
            }

            const [from, to] = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
            engine.executeMove(from, to);
            moves.push([from, to]);
        }

        return engine.levelData!;
    }

    /**
     * 数组洗牌
     */
    private static _shuffleArray<T>(array: T[]): void {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    /**
     * 计算关卡难度
     */
    public static calculateDifficulty(levelData: LevelData): 'easy' | 'medium' | 'hard' | 'expert' {
        const minMoves = this.estimateMinMoves(levelData);
        const colorCount = new Set(
            levelData.bottles.flatMap(b => b.waters.map(w => w.colorId))
        ).size;
        const emptyBottleCount = levelData.bottles.filter(b => b.waters.length === 0).length;

        // 难度评分
        let score = 0;

        // 颜色数量影响
        if (colorCount <= 3) score += 0;
        else if (colorCount <= 5) score += 1;
        else if (colorCount <= 7) score += 2;
        else score += 3;

        // 最少步数影响
        if (minMoves <= 5) score += 0;
        else if (minMoves <= 10) score += 1;
        else if (minMoves <= 15) score += 2;
        else score += 3;

        // 空瓶数量影响（空瓶越少越难）
        if (emptyBottleCount >= 2) score += 0;
        else if (emptyBottleCount === 1) score += 1;
        else score += 2;

        // 根据评分确定难度
        if (score <= 2) return 'easy';
        if (score <= 4) return 'medium';
        if (score <= 6) return 'hard';
        return 'expert';
    }
}
