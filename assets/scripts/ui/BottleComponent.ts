import { _decorator, Component, Sprite, UITransform, Color, Vec3, tween, Vec2, Node, EventTouch, Mask, Graphics, UITransform as UITransformType } from 'cc';
import { BottleState, WaterLayer } from '../data/LevelConfig';
import { AssetLoader } from '../utils/AssetLoader';

const { ccclass, property } = _decorator;

/**
 * 瓶子点击事件数据
 */
export interface BottleClickEventData {
    bottleIndex: number;
    bottleId: string;
}

/**
 * 瓶子状态枚举
 */
export enum BottleStateEnum {
    IDLE = 'idle',
    SELECTED = 'selected',
    POURING = 'pouring',
    RECEIVING = 'receiving',
    DISABLED = 'disabled'
}

/**
 * 颜色配置
 * 将颜色ID映射到实际颜色值
 */
interface ColorConfig {
    colorId: number;
    color: Color;
}

/**
 * 瓶子组件
 * 负责瓶子的显示、交互和动画
 *
 * 编辑器使用说明：
 * 1. 在场景中创建节点层级：Bottle → BottleSprite → WaterContainer
 * 2. BottleSprite 添加 Sprite 组件并设置图片
 * 3. WaterContainer 添加 Mask 组件（Type = RECT）
 * 4. 将对应节点拖拽到组件属性
 * 5. 保存为预制体（水层由代码按纯色动态生成）
 */
@ccclass('BottleComponent')
export class BottleComponent extends Component {
    // ========== 组件属性绑定 ==========

    /** 瓶子 Sprite */
    @property(Sprite)
    bottleSprite: Sprite | null = null;

    /** 水层容器节点（用于放置水层） */
    @property(Node)
    waterContainer: Node | null = null;

    /** 选中状态偏移量（Y轴） */
    @property({ tooltip: '选中时向上移动的距离' })
    selectedOffset: number = 30;

    /** 倾倒动画持续时间（秒） */
    @property({ tooltip: '倾倒动画时长' })
    pourDuration: number = 0.3;

    /** 水层高度（每层水的高度） */
    @property({ tooltip: '单层水的高度' })
    waterLayerHeight: number = 25;

    /** 瓶子内边距（左右） */
    @property({ tooltip: '水层距离瓶壁的距离' })
    waterPadding: number = 4;

    // ========== 内部状态 ==========

    private _bottleIndex: number = -1;
    private _bottleState: BottleStateEnum = BottleStateEnum.IDLE;
    private _bottleData: BottleState | null = null;
    private _waterLayerNodes: Node[] = [];
    private _originalPosition: Vec3 = new Vec3();

    // 颜色配置（可在运行时修改）
    private static colorConfigs: ColorConfig[] = [
        { colorId: 1, color: new Color(255, 59, 48) },    // 红色
        { colorId: 2, color: new Color(48, 209, 88) },    // 绿色
        { colorId: 3, color: new Color(48, 144, 255) },    // 蓝色
        { colorId: 4, color: new Color(255, 204, 0) },    // 黄色
        { colorId: 5, color: new Color(175, 82, 222) },   // 紫色
        { colorId: 6, color: new Color(255, 149, 0) },   // 橙色
        { colorId: 7, color: new Color(0, 206, 209) },    // 青色
        { colorId: 8, color: new Color(255, 105, 180) },   // 粉色
        { colorId: 9, color: new Color(119, 136, 153) },  // 灰色
        { colorId: 10, color: new Color(255, 255, 255) }, // 白色
        { colorId: 11, color: new Color(139, 90, 43) },   // 褐色
    ];

    // ========== 事件 ==========

    /** 瓶子点击事件 */
    public static readonly EVENT_BOTTLE_CLICK = 'bottle-click';

    /** 瓶子倾倒开始事件 */
    public static readonly EVENT_POUR_START = 'bottle-pour-start';

    /** 瓶子倾倒结束事件 */
    public static readonly EVENT_POUR_END = 'bottle-pour-end';

    /** 瓶子状态改变事件 */
    public static readonly EVENT_STATE_CHANGE = 'bottle-state-change';

    // ========== 公共属性 ==========

    /** 获取瓶子索引 */
    public get bottleIndex(): number {
        return this._bottleIndex;
    }

    /** 获取瓶子状态 */
    public get state(): BottleStateEnum {
        return this._bottleState;
    }

    /** 获取瓶子数据 */
    public get bottleData(): BottleState | null {
        return this._bottleData;
    }

    /** 是否选中 */
    public get isSelected(): boolean {
        return this._bottleState === BottleStateEnum.SELECTED;
    }

    /** 是否空闲 */
    public get isIdle(): boolean {
        return this._bottleState === BottleStateEnum.IDLE;
    }

