import { _decorator, Button, Component, Node, tween, Vec3 } from 'cc';
import { NavigationManager, NavigationEvent, SceneName } from '../utils/NavigationManager';
import { SoundManager } from '../utils/SoundManager';

const { ccclass, property } = _decorator;

const SELECTED_SCALE = 1.2;
const NORMAL_SCALE = 1;
/** 选中时按钮上移距离 */
const SELECTED_OFFSET_Y = 12;
/** 高亮滑动与按钮上浮动画时长 */
const ANIM_DURATION = 0.25;

/**
 * BottomBar 当前 root 高亮
 * 高亮在三个按钮之间滑动，选中按钮播放上浮+放大动画。
 */
@ccclass('BottomBarController')
export class BottomBarController extends Component {
    @property(Node)
    homeButton: Node | null = null;

    @property(Node)
    mapButton: Node | null = null;

    @property(Node)
    collectionButton: Node | null = null;

    private _nav: NavigationManager | null = null;
    private _onSceneChange = (): void => this.applyCurrentScene();
    /** BottomBar 下唯一的 HighlightBg 节点，在三个按钮之间滑动 */
    private _highlightBg: Node | null = null;
    /** 当前选中的按钮 */
    private _currentButton: Node | null = null;
    /** 各按钮原始本地位置 */
    private _originalPos = new Map<Node, Vec3>();

    protected onLoad(): void {
        if (!this.homeButton) this.homeButton = this.node.getChildByName('HomeButton') ?? null;
        if (!this.mapButton) this.mapButton = this.node.getChildByName('MapButton') ?? null;
        if (!this.collectionButton) this.collectionButton = this.node.getChildByName('CollectionButton') ?? null;

        this.storeOriginalPositions();
        this.bindButtonEvents();

        this._highlightBg = this.node.getChildByName('HighlightBg') ?? null;

        this._nav = NavigationManager.instance;
        if (this._nav) {
            this._nav.addListener(NavigationEvent.SCENE_LOAD_START, this._onSceneChange);
        }
        this.scheduleOnce(() => this.applyCurrentScene(), 0);
    }

    protected onDestroy(): void {
        if (this._nav) {
            this._nav.removeListener(NavigationEvent.SCENE_LOAD_START, this._onSceneChange);
        }
    }

    private storeOriginalPositions(): void {
        const list = [this.homeButton, this.mapButton, this.collectionButton].filter(Boolean) as Node[];
        for (const btn of list) {
            this._originalPos.set(btn, btn.position.clone());
        }
    }

    /** 选中态时按钮的目标位置（上浮后），供按钮动画用 */
    private getButtonSelectedPosition(button: Node): Vec3 {
        const orig = this._originalPos.get(button);
        if (!orig) return button.position.clone();
        return new Vec3(orig.x, orig.y + SELECTED_OFFSET_Y, orig.z);
    }

    /** 按钮中心 x（高亮只做 x 轴滑动，y/z 由编辑器布局控制） */
    private getButtonCenterX(button: Node): number {
        return this._originalPos.get(button)?.x ?? button.position.x;
    }

    private getButtonForScene(scene: SceneName): Node | null {
        if (scene === SceneName.HOME) return this.homeButton;
        if (scene === SceneName.MAP) return this.mapButton;
        if (scene === SceneName.COLLECTION) return this.collectionButton;
        return null;
    }

    private applyCurrentScene(): void {
        if (!this._nav) return;
        const scene = this._nav.currentScene;
        const nextButton = this.getButtonForScene(scene);
        if (!nextButton) return;

        if (nextButton === this._currentButton) {
            return;
        }

        const targetX = this.getButtonCenterX(nextButton);

        if (this._highlightBg) {
            this._highlightBg.active = true;
            if (this._currentButton === null) {
                const p = this._highlightBg.position.clone();
                p.x = targetX;
                this._highlightBg.setPosition(p);
            } else {
                const start = this._highlightBg.position.clone();
                const targetPos = new Vec3(targetX, start.y, start.z);
                tween(this._highlightBg)
                    .to(ANIM_DURATION, { position: targetPos }, { easing: 'quadOut' })
                    .start();
            }
        }

        if (this._currentButton) {
            this.animateButtonToRest(this._currentButton);
        }
        this.animateButtonToSelected(nextButton);

        this._currentButton = nextButton;
    }

    /** 按钮从选中态回到默认（位置、缩放） */
    private animateButtonToRest(button: Node): void {
        const orig = this._originalPos.get(button);
        if (!orig) return;
        tween(button)
            .to(ANIM_DURATION, {
                position: orig.clone(),
                scale: new Vec3(NORMAL_SCALE, NORMAL_SCALE, NORMAL_SCALE)
            }, { easing: 'quadOut' })
            .start();
    }

    /** 按钮从默认到选中态（上浮+放大） */
    private animateButtonToSelected(button: Node): void {
        const targetPos = this.getButtonSelectedPosition(button);
        tween(button)
            .to(ANIM_DURATION, {
                position: targetPos,
                scale: new Vec3(SELECTED_SCALE, SELECTED_SCALE, SELECTED_SCALE)
            }, { easing: 'backOut' })
            .start();
    }

    private bindButtonEvents(): void {
        if (this.homeButton) {
            const btn = this.homeButton.getComponent(Button) ?? this.homeButton.addComponent(Button);
            btn.node.on(Button.EventType.CLICK, () => {
                SoundManager.instance?.playOneShot('button');
                NavigationManager.instance?.gotoHome();
            });
        }

        if (this.mapButton) {
            const btn = this.mapButton.getComponent(Button) ?? this.mapButton.addComponent(Button);
            btn.node.on(Button.EventType.CLICK, () => {
                SoundManager.instance?.playOneShot('button');
                NavigationManager.instance?.gotoMap();
            });
        }

        if (this.collectionButton) {
            const btn = this.collectionButton.getComponent(Button) ?? this.collectionButton.addComponent(Button);
            btn.node.on(Button.EventType.CLICK, () => {
                SoundManager.instance?.playOneShot('button');
                NavigationManager.instance?.gotoCollection();
            });
        }
    }
}
