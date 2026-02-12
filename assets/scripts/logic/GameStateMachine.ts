/**
 * 游戏状态枚举
 */
export enum GameSceneState {
    HOME = 'HOME',
    MAP = 'MAP',
    GAME = 'GAME',
    RESULT = 'RESULT',
    SETTINGS = 'SETTINGS'
}

/**
 * 状态事件数据
 */
export interface StateEventData {
    /** 当前状态 */
    current: GameSceneState;
    /** 目标状态 */
    target?: GameSceneState;
    /** 额外数据 */
    data?: any;
}

/**
 * 状态事件类型
 */
export enum StateEvent {
    /** 状态即将改变 */
    STATE_WILL_CHANGE,
    /** 状态已改变 */
    STATE_DID_CHANGE,
    /** 状态改变失败 */
    STATE_CHANGE_FAILED
}

/**
 * 状态监听器类型
 */
export type StateListener = (event: StateEventData) => void;

/**
 * 游戏状态机
 * 管理游戏全局状态转换
 */
export class GameStateMachine {
    private static _instance: GameStateMachine | null = null;
    private _currentState: GameSceneState = GameSceneState.HOME;
    private _listeners: Map<StateEvent, StateListener[]> = new Map();
    private _stateStack: GameSceneState[] = [];

    /** 最大状态栈深度 */
    public static readonly MAX_STACK_DEPTH = 10;

    /**
     * 获取单例实例
     */
    public static get instance(): GameStateMachine {
        if (this._instance === null) {
            this._instance = new GameStateMachine();
        }
        return this._instance;
    }

    private constructor() {
        // 初始化事件监听器映射
        for (const key of Object.keys(StateEvent)) {
            const event = (StateEvent as Record<string, number>)[key];
            if (typeof event === 'number') {
                this._listeners.set(event as StateEvent, []);
            }
        }
    }

    /**
     * 获取当前状态
     */
    public get currentState(): GameSceneState {
        return this._currentState;
    }

    /**
     * 获取状态栈
     */
    public get stateStack(): readonly GameSceneState[] {
        return this._stateStack;
    }

    /**
     * 获取栈深度
     */
    public get stackDepth(): number {
        return this._stateStack.length;
    }

    /**
     * 切换到指定状态
     */
    public changeState(targetState: GameSceneState, pushToStack: boolean = true, data?: any): boolean {
        const eventData: StateEventData = {
            current: this._currentState,
            target: targetState,
            data
        };

        // 触发状态即将改变事件
        this._emit(StateEvent.STATE_WILL_CHANGE, eventData);

        // 不能切换到相同状态
        if (this._currentState === targetState) {
            this._emit(StateEvent.STATE_CHANGE_FAILED, eventData);
            console.warn(`[GameStateMachine] 已经在 ${targetState} 状态`);
            return false;
        }

        // 将当前状态压入栈（如果需要）
        if (pushToStack) {
            this._pushState(this._currentState);
        }

        // 更新当前状态
        const previousState = this._currentState;
        this._currentState = targetState;

        // 触发状态已改变事件
        this._emit(StateEvent.STATE_DID_CHANGE, {
            current: this._currentState,
            data: { previous: previousState, ...data }
        });

        console.log(`[GameStateMachine] 状态从 ${previousState} 切换到 ${this._currentState}`);
        return true;
    }

    /**
     * 返回上一个状态
     */
    public popState(): boolean {
        if (this._stateStack.length === 0) {
            console.warn('[GameStateMachine] 状态栈为空，无法返回');
            return false;
        }

        const previousState = this._stateStack.pop()!;
        const targetState = previousState;

        const eventData: StateEventData = {
            current: this._currentState,
            target: targetState
        };

        this._emit(StateEvent.STATE_WILL_CHANGE, eventData);

        const oldCurrent = this._currentState;
        this._currentState = targetState;

        this._emit(StateEvent.STATE_DID_CHANGE, {
            current: this._currentState,
            data: { previous: oldCurrent, popped: true }
        });

        console.log(`[GameStateMachine] 返回到状态 ${this._currentState}`);
        return true;
    }

    /**
     * 压入状态到栈
     */
    private _pushState(state: GameSceneState): void {
        if (this._stateStack.length >= GameStateMachine.MAX_STACK_DEPTH) {
            this._stateStack.shift(); // 移除最旧的状态
        }
        this._stateStack.push(state);
    }

    /**
     * 清空状态栈
     */
    public clearStateStack(): void {
        this._stateStack = [];
        console.log('[GameStateMachine] 状态栈已清空');
    }

    /**
     * 重置到初始状态
     */
    public reset(): void {
        this._currentState = GameSceneState.HOME;
        this._stateStack = [];
        console.log('[GameStateMachine] 状态已重置');
    }

    /**
     * 添加状态事件监听器
     */
    public addListener(event: StateEvent, listener: StateListener): void {
        const listeners = this._listeners.get(event);
        if (listeners) {
            listeners.push(listener);
        }
    }

    /**
     * 移除状态事件监听器
     */
    public removeListener(event: StateEvent, listener: StateListener): void {
        const listeners = this._listeners.get(event);
        if (listeners) {
            const index = listeners.indexOf(listener);
            if (index >= 0) {
                listeners.splice(index, 1);
            }
        }
    }

    /**
     * 触发状态事件
     */
    private _emit(event: StateEvent, data: StateEventData): void {
        const listeners = this._listeners.get(event);
        if (listeners) {
            for (const listener of listeners) {
                listener(data);
            }
        }
    }

    /**
     * 快捷方法：切换到首页
     */
    public gotoHome(): boolean {
        return this.changeState(GameSceneState.HOME);
    }

    /**
     * 快捷方法：切换到地图页
     */
    public gotoMap(): boolean {
        return this.changeState(GameSceneState.MAP);
    }

    /**
     * 快捷方法：切换到游戏页
     */
    public gotoGame(levelId?: string): boolean {
        return this.changeState(GameSceneState.GAME, true, { levelId });
    }

    /**
     * 快捷方法：切换到结算页
     */
    public gotoResult(result?: any): boolean {
        return this.changeState(GameSceneState.RESULT, false, { result });
    }

    /**
     * 快捷方法：切换到设置页
     */
    public gotoSettings(): boolean {
        return this.changeState(GameSceneState.SETTINGS, false);
    }

    /**
     * 返回上一状态
     */
    public back(): boolean {
        return this.popState();
    }

    /**
     * 检查是否在指定状态
     */
    public isInState(state: GameSceneState): boolean {
        return this._currentState === state;
    }

    /**
     * 获取状态名称（用于调试）
     */
    public getStateName(state: GameSceneState): string {
        return state;
    }

    /**
     * 获取当前状态名称（用于调试）
     */
    public getCurrentStateName(): string {
        return this.getStateName(this._currentState);
    }
}