    /** 是否正在倾倒 */
    public get isPouring(): boolean {
        return this._bottleState === BottleStateEnum.POURING || this._bottleState === BottleStateEnum.RECEIVING;
    }

    // ========== 生命周期 ==========

    protected onLoad(): void {
        // 保存原始位置
        this._originalPosition.set(this.node.position);

        // 自动创建必要的节点结构（如果未在编辑器中配置）
        this.setupDefaultNodes();

        // 绑定点击事件
        this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);

        // 设置遮罩（使水层只在瓶子内显示）
        this.setupBottleMask();

        console.log(`[BottleComponent] 瓶子 ${this._bottleIndex} 加载完成`);
    }

    /**
     * 设置默认节点结构（如果编辑器中未配置）
     */
    private async setupDefaultNodes(): Promise<void> {
        // 创建或获取瓶子 Sprite
        if (!this.bottleSprite) {
            const spriteNode = new Node('BottleSprite');
            const sprite = spriteNode.addComponent(Sprite);
            const transform = spriteNode.addComponent(UITransformType);

            // 设置默认尺寸
            transform.setContentSize(80, 120);

            // 从数据中的 bottleType 加载瓶子图（仅代码创建瓶子时走此分支）
            if (this._bottleData?.bottleType) {
                const loadedFrame = await AssetLoader.loadBottleSprite(
                    this._bottleData.bottleType,
                    1
                );
                if (loadedFrame) {
                    sprite.spriteFrame = loadedFrame;
                }
            }

            this.node.addChild(spriteNode);
            this.bottleSprite = sprite;
        }

        // 创建或获取水层容器
        if (!this.waterContainer) {
            this.waterContainer = new Node('WaterContainer');
            this.waterContainer.addComponent(UITransformType);
            this.waterContainer.addComponent(Mask);
            this.node.addChild(this.waterContainer);
        }

        // 如果水层容器没有 Mask，则添加
        if (!this.waterContainer.getComponent(Mask)) {
            const mask = this.waterContainer.addComponent(Mask);
            mask.type = Mask.Type.RECT;
        }
    }

    protected start(): void {
        // 如果有初始数据，渲染瓶子
        if (this._bottleData) {
            this.renderWaterLayers();
        }
    }

    protected onDestroy(): void {
        // 移除事件监听
        this.node.off(Node.EventType.TOUCH_START, this.onTouchStart, this);
    }

    // ========== 初始化方法 ==========

    /**
     * 初始化瓶子
     */
    public init(index: number, data: BottleState): void {
        this._bottleIndex = index;
        this._bottleData = data;

        // 若关卡指定 bottleType，按类型加载瓶子图与水容器遮罩图（一份预制体多类型复用）
        this.applyBottleType();

        // 渲染水层
        this.renderWaterLayers();

        console.log(`[BottleComponent] 初始化瓶子 ${index}:`, data);
    }

    /**
     * 根据 data.bottleType 加载并设置瓶子 Sprite 与 WaterContainer 遮罩图（SPRITE_STENCIL 时用 x_2）
     */
    private applyBottleType(): void {
        const typeId = this._bottleData?.bottleType;
        if (typeId == null || !this.bottleSprite) return;

        AssetLoader.loadBottleSprite(typeId, 1).then((frame) => {
            if (frame && this.bottleSprite) this.bottleSprite.spriteFrame = frame;
        });

        if (!this.waterContainer) return;
        const mask = this.waterContainer.getComponent(Mask);
        if (!mask || (mask as any).type !== 3) return; // 3 = SPRITE_STENCIL
        const stencilSprite = this.waterContainer.getComponent(Sprite);
        if (stencilSprite) {
            AssetLoader.loadBottleSprite(typeId, 2).then((frame) => {
                if (frame && stencilSprite.isValid) stencilSprite.spriteFrame = frame;
            });
        }
    }

    /**
     * 更新瓶子数据并重新渲染
     */
    public updateData(data: BottleState): void {
        this._bottleData = data;
        this.renderWaterLayers();
    }

    /**
     * 运行时注入 Sprite / 水层容器 / 图片引用（供 BottleCreator 等动态创建时使用，避免 as any 写 @property）
     */
    public setRuntimeRefs(sprite: Sprite, waterContainer: Node): void {
        this.bottleSprite = sprite;
        this.waterContainer = waterContainer;
    }

    /**
     * 设置瓶子索引
     */
    public setBottleIndex(index: number): void {
        this._bottleIndex = index;
    }

    // ========== 渲染方法 ==========

    /**
     * 渲染水层
     */
    public renderWaterLayers(): void {
        if (!this._bottleData || !this.waterContainer) {
            return;
        }

        // 清空现有水层
        this.clearWaterLayers();

        // 渲染新水层
        const waters = this._bottleData.waters;
        const transform = this.waterContainer.getComponent(UITransformType);

        if (transform) {
            // 设置容器尺寸
            const bottleWidth = this.getComponent(UITransformType)?.contentSize.width || 60;
            const bottleHeight = this._bottleData.capacity * this.waterLayerHeight;

            transform.setContentSize(bottleWidth - this.waterPadding * 2, bottleHeight);
        }

        // 从底到顶创建水层（index 0 是底层）
        for (let i = 0; i < waters.length; i++) {
            const waterData = waters[i];
            this.createWaterLayer(waterData, i, waters.length);
        }

        console.log(`[BottleComponent] 渲染水层: ${waters.length} 层`);
    }

    /**
     * 创建单个水层
     */
    private createWaterLayer(waterData: WaterLayer, index: number, totalLayers: number): Node {
        const waterNode = this.createDefaultWaterLayer();

        waterNode.name = `WaterLayer_${index}`;
        waterNode.active = true;

        // 设置位置（从底部开始）
        const yPos = index * this.waterLayerHeight;
        waterNode.setPosition(0, yPos);

        // 设置颜色
        const sprite = waterNode.getComponent(Sprite);
        if (sprite) {
            const color = this.getColorById(waterData.colorId);
            sprite.color = color;
        }

        // 添加到容器
        this.waterContainer!.addChild(waterNode);
        this._waterLayerNodes.push(waterNode);

        return waterNode;
    }

    /**
     * 创建默认水层节点
     */
    private createDefaultWaterLayer(): Node {
        const node = new Node('WaterLayer');
        const transform = node.addComponent(UITransformType);
        const sprite = node.addComponent(Sprite);

        // 设置尺寸
        transform.setContentSize(50, this.waterLayerHeight - 2);

        // 设置白色（会被颜色覆盖）
        sprite.color = Color.WHITE;

        return node;
    }

    /**
     * 清空水层
     */
    private clearWaterLayers(): void {
        for (const node of this._waterLayerNodes) {
            node.destroy();
        }
        this._waterLayerNodes = [];
    }

    /**
     * 设置瓶子遮罩
     */
    private setupBottleMask(): void {
        // 遮罩在 setupDefaultNodes 中创建时为 RECT；若在编辑器中设为 SPRITE_STENCIL 并指定 1_2 等图，此处不覆盖类型以保留编辑器配置
        if (this.waterContainer) {
            const mask = this.waterContainer.getComponent(Mask);
            if (mask && mask.type === Mask.Type.ELLIPSE) {
                mask.segments = 64;
            }
        }
    }

    /**
     * 根据颜色ID获取颜色
     */
    private getColorById(colorId: number): Color {
        const config = BottleComponent.colorConfigs.find(c => c.colorId === colorId);
        return config ? config.color : new Color(255, 255, 255);
    }

    /**
     * 设置颜色配置（全局配置）
     */
    public static setColorConfigs(configs: ColorConfig[]): void {
        BottleComponent.colorConfigs = configs;
    }

    // ========== 状态管理 ==========

    /**
     * 设置瓶子状态
     */
    public setState(state: BottleStateEnum, animate: boolean = true): void {
        if (this._bottleState === state) {
            return;
        }

        const oldState = this._bottleState;
        this._bottleState = state;

        // 触发状态改变事件
        this.node.emit(BottleComponent.EVENT_STATE_CHANGE, {
            bottleIndex: this._bottleIndex,
            bottleId: this._bottleData?.id,
            oldState,
            newState: state
        });

        // 执行状态动画
        if (animate) {
            this.playStateAnimation(state);
        }
    }

    /**
     * 播放状态动画
     */
    private playStateAnimation(state: BottleStateEnum): void {
        // 清除当前动画
        tween(this.node).stop();

        switch (state) {
            case BottleStateEnum.SELECTED:
                this.playSelectAnimation();
                break;
            case BottleStateEnum.IDLE:
                this.playIdleAnimation();
                break;
            default:
                break;
        }
    }

    /**
     * 播放选中动画
     */
    public playSelectAnimation(): void {
        const targetPos = new Vec3(
            this._originalPosition.x,
            this._originalPosition.y + this.selectedOffset,
            this._originalPosition.z
        );

        tween(this.node)
            .to(0.2, { position: targetPos }, { easing: 'backOut' })
            .start();
    }

    /**
     * 播放空闲动画
     */
    public playIdleAnimation(): void {
        tween(this.node)
            .to(0.2, { position: this._originalPosition }, { easing: 'sineOut' })
            .start();
    }

    /**
     * 播放倾倒动画
     */
    public playPourAnimation(targetBottle: BottleComponent, onComplete?: () => void): void {
        if (!this._bottleData || this._bottleData.waters.length === 0) {
            if (onComplete) onComplete();
            return;
        }

        // 计算目标位置
        const targetWorldPos = new Vec3();
        targetBottle.node.getWorldPosition(targetWorldPos);

        const startPos = new Vec3();
        this.node.getWorldPosition(startPos);

        // 计算中间位置（上方弧线）
        const midPos = new Vec3(
            (startPos.x + targetWorldPos.x) / 2,
            Math.max(startPos.y, targetWorldPos.y) + 50,
            startPos.z
        );

        // 倾倒状态
        this.setState(BottleStateEnum.POURING, false);
        targetBottle.setState(BottleStateEnum.RECEIVING, false);

        // 触发倾倒开始事件
        this.node.emit(BottleComponent.EVENT_POUR_START, {
            from: this._bottleIndex,
            to: targetBottle.bottleIndex
        });

        // 执行动画
        tween(this.node)
            .to(this.pourDuration * 0.5, { worldPosition: midPos }, { easing: 'sineOut' })
            .to(this.pourDuration * 0.5, { worldPosition: targetWorldPos }, { easing: 'sineIn' })
            .call(() => {
                this.setState(BottleStateEnum.IDLE, false);
                targetBottle.setState(BottleStateEnum.IDLE, false);

                // 触发倾倒结束事件
                this.node.emit(BottleComponent.EVENT_POUR_END, {
                    from: this._bottleIndex,
                    to: targetBottle.bottleIndex
                });

                if (onComplete) onComplete();
            })
            .start();
    }

    // ========== 事件处理 ==========

    /**
     * 触摸开始处理
     */
    private onTouchStart(event: EventTouch): void {
        // 如果被禁用或正在倾倒，则忽略
        if (this._bottleState === BottleStateEnum.DISABLED ||
            this._bottleState === BottleStateEnum.POURING) {
            return;
        }

        // 触发点击事件
        const eventData: BottleClickEventData = {
            bottleIndex: this._bottleIndex,
            bottleId: this._bottleData?.id || ''
        };

        // 向父节点冒泡点击事件
        this.node.emit(BottleComponent.EVENT_BOTTLE_CLICK, eventData);

        console.log(`[BottleComponent] 瓶子 ${this._bottleIndex} 被点击`);
    }

    /**
     * 添加点击事件监听器
     */
    public onClick(callback: (data: BottleClickEventData) => void): void {
        this.node.on(BottleComponent.EVENT_BOTTLE_CLICK, callback);
    }

    /**
     * 移除点击事件监听器
     */
    public offClick(callback: (data: BottleClickEventData) => void): void {
        this.node.off(BottleComponent.EVENT_BOTTLE_CLICK, callback);
    }

    /**
     * 添加状态改变事件监听器
     */
    public onStateChange(callback: (data: any) => void): void {
        this.node.on(BottleComponent.EVENT_STATE_CHANGE, callback);
    }

    /**
     * 添加倾倒事件监听器
     */
    public onPourStart(callback: (data: any) => void): void {
        this.node.on(BottleComponent.EVENT_POUR_START, callback);
    }

    /**
     * 添加倾倒结束事件监听器
     */
    public onPourEnd(callback: (data: any) => void): void {
        this.node.on(BottleComponent.EVENT_POUR_END, callback);
    }

    // ========== 辅助方法 ==========

    /**
     * 获取瓶子在世界坐标系中的位置
     */
    public getWorldPosition(out: Vec3): Vec3 {
        return this.node.getWorldPosition(out);
    }

    /**
     * 设置瓶子位置
     */
    public setPosition(pos: Vec3): void {
        this._originalPosition.set(pos);
        this.node.setPosition(pos);
    }

    /**
     * 禁用/启用瓶子交互
     */
    public setEnabled(enabled: boolean): void {
        if (enabled) {
            this.setState(this._bottleState === BottleStateEnum.DISABLED ? BottleStateEnum.IDLE : this._bottleState);
        } else {
            this.setState(BottleStateEnum.DISABLED, false);
        }
    }

    /**
     * 获取当前水层数量
     */
    public getWaterCount(): number {
        return this._bottleData?.waters.length || 0;
    }

    /**
     * 获取瓶子容量
     */
    public getCapacity(): number {
        return this._bottleData?.capacity || 0;
    }

    /**
     * 是否为空瓶
     */
    public isEmpty(): boolean {
        return this.getWaterCount() === 0;
    }

    /**
     * 是否已满
     */
    public isFull(): boolean {
        return this.getWaterCount() >= this.getCapacity();
    }

    /**
     * 获取顶层水颜色
     */
    public getTopWaterColor(): number | null {
        const waters = this._bottleData?.waters;
        if (!waters || waters.length === 0) {
            return null;
        }
        return waters[waters.length - 1].colorId;
    }
}
