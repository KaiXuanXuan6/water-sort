import { _decorator, Component, Node, Sprite, Button, UITransform } from 'cc';
import { AssetLoader } from '../utils/AssetLoader';
import { BouncePopAnim } from '../animation/BouncePopAnim';

const { ccclass, property } = _decorator;

/** 背景块选中回调 */
export type OnBackgroundBlockSelect = (bgId: number) => void;
/** 锁被点击回调 */
export type OnBackgroundLockClick = (bgId: number) => void;

/**
 * 收集页背景块控制器
 * 与 BottleBlock 类似：有 bg2、锁与锁动画；未解锁时显示 bg2；选中时对背景图节点播放 BouncePopAnim（无旋转）。
 */
@ccclass('BackgroundBlockController')
export class BackgroundBlockController extends Component {
    @property(Node)
    bottleBgNode: Node | null = null;

    /** 未解锁时显示的背景（与 BottleBlock 的 bottleBg2 类似） */
    @property(Node)
    bottleBg2Node: Node | null = null;

    @property(Sprite)
    bottleSprite: Sprite | null = null;

    @property(Node)
    lockNode: Node | null = null;

    @property(Node)
    checkboxNode: Node | null = null;

    @property(Node)
    checkinNode: Node | null = null;

    @property
    rotateDuration = 0.2;

    private _bgId = 1;
    private _isUnlocked = true;
    private _isSelected = false;
    private _onSelect: OnBackgroundBlockSelect | null = null;
    private _onLockClick: OnBackgroundLockClick | null = null;

    protected onLoad(): void {}

    public init(
        bgId: number,
        isUnlocked: boolean,
        isSelected: boolean,
        onSelect: OnBackgroundBlockSelect | null,
        onLockClick: OnBackgroundLockClick | null
    ): void {
        this._bgId = bgId;
        this._isUnlocked = isUnlocked;
        this._isSelected = isSelected;
        this._onSelect = onSelect;
        this._onLockClick = onLockClick;
        this.setupImage();
        this.setupButtons();
        this.applyVisuals();
    }

    public setSelected(selected: boolean): void {
        if (this._isSelected === selected) return;
        this._isSelected = selected;
        this.applyVisuals();
        if (selected && this.bottleSprite) {
            let anim = this.bottleSprite.node.getComponent(BouncePopAnim);
            if (!anim) anim = this.bottleSprite.node.addComponent(BouncePopAnim);
            anim.play();
        }
        if (selected && this.checkinNode) {
            let anim = this.checkinNode.getComponent(BouncePopAnim);
            if (!anim) anim = this.checkinNode.addComponent(BouncePopAnim);
            anim.play();
        }
    }

    public get bgId(): number {
        return this._bgId;
    }

    public get isUnlocked(): boolean {
        return this._isUnlocked;
    }

    public get isSelected(): boolean {
        return this._isSelected;
    }

    private async setupImage(): Promise<void> {
        if (!this.bottleSprite) return;
        const frame = await AssetLoader.loadBackgroundSprite(this._bgId);
        if (frame && this.bottleSprite.isValid) {
            this.bottleSprite.spriteFrame = frame;
            this.fitImageInBlock();
        }
    }

    private fitImageInBlock(): void {
        if (!this.bottleSprite) return;
        const blockUT = this.bottleBgNode?.getComponent(UITransform) ?? this.node.getComponent(UITransform);
        const imgUT = this.bottleSprite.node.getComponent(UITransform);
        if (!blockUT || !imgUT) return;
        const blockW = blockUT.contentSize.width;
        const blockH = blockUT.contentSize.height;
        let imgW = imgUT.contentSize.width;
        let imgH = imgUT.contentSize.height;
        if ((imgW <= 0 || imgH <= 0) && this.bottleSprite.spriteFrame) {
            const rect = this.bottleSprite.spriteFrame.rect;
            imgW = rect.width;
            imgH = rect.height;
        }
        if (imgW <= 0 || imgH <= 0) return;
        const scale = Math.min(blockW / imgW, blockH / imgH, 1) * 0.5;
        this.bottleSprite.node.setScale(scale, scale, 1);
    }

    private playLockBounceAnim(): void {
        if (!this.lockNode) return;
        let anim = this.lockNode.getComponent(BouncePopAnim);
        if (!anim) anim = this.lockNode.addComponent(BouncePopAnim);
        anim.play();
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

    private onBlockClick(): void {
        if (!this._isUnlocked) this.playLockBounceAnim();
        if (this._onSelect) this._onSelect(this._bgId);
    }

    private onLockNodeClick(): void {
        this.playLockBounceAnim();
        if (this._onLockClick) this._onLockClick(this._bgId);
    }

    private applyVisuals(): void {
        if (this.bottleBgNode) this.bottleBgNode.active = this._isUnlocked;
        if (this.bottleBg2Node) this.bottleBg2Node.active = !this._isUnlocked;
        if (this.lockNode) this.lockNode.active = !this._isUnlocked;
        if (this.checkboxNode) this.checkboxNode.active = this._isUnlocked;
        if (this.checkinNode) this.checkinNode.active = this._isUnlocked && this._isSelected;
    }
}
