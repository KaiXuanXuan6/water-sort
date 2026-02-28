import { _decorator, Component, Node, Sprite, Button, UITransform, Color } from 'cc';
import { AssetLoader } from '../utils/AssetLoader';
import { BouncePopAnim } from '../animation/BouncePopAnim';

const { ccclass, property } = _decorator;

/** 背景块选中回调 */
export type OnBackgroundBlockSelect = (bgId: number) => void;
/** 锁被点击回调 */
export type OnBackgroundLockClick = (bgId: number) => void;

/**
 * 收集页背景块控制器
 */
@ccclass('BackgroundBlockController')
export class BackgroundBlockController extends Component {
    @property(Node)
    backgroundBgNode: Node | null = null;

    @property(Node)
    backgroundBg2Node: Node | null = null;

    @property(Sprite)
    backgroundSprite: Sprite | null = null;

    @property(Node)
    lockNode: Node | null = null;

    @property(Node)
    checkboxNode: Node | null = null;

    @property(Node)
    checkinNode: Node | null = null;

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
        if (!this.backgroundSprite) return;
        const frame = await AssetLoader.loadBackgroundSprite(this._bgId);
        if (frame && this.backgroundSprite.isValid) {
            this.backgroundSprite.spriteFrame = frame;
            this.fitImageInBlock();
        }
    }

    private fitImageInBlock(): void {
        if (!this.backgroundSprite) return;
        const blockUT = this.backgroundBgNode?.getComponent(UITransform) ?? this.node.getComponent(UITransform);
        const imgUT = this.backgroundSprite.node.getComponent(UITransform);
        if (!blockUT || !imgUT) return;
        const blockW = blockUT.contentSize.width;
        const blockH = blockUT.contentSize.height;
        let imgW = imgUT.contentSize.width;
        let imgH = imgUT.contentSize.height;
        if ((imgW <= 0 || imgH <= 0) && this.backgroundSprite.spriteFrame) {
            const rect = this.backgroundSprite.spriteFrame.rect;
            imgW = rect.width;
            imgH = rect.height;
        }
        if (imgW <= 0 || imgH <= 0) return;
        const scaleX = blockW / imgW * 0.85;
        const scaleY = blockH / imgH * 0.85;
        this.backgroundSprite.node.setScale(scaleX, scaleY, 1);
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

    /** 未解锁时主图使用的灰度（Sprite.color 乘色） */
    private static readonly LOCKED_GRAY = new Color(128, 128, 128, 255);
    /** 选中时整块缩放 */
    private static readonly SELECTED_SCALE = 1.05;

    private applyVisuals(): void {
        const scale = this._isSelected ? BackgroundBlockController.SELECTED_SCALE : 1;
        this.node.setScale(scale, scale, 1);
        if (this.backgroundBgNode) this.backgroundBgNode.active = true;
        if (this.backgroundBg2Node) this.backgroundBg2Node.active = false;
        if (this.lockNode) this.lockNode.active = !this._isUnlocked;
        if (this.backgroundSprite) {
            this.backgroundSprite.color = this._isUnlocked ? Color.WHITE : BackgroundBlockController.LOCKED_GRAY;
        }
        if (this.checkboxNode) this.checkboxNode.active = this._isUnlocked;
        if (this.checkinNode) this.checkinNode.active = this._isUnlocked && this._isSelected;
    }
}
