import { _decorator, Component, Node, ScrollView, Prefab, instantiate, tween, Vec3, Button, UITransform } from 'cc';
import { NavigationManager, NavigationEvent } from '../utils/NavigationManager';
import {
    isBottleTypeUnlocked,
    getSelectedBottleType,
    setSelectedBottleType,
    isBackgroundTypeUnlocked,
    getSelectedBackgroundType,
    setSelectedBackgroundType,
    saveToStorage,
    loadFromStorage
} from '../data/UserProfile';
import { BottleBlockController } from './BottleBlockController';
import { BackgroundBlockController } from './BackgroundBlockController';
import { SemiCircleButtonController } from './SemiCircleButtonController';

const { ccclass, property } = _decorator;

const BOTTLE_TYPES_COUNT = 48;
const BACKGROUND_TYPES_COUNT = 32;
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

    /** Bottle 标签按钮（SemiCircleButton） */
    @property(Node)
    bottleTabButton: Node | null = null;

    /** Background 标签按钮（SemiCircleButton） */
    @property(Node)
    backgroundTabButton: Node | null = null;

    @property(ScrollView)
    backgroundScrollView: ScrollView | null = null;

    /** Background 的网格容器（对应 Bottle 的 bottleGridContainer，通常为 backgroundScrollView.content） */
    @property(Node)
    backgroundGridContainer: Node | null = null;

    @property(Prefab)
    backgroundBlockPrefab: Prefab | null = null;

    @property(Node)
    backgroundSelectBoxNode: Node | null = null;

    private _navManager: NavigationManager | null = null;
    private _blockNodes: Node[] = [];
    private _blockControllers: BottleBlockController[] = [];
    private _selectBoxVisible = false;
    private _bgBlockNodes: Node[] = [];
    private _bgBlockControllers: BackgroundBlockController[] = [];
    private _bgSelectBoxVisible = false;

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
        this.setupTabs();
        this.scheduleOnce(() => {
            if (this.bottleScrollView) this.bottleScrollView.scrollToTop(0);
            this.refreshSelectBoxPosition();
        }, 0);
    }

    private setupTabs(): void {
        const bottlePanel = this.bottleScrollView?.node?.parent ?? null;
        if (!this.bottleTabButton || !this.backgroundTabButton) return;

        const bottleCtrl = this.bottleTabButton.getComponent(SemiCircleButtonController);
        const bgCtrl = this.backgroundTabButton.getComponent(SemiCircleButtonController);
        if (bottleCtrl) bottleCtrl.setState(true);
        if (bgCtrl) bgCtrl.setState(false);

        if (this.backgroundSelectBoxNode) {
            this.backgroundSelectBoxNode.active = false;
            this.backgroundSelectBoxNode.setScale(1.05, 1.05, 1);
        }
        const bgPanel = this.backgroundScrollView?.node?.parent;
        if (bgPanel) bgPanel.active = false;
        if (bottlePanel) bottlePanel.active = true;

        const bottleBtn = this.bottleTabButton.getComponent(Button);
        const bgBtn = this.backgroundTabButton.getComponent(Button);
        if (bottleBtn) {
            bottleBtn.node.off(Button.EventType.CLICK);
            bottleBtn.node.on(Button.EventType.CLICK, this.switchToBottle, this);
        }
        if (bgBtn) {
            bgBtn.node.off(Button.EventType.CLICK);
            bgBtn.node.on(Button.EventType.CLICK, this.switchToBackground, this);
        }
    }

    private switchToBottle(): void {
        this.setTabActive(0);
    }

    private switchToBackground(): void {
        this.setTabActive(1);
    }

    /** 0 = Bottle，1 = Background */
    private setTabActive(index: 0 | 1): void {
        const bottlePanel = this.bottleScrollView?.node?.parent ?? null;
        const bottleCtrl = this.bottleTabButton?.getComponent(SemiCircleButtonController);
        const bgCtrl = this.backgroundTabButton?.getComponent(SemiCircleButtonController);
        if (bottleCtrl) bottleCtrl.setState(index === 0);
        if (bgCtrl) bgCtrl.setState(index === 1);
        if (bottlePanel) bottlePanel.active = index === 0;
        const bgPanel = this.backgroundScrollView?.node?.parent;
        if (bgPanel) bgPanel.active = index === 1;
        if (index === 1) {
            this.buildBackgroundGridIfNeeded();
            this.scheduleOnce(() => {
                if (this.backgroundScrollView) this.backgroundScrollView.scrollToTop(0);
                this.refreshBackgroundSelectBoxPosition();
            }, 0);
        }
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

    // ---------- Background 标签 ----------
    private buildBackgroundGridIfNeeded(): void {
        if (this._bgBlockNodes.length > 0) return;
        this.buildBackgroundGrid();
    }

    private buildBackgroundGrid(): void {
        const container = this.backgroundGridContainer ?? this.backgroundScrollView?.content ?? null;
        if (!container) return;
        if (!this.backgroundBlockPrefab) {
            console.warn('[CollectionSceneController] 未设置 backgroundBlockPrefab');
            return;
        }

        container.removeAllChildren();
        this._bgBlockNodes = [];
        this._bgBlockControllers = [];

        const selectedBg = getSelectedBackgroundType();

        for (let id = 1; id <= BACKGROUND_TYPES_COUNT; id++) {
            const blockNode = instantiate(this.backgroundBlockPrefab);
            let ctrl = blockNode.getComponent(BackgroundBlockController);
            if (!ctrl) ctrl = blockNode.addComponent(BackgroundBlockController);
            const isUnlocked = isBackgroundTypeUnlocked(id);
            const isSelected = id === selectedBg;
            ctrl.init(id, isUnlocked, isSelected, this.onBackgroundBlockSelected.bind(this), this.onBackgroundLockClicked.bind(this));
            container.addChild(blockNode);
            this._bgBlockNodes.push(blockNode);
            this._bgBlockControllers.push(ctrl);
        }

        if (this.backgroundSelectBoxNode && this.backgroundSelectBoxNode.parent !== container) {
            this.backgroundSelectBoxNode.removeFromParent();
            container.addChild(this.backgroundSelectBoxNode);
        }
        if (this.backgroundScrollView) this.backgroundScrollView.cancelInnerEvents = false;
    }

    private onBackgroundBlockSelected(bgId: number): void {
        this.moveSelectBoxToBackgroundBlock(bgId);
        if (isBackgroundTypeUnlocked(bgId)) {
            setSelectedBackgroundType(bgId);
            saveToStorage();
            this.refreshAllBackgroundBlocksSelection();
        }
    }

    private onBackgroundLockClicked(bgId: number): void {
        this.moveSelectBoxToBackgroundBlock(bgId);
    }

    private refreshAllBackgroundBlocksSelection(): void {
        const selected = getSelectedBackgroundType();
        for (const ctrl of this._bgBlockControllers) {
            ctrl.setSelected(ctrl.bgId === selected);
        }
    }

    private refreshBackgroundSelectBoxPosition(): void {
        const selected = getSelectedBackgroundType();
        const idx = selected - 1;
        if (idx >= 0 && idx < this._bgBlockNodes.length) {
            this.moveSelectBoxToBackgroundBlock(selected, false);
        } else if (this.backgroundSelectBoxNode) {
            this.backgroundSelectBoxNode.active = false;
            this._bgSelectBoxVisible = false;
        }
    }

    private moveSelectBoxToBackgroundBlock(bgId: number, animate = true): void {
        const container = this.backgroundGridContainer ?? this.backgroundScrollView?.content ?? null;
        if (!this.backgroundSelectBoxNode || !container) return;

        const idx = bgId - 1;
        if (idx < 0 || idx >= this._bgBlockNodes.length) return;

        if (this.backgroundSelectBoxNode.parent !== container) {
            this.backgroundSelectBoxNode.removeFromParent();
            container.addChild(this.backgroundSelectBoxNode);
        }

        const blockNode = this._bgBlockNodes[idx];
        const targetLocal = new Vec3(blockNode.position);

        if (!this._bgSelectBoxVisible) {
            this.backgroundSelectBoxNode.active = true;
            this.backgroundSelectBoxNode.setPosition(targetLocal);
            this._bgSelectBoxVisible = true;
            return;
        }

        if (animate) {
            tween(this.backgroundSelectBoxNode)
                .to(SELECT_BOX_TWEEN_DURATION, { position: targetLocal }, { easing: 'quadOut' })
                .start();
        } else {
            this.backgroundSelectBoxNode.setPosition(targetLocal);
        }
    }
}
