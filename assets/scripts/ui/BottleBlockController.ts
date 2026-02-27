import { _decorator, Component, Node, Sprite, Button, tween, Vec3, UITransform } from 'cc';
import { AssetLoader } from '../utils/AssetLoader';
import { BouncePopAnim } from '../animation/BouncePopAnim';

const { ccclass, property } = _decorator;

/** 瓶子块选中回调 */
export type OnBottleBlockSelect = (bottleType: number) => void;
/** 锁被点击回调 */
export type OnLockClick = (bottleType: number) => void;

/**
 * 收集页瓶子块控制器
 * 挂到瓶子块 prefab 根上，根据 bottleType、解锁状态、选中状态刷新显隐与贴图；处理整块点击（选中）与锁图标点击（弹跳）。
 * 未解锁时使用 bottle_bg2 作为背景（替代矩形 mask，适配不规则背景）。
 * 所有子节点仅通过编辑器绑定，不使用 getChildByName。
 */
@ccclass('BottleBlockController')
export class BottleBlockController extends Component {
    @property(Node)
    bottleBgNode: Node | null = null;

    /** 未解锁时显示的背景（bottle_bg2，不规则形状） */
    @property(Node)
    bottleBg2Node: Node | null = null;

    @property(Sprite)
    bottleSprite: Sprite | null = null;

    @property(Node)
    lockNode: Node | null = null;

    /** 未勾选时显示的 checkbox 节点（可带子节点 checkin） */
    @property(Node)
    checkboxNode: Node | null = null;

    /** 勾选时显示的 checkin 节点（通常为 checkbox 的子节点） */
    @property(Node)
    checkinNode: Node | null = null;

    /** 瓶子旋转 45° 动画时长 */
    @property
    rotateDuration = 0.2;

    private _bottleType = 1;
    private _isUnlocked = true;
    private _isSelected = false;
    private _onSelect: OnBottleBlockSelect | null = null;
    private _onLockClick: OnLockClick | null = null;

    protected onLoad(): void {}

    /**
     * 初始化块数据与回调（由 CollectionSceneController 在实例化后调用）
     */
    public init(
        bottleType: number,
        isUnlocked: boolean,
        isSelected: boolean,
        onSelect: OnBottleBlockSelect | null,
        onLockClick: OnLockClick | null
    ): void {
        this._bottleType = bottleType;
        this._isUnlocked = isUnlocked;
        this._isSelected = isSelected;
        this._onSelect = onSelect;
        this._onLockClick = onLockClick;
        this.setupBottleSprite();
        this.setupButtons();
        this.applyVisuals();
        if (this.bottleSprite) this.bottleSprite.node.eulerAngles = new Vec3(0, 0, this._isSelected ? -45 : 0);
    }

    /** 设置选中状态并刷新显示（由 CollectionSceneController 刷新所有块时调用） */
    public setSelected(selected: boolean): void {
        if (this._isSelected === selected) return;
        this._isSelected = selected;
        this.applyVisuals();
        if (this.bottleSprite) {
            const targetAngle = selected ? -45 : 0;
            tween(this.bottleSprite.node)
                .to(this.rotateDuration, { eulerAngles: new Vec3(0, 0, targetAngle) }, { easing: 'backOut' })
                .start();
        }
    }

    public get bottleType(): number {
        return this._bottleType;
    }

    public get isUnlocked(): boolean {
        return this._isUnlocked;
    }

    public get isSelected(): boolean {
        return this._isSelected;
    }

    private async setupBottleSprite(): Promise<void> {
        if (!this.bottleSprite) return;
        const frame = await AssetLoader.loadBottleSprite(this._bottleType, 1);
        if (frame && this.bottleSprite.isValid) {
            this.bottleSprite.spriteFrame = frame;
            this.fitBottleInBlock();
        }
    }

    /** 按块的可视尺寸缩放瓶子，使瓶子不超出块范围 */
    private fitBottleInBlock(): void {
        if (!this.bottleSprite) return;
        const blockUT = this.bottleBgNode?.getComponent(UITransform) ?? this.node.getComponent(UITransform);
        const bottleUT = this.bottleSprite.node.getComponent(UITransform);
        if (!blockUT || !bottleUT) return;
        const blockW = blockUT.contentSize.width;
        const blockH = blockUT.contentSize.height;
        let bottleW = bottleUT.contentSize.width;
        let bottleH = bottleUT.contentSize.height;
        if ((bottleW <= 0 || bottleH <= 0) && this.bottleSprite.spriteFrame) {
            const rect = this.bottleSprite.spriteFrame.rect;
            bottleW = rect.width;
            bottleH = rect.height;
        }
        if (bottleW <= 0 || bottleH <= 0) return;
        const scaleX = blockW / bottleW;
        const scaleY = blockH / bottleH;
        const scale = Math.min(scaleX, scaleY, 1) * 0.5;
        this.bottleSprite.node.setScale(new Vec3(scale, scale, 1));
    }

    private setupButtons(): void {
        const rootBtn = this.node.getComponent(Button) ?? this.node.addComponent(Button);
        rootBtn.node.off(Button.EventType.CLICK);
        rootBtn.node.on(Button.EventType.CLICK, this.onBlockClick, this);

        if (this.lockNode) {
            const lockBtn = this.lockNode.getComponent(Button) ?? this.lockNode.addComponent(Button);
            lockBtn.node.off(Button.EventType.CLICK);
            lockBtn.node.on(Button.EventType.CLICK, this.onLockNodeClick, this);
        }
    }

    private playLockBounceAnim(): void {
        if (!this.lockNode) return;
        let anim = this.lockNode.getComponent(BouncePopAnim);
        if (!anim) anim = this.lockNode.addComponent(BouncePopAnim);
        anim.play();
    }

    private onBlockClick(): void {
        if (!this._isUnlocked) this.playLockBounceAnim();
        if (this._onSelect) this._onSelect(this._bottleType);
    }

    private onLockNodeClick(): void {
        this.playLockBounceAnim();
        if (this._onLockClick) this._onLockClick(this._bottleType);
    }

    private applyVisuals(): void {
        if (this.bottleBgNode) this.bottleBgNode.active = this._isUnlocked;
        if (this.bottleBg2Node) this.bottleBg2Node.active = !this._isUnlocked;
        if (this.lockNode) this.lockNode.active = !this._isUnlocked;

        if (this.checkboxNode) this.checkboxNode.active = this._isUnlocked;
        if (this.checkinNode) this.checkinNode.active = this._isUnlocked && this._isSelected;
    }
}
