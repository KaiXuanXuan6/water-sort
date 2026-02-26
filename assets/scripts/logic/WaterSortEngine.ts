import { LevelData, BottleState, WaterLayer } from '../data/LevelConfig';

/**
 * 移动操作记录
 * 用于撤销功能
 */
interface MoveRecord {
    /** 源瓶子索引 */
    fromIndex: number;
    /** 目标瓶子索引 */
    toIndex: number;
    /** 移动的水层数量 */
    movedCount: number;
    /** 移动的颜色 */
    colorId: number;
    /** 源瓶子移动前的水层数组快照 */
    fromBefore: WaterLayer[];
    /** 目标瓶子移动前的水层数组快照 */
    toBefore: WaterLayer[];
}

/**
 * 移动结果
 */
export interface MoveResult {
    /** 是否成功移动 */
    success: boolean;
    /** 移动的水层数量 */
    movedCount: number;
    /** 错误信息（失败时） */
    error?: string;
}

/**
 * 游戏状态快照
 * 用于保存和恢复完整游戏状态
 */
interface GameStateSnapshot {
    bottles: BottleState[];
    moveCount: number;
}

/**
 * 倒水排序引擎
 * 纯 TypeScript 类，处理核心游戏逻辑
 */
export class WaterSortEngine {
    private _levelData: LevelData | null = null;
    private _moveCount: number = 0;
    private _moveHistory: MoveRecord[] = [];
    private _stateHistory: GameStateSnapshot[] = [];

    /** 最大历史记录数量 */
    public static readonly MAX_HISTORY = 50;

    /**
     * 获取当前关卡数据
     */
    public get levelData(): LevelData | null {
        return this._levelData;
    }

    /**
     * 获取移动次数
     */
    public get moveCount(): number {
        return this._moveCount;
    }

    /**
     * 获取移动历史记录
     */
    public get moveHistory(): readonly MoveRecord[] {
        return this._moveHistory;
    }

    /**
     * 获取历史记录数量
     */
    public get historyCount(): number {
        return this._moveHistory.length;
    }

    /**
     * 加载关卡数据
     */
    public loadLevel(levelData: LevelData): void {
        // 深拷贝关卡数据，避免修改原始数据
        this._levelData = JSON.parse(JSON.stringify(levelData)) as LevelData;
        this._moveCount = 0;
        this._moveHistory = [];
        this._stateHistory = [];
    }

    /**
     * 重置关卡
     */
    public reset(): void {
        if (!this._levelData) {
            return;
        }

        // 恢复到初始状态（如果没有保存初始状态，则无法完全重置）
        if (this._stateHistory.length > 0) {
            this._restoreSnapshot(this._stateHistory[0]);
        }

        this._moveCount = 0;
        this._moveHistory = [];
        this._stateHistory = [];
    }

    /**
     * 验证是否可以从源瓶子倒入目标瓶子
     */
    public canMove(fromIndex: number, toIndex: number): { can: boolean; reason?: string } {
        if (!this._levelData) {
            return { can: false, reason: '关卡未加载' };
        }

        const bottles = this._levelData.bottles;

        // 检查索引有效性
        if (fromIndex < 0 || fromIndex >= bottles.length) {
            return { can: false, reason: '源瓶子索引无效' };
        }
        if (toIndex < 0 || toIndex >= bottles.length) {
            return { can: false, reason: '目标瓶子索引无效' };
        }

        // 不能倒向自己
        if (fromIndex === toIndex) {
            return { can: false, reason: '不能倒入同一个瓶子' };
        }

        const fromBottle = bottles[fromIndex];
        const toBottle = bottles[toIndex];

        // 源瓶子必须非空
        if (fromBottle.waters.length === 0) {
            return { can: false, reason: '源瓶子为空' };
        }

        // 获取源瓶子顶层的颜色
        const topColor = fromBottle.waters[fromBottle.waters.length - 1].colorId;

        // 目标瓶子必须为空，或顶层颜色相同
        if (toBottle.waters.length > 0) {
            const toTopColor = toBottle.waters[toBottle.waters.length - 1].colorId;
            if (toTopColor !== topColor) {
                return { can: false, reason: '目标瓶子顶层颜色不同' };
            }
        }

        // 计算可以移动的水层数量
        const movableCount = this._getMovableCount(fromBottle, toBottle);

        if (movableCount === 0) {
            return { can: false, reason: '没有可移动的水层' };
        }

        return { can: true };
    }

