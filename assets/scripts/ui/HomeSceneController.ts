import { _decorator, Component, Node, Button } from 'cc';
import { NavigationManager, NavigationEvent } from '../utils/NavigationManager';
import { loadFromStorage, getUnlockedLevel } from '../data/UserProfile';
import { LevelConfig } from '../data/LevelConfig';

const { ccclass, property } = _decorator;

/**
 * 首页控制器
 * 负责首页场景的初始化和交互逻辑；顶部标题（Level N）由 TopBarController 统一管理。
 */
@ccclass('HomeSceneController')
export class HomeSceneController extends Component {
    // UI 组件绑定
    @property(Button)
    startButton: Button | null = null;

    @property(Button)
    shopButton: Button | null = null;

    private _navManager: NavigationManager | null = null;

    /**
     * 组件生命周期：加载
     */
    protected onLoad(): void {
        console.log('[HomeSceneController] 场景加载完成');

        // 获取导航管理器实例
        this._navManager = NavigationManager.instance;

        if (!this._navManager) {
            console.error('[HomeSceneController] 未找到导航管理器');
            return;
        }

        // 绑定按钮事件
        this.bindEvents();

        // 同步用户进度（标题 Level N 由 TopBarController 根据场景统一更新）
        loadFromStorage();

        // 监听导航事件
        this.setupNavigationListeners();
    }

    /**
     * 组件生命周期：启动
     */
    protected start(): void {
        console.log('[HomeSceneController] 场景启动');
    }

    /**
     * 组件生命周期：销毁
     */
    protected onDestroy(): void {
        if (this._navManager) {
            this._navManager.removeListener(NavigationEvent.SCENE_LOAD_START, this.onSceneLoadStart);
            this._navManager.removeListener(NavigationEvent.SCENE_LOAD_COMPLETE, this.onSceneLoadComplete);
        }
    }

    /**
     * 绑定按钮点击事件
     */
    private bindEvents(): void {
        if (this.startButton) {
            this.startButton.node.on(Button.EventType.CLICK, this.onStartClick, this);
        }

        if (this.shopButton) {
            this.shopButton.node.on(Button.EventType.CLICK, this.onShopClick, this);
        }
    }

    /**
     * 设置导航事件监听
     */
    private setupNavigationListeners(): void {
        if (this._navManager) {
            this._navManager.addListener(NavigationEvent.SCENE_LOAD_START, this.onSceneLoadStart);
            this._navManager.addListener(NavigationEvent.SCENE_LOAD_COMPLETE, this.onSceneLoadComplete);
        }
    }

    /**
     * 开始游戏按钮点击：进入游戏页（当前应玩关卡）
     */
    private onStartClick(): void {
        console.log('[HomeSceneController] 点击开始按钮');
        const levelId = LevelConfig.levelNumToLevelId(getUnlockedLevel());
        this._navManager?.gotoGame(levelId);
    }

    /**
     * 商店按钮点击（暂留占位）
     */
    private onShopClick(): void {
        console.log('[HomeSceneController] 点击商店按钮（功能待实现）');
        // TODO: 实现商店功能
    }

    /**
     * 场景加载开始事件处理
     */
    private onSceneLoadStart = (data: any): void => {
        console.log('[HomeSceneController] 场景加载开始:', data.sceneName);
        // 可以在这里添加转场动画等
    };

    /**
     * 场景加载完成事件处理
     */
    private onSceneLoadComplete = (data: any): void => {
        console.log('[HomeSceneController] 场景加载完成:', data.sceneName);
    };
}
