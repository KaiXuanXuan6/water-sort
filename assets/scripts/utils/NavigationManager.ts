import { _decorator, Component, director } from 'cc';
const { ccclass } = _decorator;

/**
 * 场景名称枚举
 */
export enum SceneName {
    HOME = 'HomeScene',
    MAP = 'MapScene',
    COLLECTION = 'CollectionScene',
    GAME = 'GameScene'
}

/**
 * 弹窗名称枚举
 */
export enum PopupName {
    RESULT = 'ResultPop',
    SETTINGS = 'SettingPop'
}

/**
 * 导航事件
 */
export enum NavigationEvent {
    /** 场景加载开始 */
    SCENE_LOAD_START,
    /** 场景加载完成 */
    SCENE_LOAD_COMPLETE,
    /** 场景加载失败 */
    SCENE_LOAD_FAILED,
    /** 弹窗打开 */
    POPUP_OPEN,
    /** 弹窗关闭 */
    POPUP_CLOSE
}

/**
 * 导航事件数据
 */
export interface NavigationEventData {
    event: NavigationEvent;
    sceneName?: SceneName;
    popupName?: PopupName;
    error?: string;
    /** 弹窗携带数据（如结算结果） */
    data?: any;
}

/**
 * 导航事件监听器类型
 */
export type NavigationListener = (data: NavigationEventData) => void;

/**
 * 全局导航管理器
 * 负责所有场景和弹窗之间的跳转
 */
@ccclass('NavigationManager')
export class NavigationManager extends Component {
    // 当前项目仍在单场景阶段，逻辑场景统一映射到实际场景资源名
    private static readonly SCENE_ASSET_MAP: Record<SceneName, string> = {
        [SceneName.HOME]: 'scene',
        [SceneName.MAP]: 'scene',
        [SceneName.COLLECTION]: 'scene',
        [SceneName.GAME]: 'scene'
    };

    private static _instance: NavigationManager | null = null;
    private _listeners: Map<NavigationEvent, NavigationListener[]> = new Map();
    private _currentScene: SceneName = SceneName.HOME;
    private _currentPopup: PopupName | null = null;
    private _isTransitioning: boolean = false;

    /** 当前选中的关卡ID（用于场景间传递数据） */
    public selectedLevelId: string = '';

    /**
     * 获取单例实例
     */
    public static get instance(): NavigationManager {
        return this._instance!;
    }

    /**
     * 组件生命周期：加载
     */
    protected onLoad(): void {
        if (NavigationManager._instance === null) {
            NavigationManager._instance = this;
            director.addPersistRootNode(this.node);
        } else {
            this.node.destroy();
            return;
        }

        // 初始化事件监听器映射
        for (const event of Object.values(NavigationEvent)) {
            if (typeof event === 'number') {
                this._listeners.set(event as NavigationEvent, []);
            }
        }
    }

    /**
     * 组件生命周期：销毁
     */
    protected onDestroy(): void {
        if (NavigationManager._instance === this) {
            NavigationManager._instance = null;
            director.removePersistRootNode(this.node);
        }
    }

    /**
     * 添加导航事件监听器
     */
    public addListener(event: NavigationEvent, listener: NavigationListener): void {
        const listeners = this._listeners.get(event);
        if (listeners) {
            listeners.push(listener);
        }
    }

    /**
     * 移除导航事件监听器
     */
    public removeListener(event: NavigationEvent, listener: NavigationListener): void {
        const listeners = this._listeners.get(event);
        if (listeners) {
            const index = listeners.indexOf(listener);
            if (index >= 0) {
                listeners.splice(index, 1);
            }
        }
    }

    /**
     * 触发导航事件
     */
    private emit(event: NavigationEvent, data: NavigationEventData): void {
        const listeners = this._listeners.get(event);
        if (listeners) {
            for (const listener of listeners) {
                listener(data);
            }
        }
    }

    /**
     * 获取当前场景
     */
    public get currentScene(): SceneName {
        return this._currentScene;
    }

    /**
     * 获取当前弹窗
     */
    public get currentPopup(): PopupName | null {
        return this._currentPopup;
    }

    /**
     * 是否正在跳转中
     */
    public get isTransitioning(): boolean {
        return this._isTransitioning;
    }

    /**
     * 解析逻辑场景对应的实际场景资源名
     */
    private resolveSceneAssetName(sceneName: SceneName): string {
        return NavigationManager.SCENE_ASSET_MAP[sceneName] || 'scene';
    }

