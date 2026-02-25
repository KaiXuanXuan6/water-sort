import { _decorator, Component, Node, Button, Label, ScrollView } from 'cc';
import { NavigationManager, NavigationEvent } from '../utils/NavigationManager';

const { ccclass, property } = _decorator;

/**
 * 收集页控制器
 * 负责收集页（图鉴）的初始化和交互，展示玩家解锁的瓶子；具体数据与列表逻辑后续接入
 */
@ccclass('CollectionSceneController')
export class CollectionSceneController extends Component {
    @property(Button)
    backButton: Button | null = null;

    @property(Label)
    titleLabel: Label | null = null;

    @property(ScrollView)
    bottleScrollView: ScrollView | null = null;

    @property(Node)
    bottleGridContainer: Node | null = null;

    private _navManager: NavigationManager | null = null;

    protected onLoad(): void {
        console.log('[CollectionSceneController] 收集页加载完成');

        this._navManager = NavigationManager.instance;
        this.bindEvents();

        if (this._navManager) {
            this.setupNavigationListeners();
        }
    }

    protected start(): void {
        if (!this._navManager) {
            this._navManager = NavigationManager.instance;
            if (this._navManager) {
                this.setupNavigationListeners();
            } else {
                console.error('[CollectionSceneController] 未找到导航管理器');
            }
        }
    }

    protected onDestroy(): void {
        if (this._navManager) {
            this._navManager.removeListener(NavigationEvent.SCENE_LOAD_START, this.onSceneLoadStart);
        }
    }

    private bindEvents(): void {
        if (this.backButton) {
            this.backButton.node.on(Button.EventType.CLICK, this.onBackClick, this);
        }
    }

    private setupNavigationListeners(): void {
        if (this._navManager) {
            this._navManager.addListener(NavigationEvent.SCENE_LOAD_START, this.onSceneLoadStart);
        }
    }

    private onBackClick(): void {
        this._navManager?.gotoHome();
    }

    private onSceneLoadStart = (): void => {
        // 占位：可做转场等
    };
}