    /**
     * 获取一次合法移动的信息（用于动画：水量、颜色），不修改状态
     */
    public getMoveInfo(fromIndex: number, toIndex: number): { movedCount: number; colorId: number } | null {
        const validation = this.canMove(fromIndex, toIndex);
        if (!validation.can || !this._levelData) {
            return null;
        }
        const bottles = this._levelData.bottles;
        const fromBottle = bottles[fromIndex];
        const toBottle = bottles[toIndex];
        const movedCount = this._getMovableCount(fromBottle, toBottle);
        const colorId = fromBottle.waters[fromBottle.waters.length - 1].colorId;
        return { movedCount, colorId };
    }

    /**
     * 执行移动操作
     */
    public executeMove(fromIndex: number, toIndex: number): MoveResult {
        if (!this._levelData) {
            return { success: false, movedCount: 0, error: '关卡未加载' };
        }

        // 验证移动是否合法
        const validation = this.canMove(fromIndex, toIndex);
        if (!validation.can) {
            return {
                success: false,
                movedCount: 0,
                error: validation.reason || '无法移动'
            };
        }

        const bottles = this._levelData.bottles;
        const fromBottle = bottles[fromIndex];
        const toBottle = bottles[toIndex];

        // 保存移动前的状态快照
        const fromBefore = JSON.parse(JSON.stringify(fromBottle.waters)) as WaterLayer[];
        const toBefore = JSON.parse(JSON.stringify(toBottle.waters)) as WaterLayer[];

        // 计算可移动的水层数量
        const movableCount = this._getMovableCount(fromBottle, toBottle);
        const topColor = fromBottle.waters[fromBottle.waters.length - 1].colorId;

        // 保存当前状态到历史记录（用于完整的撤销）
        this._saveSnapshot();

        // 执行移动
        for (let i = 0; i < movableCount; i++) {
            // 从源瓶子移除顶层水
            const water = fromBottle.waters.pop()!;
            // 添加到目标瓶子
            toBottle.waters.push(water);
        }

        // 记录移动操作
        const record: MoveRecord = {
            fromIndex,
            toIndex,
            movedCount: movableCount,
            colorId: topColor,
            fromBefore,
            toBefore
        };
        this._moveHistory.push(record);

        // 更新移动次数
        this._moveCount++;

        return {
            success: true,
            movedCount: movableCount
        };
    }

    /**
     * 撤销上一步移动
     */
    public undoMove(): boolean {
        if (this._moveHistory.length === 0) {
            return false;
        }

        const lastMove = this._moveHistory.pop()!;
        const bottles = this._levelData!.bottles;

        const fromBottle = bottles[lastMove.fromIndex];
        const toBottle = bottles[lastMove.toIndex];

        // 恢复源瓶子
        fromBottle.waters = JSON.parse(JSON.stringify(lastMove.fromBefore)) as WaterLayer[];

        // 恢复目标瓶子
        toBottle.waters = JSON.parse(JSON.stringify(lastMove.toBefore)) as WaterLayer[];

        // 更新移动次数
        this._moveCount--;

        return true;
    }

    /**
     * 撤销到指定步数
     */
    public undoToStep(targetStep: number): boolean {
        if (targetStep < 0 || targetStep > this._moveCount) {
            return false;
        }

        const stepsToUndo = this._moveCount - targetStep;

        for (let i = 0; i < stepsToUndo; i++) {
            if (!this.undoMove()) {
                return false;
            }
        }

        return true;
    }

