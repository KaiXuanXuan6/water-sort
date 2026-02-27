import { _decorator, Component, Node, ScrollView, Prefab, instantiate, tween, Vec3 } from 'cc';
import { NavigationManager, NavigationEvent } from '../utils/NavigationManager';
import {
    getUnlockedBottleTypes,
    isBottleTypeUnlocked,
    getSelectedBottleType,
    setSelectedBottleType,
    saveToStorage,
    loadFromStorage
} from '../data/UserProfile';
import { BottleBlockController } from './BottleBlockController';

const { ccclass, property } = _decorator;

const BOTTLE_TYPES_COUNT = 48;
const SELECT_BOX_TWEEN_DURATION = 0.2;

/**
 * 收集页控制器
 * 负责瓶子图鉴 ScrollView：动态生成 1～48 瓶子块网格、选中回调、SelectBox 框选与 tween 移动。
 */
@ccclass('CollectionSceneController')
export class CollectionSceneController extends Component {
    @property(ScrollView)
    bottleScrollView: ScrollView | null = null;

    @property(Node)
    bottleGridContainer: Node | null = null;

    @property(Prefab)
    bottleBlockPrefab: Prefab | null = null;

    @property(Node)
    selectBoxNode: Node | null = null;

    private _navManager: NavigationManager | null = null;
    private _blockNodes: Node[] = [];
    private _blockControllers: BottleBlockController[] = [];
    private _selectBoxVisible = false;

    protected onLoad(): void {
        if (this.selectBoxNode) {
            this.selectBoxNode.active = false;
            this.selectBoxNode.setScale(1.05, 1.05, 1);
        }
        this._selectBoxVisible = false;
        if (this.bottleScrollView) this.bottleScrollView.cancelInnerEvents = false;
        this._navManager = NavigationManager.instance;
        if (this._navManager) this.setupNavigationListeners();
        loadFromStorage();
        this.buildGrid();
        const container = this.bottleGridContainer ?? this.bottleScrollView?.content ?? null;
        if (container && this.selectBoxNode && this.selectBoxNode.parent !== container) {
            this.selectBoxNode.removeFromParent();
            container.addChild(this.selectBoxNode);
        }
        if (this.bottleScrollView) this.bottleScrollView.scrollToTop(0);
        this.scheduleOnce(() => this.refreshSelectBoxPosition(), 0);
    }

    protected start(): void {
        if (!this._navManager) {
            this._navManager = NavigationManager.instance;
            if (this._navManager) this.setupNavigationListeners();
        }
    }

    protected onDestroy(): void {
        if (this._navManager) {
            this._navManager.removeListener(NavigationEvent.SCENE_LOAD_START, this.onSceneLoadStart);
        }
    }

    private setupNavigationListeners(): void {
        if (this._navManager) {
            this._navManager.addListener(NavigationEvent.SCENE_LOAD_START, this.onSceneLoadStart);
        }
    }

    private onSceneLoadStart = (): void => {};

    private buildGrid(): void {
        const container = this.bottleGridContainer ?? this.bottleScrollView?.content ?? null;
        if (!container) {
            console.warn('[CollectionSceneController] 未设置 bottleGridContainer 或 ScrollView.content');
            return;
        }
        if (!this.bottleBlockPrefab) {
            console.warn('[CollectionSceneController] 未设置 bottleBlockPrefab');
            return;
        }

        container.removeAllChildren();
        this._blockNodes = [];
        this._blockControllers = [];

        const selectedType = getSelectedBottleType();

        for (let typeId = 1; typeId <= BOTTLE_TYPES_COUNT; typeId++) {
            const blockNode = instantiate(this.bottleBlockPrefab);
            const ctrl = blockNode.getComponent(BottleBlockController);
            if (!ctrl) {
                blockNode.addComponent(BottleBlockController);
            }
            const controller = blockNode.getComponent(BottleBlockController)!;
            const isUnlocked = isBottleTypeUnlocked(typeId);
            const isSelected = typeId === selectedType;
            controller.init(typeId, isUnlocked, isSelected, this.onBlockSelected.bind(this), this.onLockClicked.bind(this));
            container.addChild(blockNode);
            this._blockNodes.push(blockNode);
            this._blockControllers.push(controller);
        }
    }

    private onBlockSelected(bottleType: number): void {
        this.moveSelectBoxToBlock(bottleType);
        if (isBottleTypeUnlocked(bottleType)) {
            setSelectedBottleType(bottleType);
            saveToStorage();
            this.refreshAllBlocksSelection();
        }
    }

    private onLockClicked(bottleType: number): void {
        this.moveSelectBoxToBlock(bottleType);
    }

    private refreshAllBlocksSelection(): void {
        const selectedType = getSelectedBottleType();
        for (const ctrl of this._blockControllers) {
            ctrl.setSelected(ctrl.bottleType === selectedType);
        }
    }

    private refreshSelectBoxPosition(): void {
        const selectedType = getSelectedBottleType();
        const idx = selectedType - 1;
        if (idx >= 0 && idx < this._blockNodes.length) {
            this.moveSelectBoxToBlock(selectedType, false);
        } else if (this.selectBoxNode) {
            this.selectBoxNode.active = false;
            this._selectBoxVisible = false;
        }
    }

    private moveSelectBoxToBlock(bottleType: number, animate = true): void {
        const container = this.bottleGridContainer ?? this.bottleScrollView?.content ?? null;
        if (!this.selectBoxNode || !container) return;

        const idx = bottleType - 1;
        if (idx < 0 || idx >= this._blockNodes.length) return;

        if (this.selectBoxNode.parent !== container) {
            this.selectBoxNode.removeFromParent();
            container.addChild(this.selectBoxNode);
        }

        const blockNode = this._blockNodes[idx];
        const targetLocal = new Vec3(blockNode.position);

        if (!this._selectBoxVisible) {
            this.selectBoxNode.active = true;
            this.selectBoxNode.setPosition(targetLocal);
            this._selectBoxVisible = true;
            return;
        }

        if (animate) {
            tween(this.selectBoxNode)
                .to(SELECT_BOX_TWEEN_DURATION, { position: targetLocal }, { easing: 'quadOut' })
                .start();
        } else {
            this.selectBoxNode.setPosition(targetLocal);
        }
    }
}