    /**
     * 跳转到指定场景，单场景模式
     */
    public gotoScene(sceneName: SceneName, data?: any): void {
        if (this._isTransitioning) {
            console.warn('[NavigationManager] 正在跳转中，请勿重复操作');
            return;
        }

        if (sceneName === this._currentScene) {
            this.emit(NavigationEvent.SCENE_LOAD_START, {
                event: NavigationEvent.SCENE_LOAD_START,
                sceneName
            });
            this.emit(NavigationEvent.SCENE_LOAD_COMPLETE, {
                event: NavigationEvent.SCENE_LOAD_COMPLETE,
                sceneName
            });
            return;
        }

        const prevScene = this._currentScene;
        const targetAsset = this.resolveSceneAssetName(sceneName);
        const currentAsset = this.resolveSceneAssetName(prevScene);
        const isSingleScene = targetAsset === currentAsset;

        this._currentScene = sceneName;
        this.emit(NavigationEvent.SCENE_LOAD_START, {
            event: NavigationEvent.SCENE_LOAD_START,
            sceneName
        });

        if (isSingleScene) {
            this._isTransitioning = false;
            this.emit(NavigationEvent.SCENE_LOAD_COMPLETE, {
                event: NavigationEvent.SCENE_LOAD_COMPLETE,
                sceneName
            });
            console.log(`[NavigationManager] 视图切换: ${prevScene} -> ${sceneName}`);
            return;
        }

        this._isTransitioning = true;
        director.loadScene(targetAsset, (err) => {
            if (err) {
                this._currentScene = prevScene;
                this._isTransitioning = false;
                this.emit(NavigationEvent.SCENE_LOAD_FAILED, {
                    event: NavigationEvent.SCENE_LOAD_FAILED,
                    sceneName,
                    error: err.message
                });
                console.error(`[NavigationManager] 场景加载失败: ${err.message}`);
            } else {
                this._isTransitioning = false;
                this.emit(NavigationEvent.SCENE_LOAD_COMPLETE, {
                    event: NavigationEvent.SCENE_LOAD_COMPLETE,
                    sceneName
                });
                console.log(`[NavigationManager] 场景加载完成: ${sceneName} -> ${targetAsset}`);
            }
        });
    }

    /**
     * 打开弹窗
     */
    public openPopup(popupName: PopupName, data?: any): void {
        if (this._currentPopup) {
            console.warn('[NavigationManager] 已有弹窗打开，请先关闭');
            return;
        }

        this._currentPopup = popupName;
        this.emit(NavigationEvent.POPUP_OPEN, {
            event: NavigationEvent.POPUP_OPEN,
            popupName,
            data
        });

        console.log(`[NavigationManager] 打开弹窗: ${popupName}`);
        // TODO: 实际加载弹窗预制体的逻辑由具体场景实现
    }

    /**
     * 关闭当前弹窗
     */
    public closePopup(): void {
        if (!this._currentPopup) {
            console.warn('[NavigationManager] 没有打开的弹窗');
            return;
        }

        const popupName = this._currentPopup;
        this._currentPopup = null;
        this.emit(NavigationEvent.POPUP_CLOSE, {
            event: NavigationEvent.POPUP_CLOSE,
            popupName
        });

        console.log(`[NavigationManager] 关闭弹窗: ${popupName}`);
        // TODO: 实际关闭弹窗的逻辑由具体场景实现
    }

    /**
     * 快捷方法：跳转到首页
     */
    public gotoHome(): void {
        this.gotoScene(SceneName.HOME);
    }

    /**
     * 快捷方法：跳转到地图页
     */
    public gotoMap(): void {
        this.gotoScene(SceneName.MAP);
    }

    /**
     * 快捷方法：跳转到收集页（玩家解锁的瓶子图鉴）
     */
    public gotoCollection(): void {
        this.gotoScene(SceneName.COLLECTION);
    }

    /**
     * 快捷方法：跳转到游戏页
     */
    public gotoGame(levelId: string): void {
        this.selectedLevelId = levelId;
        this.gotoScene(SceneName.GAME);
    }

    /**
     * 快捷方法：打开结算弹窗
     */
    public showResultPopup(data?: any): void {
        this.openPopup(PopupName.RESULT, data);
    }

    /**
     * 快捷方法：打开设置弹窗
     */
    public showSettingsPopup(): void {
        this.openPopup(PopupName.SETTINGS);
    }

    /**
     * 返回上一场景
     * 简单实现：根据当前场景返回到对应的上一场景
     */
    public back(): void {
        switch (this._currentScene) {
            case SceneName.HOME:
                console.warn('[NavigationManager] 首页无法返回');
                break;
            case SceneName.MAP:
            case SceneName.COLLECTION:
                this.gotoHome();
                break;
            case SceneName.GAME:
                this.gotoMap();
                break;
            default:
                this.gotoHome();
        }
    }
}