    /**
     * 检查是否达到胜利条件
     */
    public checkWin(): boolean {
        if (!this._levelData) {
            return false;
        }

        const bottles = this._levelData.bottles;
        let hasNonEmpty = false;

        for (const bottle of bottles) {
            if (bottle.waters.length === 0) {
                continue;
            }
            hasNonEmpty = true;

            // 非空瓶子必须已满
            if (bottle.waters.length !== bottle.capacity) {
                return false;
            }

            // 非空瓶子必须只有一种颜色
            const firstColor = bottle.waters[0].colorId;
            for (const water of bottle.waters) {
                if (water.colorId !== firstColor) {
                    return false;
                }
            }
        }

        return hasNonEmpty;
    }

    /**
     * 检查是否还有合法移动
     */
    public hasValidMoves(): boolean {
        if (!this._levelData) {
            return false;
        }

        const bottles = this._levelData.bottles;
        const n = bottles.length;

        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                if (i !== j) {
                    const validation = this.canMove(i, j);
                    if (validation.can) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    /**
     * 检查游戏是否失败（无法移动且未胜利）
     */
    public checkDefeat(): boolean {
        if (this.checkWin()) {
            return false;
        }
        return !this.hasValidMoves();
    }

    /**
     * 获取可移动的水层数量
     */
    private _getMovableCount(fromBottle: BottleState, toBottle: BottleState): number {
        if (fromBottle.waters.length === 0) {
            return 0;
        }

        const topColor = fromBottle.waters[fromBottle.waters.length - 1].colorId;
        let movableCount = 0;

        // 计算源瓶子中连续的同色顶层水层数量
        for (let i = fromBottle.waters.length - 1; i >= 0; i--) {
            if (fromBottle.waters[i].colorId === topColor) {
                movableCount++;
            } else {
                break;
            }
        }

        // 目标瓶子的剩余空间
        const availableSpace = toBottle.capacity - toBottle.waters.length;

        // 取两者较小值
        return Math.min(movableCount, availableSpace);
    }

    /**
     * 保存游戏状态快照
     */
    private _saveSnapshot(): void {
        if (!this._levelData) {
            return;
        }

        // 限制历史记录数量
        if (this._stateHistory.length >= WaterSortEngine.MAX_HISTORY) {
            this._stateHistory.shift();
        }

        const snapshot: GameStateSnapshot = {
            bottles: JSON.parse(JSON.stringify(this._levelData.bottles)) as BottleState[],
            moveCount: this._moveCount
        };

        this._stateHistory.push(snapshot);
    }

    /**
     * 恢复游戏状态快照
     */
    private _restoreSnapshot(snapshot: GameStateSnapshot): void {
        if (!this._levelData) {
            return;
        }

        this._levelData.bottles = JSON.parse(JSON.stringify(snapshot.bottles)) as BottleState[];
        this._moveCount = snapshot.moveCount;
    }

    /**
     * 深拷贝瓶子状态
     */
    public cloneBottleState(bottle: BottleState): BottleState {
        return JSON.parse(JSON.stringify(bottle)) as BottleState;
    }

    /**
     * 深拷贝关卡数据
     */
    public cloneLevelData(levelData: LevelData): LevelData {
        return JSON.parse(JSON.stringify(levelData)) as LevelData;
    }

    /**
     * 获取瓶子的颜色状态描述（用于调试）
     */
    public getBottleDescription(index: number): string {
        if (!this._levelData) {
            return '';
        }

        const bottle = this._levelData.bottles[index];
        if (!bottle) {
            return '';
        }

        const colors = bottle.waters.map(w => w.colorId).reverse().join(',');
        return `瓶${index} [${colors}/${bottle.capacity}]`;
    }

    /**
     * 获取所有瓶子的状态描述（用于调试）
     */
    public getAllBottlesDescription(): string {
        if (!this._levelData) {
            return '';
        }

        return this._levelData.bottles
            .map((_, i) => this.getBottleDescription(i))
            .join(' | ');
    }

    /**
     * 清空历史记录
     */
    public clearHistory(): void {
        this._moveHistory = [];
        this._stateHistory = [];
    }
}
