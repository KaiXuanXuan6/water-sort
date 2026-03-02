import { _decorator, Component, Sprite, Color, Vec3, Vec4, tween, Node, EventTouch, Mask, UITransform as UITransformType, Material, Graphics } from 'cc';
import { BottleState } from '../data/LevelConfig';
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
 * 3. WaterContainer 添加 Mask 组件（Type = SPRITE_STENCIL）
 * 4. 将对应节点拖拽到组件属性
 * 5. 保存为预制体（主水层由 water-sort-liquid Shader 渲染）
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

    /** 液体 Sprite（使用 water-sort-liquid 材质，用于倾斜+波纹渲染） */
    @property(Sprite)
    waterSprite: Sprite | null = null;

    /** 选中状态偏移量（Y轴） */
    @property({ tooltip: '选中时向上移动的距离' })
    selectedOffset: number = 30;

    /** 倾倒动画持续时间（秒） */
    @property({ tooltip: '倾倒动画时长' })
    pourDuration: number = 0.3;

    /** 水层区域：1_2 内腔 BOTTLE_INNER_*，1_1 瓶身 BOTTLE_BODY_* */
    private static readonly BOTTLE_INNER_WIDTH = 55;
    private static readonly BOTTLE_INNER_HEIGHT = 216;
    /** 瓶身尺寸（1_1 图 60×216，内腔 1_2 为 BOTTLE_INNER_*） */
    public static readonly BOTTLE_BODY_WIDTH = 60;
    public static readonly BOTTLE_BODY_HEIGHT = 216;

    // ========== 内部状态 ==========

    private _bottleIndex: number = -1;
    private _bottleState: BottleStateEnum = BottleStateEnum.IDLE;
    private _bottleData: BottleState | null = null;
    private _originalPosition: Vec3 = new Vec3();
    /** 倒水阶段 3 进度更新用 */
    private _pourPhase3StartTime: number = 0;
    private _pourPhase3Duration: number = 0;
    private _pourPhase3GrowDuration: number = 0;
    private _pourPhase3ShrinkDuration: number = 0;
    private _pourTarget: BottleComponent | null = null;
    private _pourColorId: number = 0;
    private _pourMovedCount: number = 0;
    private _pourTargetStartWaterCount: number = 0;
    private _pourTargetCapacity: number = 0;
    private _pourTargetFinalWaterCount: number = 0;

    /** 液体材质实例 */
    private _waterMaterial: Material | null = null;
    /** 上一帧瓶子角度，用于减少 setProperty 调用 */
    private _lastAngle: number = 0;
    /** 当前 waveType，与 tiltAngle 一起写入 tiltWave (vec4)，满足引擎 FLOAT4 */
    private _lastWaveType: number = 0;

    /** Shader 最大水层数，与 effect 中一致 */
    private static readonly LIQUID_MAX_LAYERS = 4;
    /** 液柱生长/回缩每格时长（秒） */
    private static readonly POUR_STREAM_UNIT_TIME = 0.05;
    /** 液柱宽度（像素） */
    private static readonly POUR_STREAM_WIDTH = 4;
    /** 液柱出液点向瓶口内缩像素（0 表示不内缩，直接贴角点） */
    private static readonly POUR_STREAM_OUTLET_INSET = 2;

    /** 倒水液柱节点（Graphics） */
    private _pourStreamNode: Node | null = null;
    private _pourStreamGraphics: Graphics | null = null;
    // 颜色配置（可在运行时修改）- 略深的水色，易区分
    private static colorConfigs: ColorConfig[] = [
        { colorId: 1, color: new Color(199, 64, 64) },    // 深珊瑚红
        { colorId: 2, color: new Color(56, 171, 102) },   // 深翠绿
        { colorId: 3, color: new Color(61, 160, 199) },   // 深天蓝
        { colorId: 4, color: new Color(199, 170, 53) },   // 深明黄
        { colorId: 5, color: new Color(133, 81, 199) },   // 深薰衣草紫
        { colorId: 6, color: new Color(199, 124, 52) },   // 深蜜橙
        { colorId: 7, color: new Color(60, 170, 170) },   // 深青绿
        { colorId: 8, color: new Color(199, 94, 154) },   // 深玫粉
        { colorId: 9, color: new Color(126, 137, 149) },   // 深雾灰
        { colorId: 10, color: new Color(195, 195, 197) },  // 深米白
        { colorId: 11, color: new Color(140, 101, 70) },  // 深暖棕
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
        // 原始位置在 playSelectAnimation 时按当前 node 位置捕获，避免早于布局导致错误

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

            // 设置默认尺寸（与 1_1 瓶身图一致）
            transform.setContentSize(BottleComponent.BOTTLE_BODY_WIDTH, BottleComponent.BOTTLE_BODY_HEIGHT);

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
            const mask = this.waterContainer.addComponent(Mask);
            mask.type = 3; // SPRITE_STENCIL，用同节点上的 Sprite 作为遮罩形状
            this.waterContainer.addComponent(Sprite); // 遮罩用 Sprite，spriteFrame 由 applyBottleType 设为 x_2
            this.node.addChild(this.waterContainer);
        }

        // 若已有 Mask 但非 SPRITE_STENCIL，不覆盖（保留预制体/编辑器配置）
        const mask = this.waterContainer.getComponent(Mask);
        if (mask && (mask.type as number) === 3 && !this.waterContainer.getComponent(Sprite)) {
            this.waterContainer.addComponent(Sprite);
        }
    }

    protected start(): void {
    }

    protected update(_dt: number): void {
        if (this._waterMaterial && this.node.angle !== this._lastAngle) {
            this._lastAngle = this.node.angle;
            this._waterMaterial.setProperty('tiltWave', new Vec4(this.node.angle, this._lastWaveType, 0, 0));
        }
    }

    protected onDestroy(): void {
        // 移除事件监听
        this.node.off(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.clearPourStream();
    }

    // ========== 初始化方法 ==========

    /**
     * 初始化瓶子
     */
    public init(index: number, data: BottleState): void {
        this._bottleIndex = index;
        this._bottleData = data;

        // 使用 liquid 材质时先隐藏，避免在 syncWaterToShader 前被绘制导致 UBO 未绑定
        if (this.waterSprite?.customMaterial) {
            this.waterSprite.node.active = false;
        }

        // 先加载瓶子图与 waterContainer 的 x_2 遮罩图，再渲染水层（保证 SPRITE_STENCIL 生效）
        this.applyBottleType().then(() => {
            if (this._bottleData) this.renderWaterLayers();
        });

        console.log(`[BottleComponent] 初始化瓶子 ${index}:`, data);
    }

    /**
     * 根据 data.bottleType 加载并设置瓶子 Sprite 与 WaterContainer 遮罩图（SPRITE_STENCIL 用 x_2）
     * 返回 Promise，在 x_2 设置完成后再渲染水层，保证遮罩生效
     */
    private applyBottleType(): Promise<void> {
        const typeId = this._bottleData?.bottleType;
        if (typeId == null || !this.bottleSprite) return Promise.resolve();

        const loadBottle = AssetLoader.loadBottleSprite(typeId, 1).then((frame) => {
            if (frame && this.bottleSprite) this.bottleSprite.spriteFrame = frame;
        });

        if (!this.waterContainer) return loadBottle;
        const mask = this.waterContainer.getComponent(Mask);
        if (!mask || (mask.type as number) !== 3) return loadBottle; // 3 = SPRITE_STENCIL
        const stencilSprite = this.waterContainer.getComponent(Sprite);
        if (!stencilSprite) return loadBottle;

        return AssetLoader.loadBottleSprite(typeId, 2).then((frame) => {
            if (frame && stencilSprite.isValid) {
                stencilSprite.spriteFrame = frame;
                const transform = this.waterContainer!.getComponent(UITransformType);
                if (transform) {
                    transform.setContentSize(BottleComponent.BOTTLE_INNER_WIDTH, BottleComponent.BOTTLE_INNER_HEIGHT);
                }
            }
        });
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
     * 确保拿到液体材质实例后再执行回调。
     * 因引擎对 MaterialInstance 懒创建，若本次取不到会延帧重试，上限 MAX_RETRY 次。
     */
    private ensureWaterMaterial(callback: (mat: Material | null) => void, retryCount: number = 0): void {
        const MAX_RETRY = 5;
        if (this._waterMaterial) {
            callback(this._waterMaterial);
            return;
        }
        if (!this.waterSprite?.customMaterial) {
            callback(null);
            return;
        }
        const wasActive = this.waterSprite.node.active;
        this.waterSprite.node.active = true;
        const mat = this.waterSprite.getMaterialInstance(0) || null;
        if (mat) {
            this._waterMaterial = mat;
            callback(mat);
            return;
        }
        if (!wasActive) this.waterSprite.node.active = false;
        if (retryCount >= MAX_RETRY) {
            callback(null);
            return;
        }
        this.scheduleOnce(() => this.ensureWaterMaterial(callback, retryCount + 1), 0);
    }

    /**
     * 渲染水层（同步到 water-sort-liquid Shader，需已绑定 waterSprite）
     */
    public renderWaterLayers(): void {
        if (!this._bottleData || !this.waterContainer) return;
        const waters = this._bottleData.waters;
        const capacity = this._bottleData.capacity;
        const transform = this.waterContainer.getComponent(UITransformType);
        if (!transform) return;

        const cw = BottleComponent.BOTTLE_INNER_WIDTH;
        const ch = BottleComponent.BOTTLE_INNER_HEIGHT;
        transform.setContentSize(cw, ch);
        if (!this.waterSprite) return;

        this.ensureWaterMaterial((mat) => {
            if (!mat) return;
            this.syncWaterToShader(waters, capacity);
            this._lastWaveType = 0;
            mat.setProperty('tiltWave', new Vec4(this.node.angle, 0, 0, 0));
            this.waterSprite!.node.active = waters.length > 0;
            console.log(`[BottleComponent] 渲染水层: ${waters.length} 层`);
        });
    }

    /**
     * 将水层数据同步到液体 Shader（color0~3、height0~3、resolution）。
     * @param layers 当前水层列表
     * @param capacity 瓶子容量，用于计算每层归一化高度
     * @param incoming 可选：正在倒入的一层，高度为归一化值（0~1），用于目标瓶液面上涨+波纹
     */
    private syncWaterToShader(
        layers: { colorId: number }[],
        capacity: number,
        incoming?: { colorId: number; heightRatio: number },
        outgoingDrainHeightRatio: number = 0
    ): void {
        const mat = this._waterMaterial;
        if (!mat || capacity <= 0) return;

        const cw = BottleComponent.BOTTLE_INNER_WIDTH;
        const ch = BottleComponent.BOTTLE_INNER_HEIGHT;
        mat.setProperty('resolution', new Vec4(cw, ch, 0, 0));
        this.syncUvRangeToShader(mat);

        const layerHeight = 1 / capacity;
        const effectiveHeights: number[] = new Array(BottleComponent.LIQUID_MAX_LAYERS).fill(0);
        for (let i = 0; i < BottleComponent.LIQUID_MAX_LAYERS && i < layers.length; i++) {
            effectiveHeights[i] = layerHeight;
        }
        if (outgoingDrainHeightRatio > 0 && layers.length > 0) {
            let remain = Math.min(outgoingDrainHeightRatio, layers.length * layerHeight);
            for (let i = Math.min(layers.length, BottleComponent.LIQUID_MAX_LAYERS) - 1; i >= 0; i--) {
                const take = Math.min(effectiveHeights[i], remain);
                effectiveHeights[i] -= take;
                remain -= take;
                if (remain <= 1e-6) break;
            }
        }
        for (let i = 0; i < BottleComponent.LIQUID_MAX_LAYERS; i++) {
            let colorValue = new Vec4(0, 0, 0, 0);
            let heightValue = new Vec4(0, 0, 0, 0);
            if (i < layers.length) {
                const c = this.getColorById(layers[i].colorId);
                colorValue = new Vec4(c.r / 255, c.g / 255, c.b / 255, 1);
                heightValue = new Vec4(Math.max(0, effectiveHeights[i]), 0, 0, 0);
            } else if (incoming && i === layers.length) {
                const c = this.getColorById(incoming.colorId);
                colorValue = new Vec4(c.r / 255, c.g / 255, c.b / 255, 1);
                heightValue = new Vec4(incoming.heightRatio, 0, 0, 0);
            }
            mat.setProperty(`color${i}`, colorValue);
            mat.setProperty(`height${i}`, heightValue);
        }
    }

    /**
     * 同步当前 WaterSprite 的 UV 范围到 Shader，兼容图集/trim 导致的非 0~1 UV。
     */
    private syncUvRangeToShader(mat: Material): void {
        const frame = this.waterSprite?.spriteFrame as unknown as { uv?: number[] } | null;
        const uv = frame?.uv;
        if (!uv || uv.length < 8) {
            mat.setProperty('uvRange', new Vec4(0, 1, 0, 1));
            return;
        }
        let minX = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY;
        let minY = Number.POSITIVE_INFINITY;
        let maxY = Number.NEGATIVE_INFINITY;
        for (let i = 0; i + 1 < uv.length; i += 2) {
            const x = uv[i];
            const y = uv[i + 1];
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        }
        if (!Number.isFinite(minX) || !Number.isFinite(maxX) || !Number.isFinite(minY) || !Number.isFinite(maxY)) {
            mat.setProperty('uvRange', new Vec4(0, 1, 0, 1));
            return;
        }
        mat.setProperty('uvRange', new Vec4(minY, maxY, minX, maxX));
    }

    /**
     * 设置瓶子遮罩
     */
    private setupBottleMask(): void {
        // 遮罩在 setupDefaultNodes 中创建时为 RECT；若在编辑器中设为 SPRITE_STENCIL 并指定 1_2 等图，此处不覆盖类型以保留编辑器配置
        if (this.waterContainer) {
            const mask = this.waterContainer.getComponent(Mask);
            if (mask && (mask.type as number) === 1) {
                // 1 = ELLIPSE (deprecated 名为 GRAPHICS_ELLIPSE)，设置分段数
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
     * 播放选中动画（在即将上移时捕获当前静止位置，避免依赖 onLoad/布局顺序）
     */
    public playSelectAnimation(): void {
        this._originalPosition.set(this.node.position);
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
            .to(0.2, { position: this._originalPosition.clone() }, { easing: 'sineOut' })
            .start();
    }

    /**
     * 播放倾倒动画（位移 → 旋转对准 → 目标液面上涨 → 起始瓶回位）
     */
    public playPourAnimation(
        targetBottle: BottleComponent,
        movedCount: number,
        colorId: number,
        unitPourTime: number,
        motionTime: number,
        onComplete?: () => void
    ): void {
        if (!this._bottleData || this._bottleData.waters.length === 0) {
            if (onComplete) onComplete();
            return;
        }

        tween(this.node).stop();

        // 不在此处覆盖 _originalPosition，保留选中时或 layoutBottles 设置的布局原位
        this.setState(BottleStateEnum.POURING, false);
        targetBottle.setState(BottleStateEnum.RECEIVING, false);

        this.node.emit(BottleComponent.EVENT_POUR_START, {
            from: this._bottleIndex,
            to: targetBottle.bottleIndex
        });

        // motionTime 仅控制位移/旋转/回位；unitPourTime 仅控制单格液体倒出/上涨时长。
        // Phase 1: 源瓶移动到目标瓶上方（对位阶段）
        const t1 = motionTime * (0.2 / 0.6);
        // Phase 2: 源瓶旋转到倾倒角度（液面倾斜开始变明显）
        const t2 = motionTime * (0.25 / 0.6);
        // Phase 3a: 液体实际倒出/倒入时长（单格时长 * 倒出格数）
        const t3 = unitPourTime * Math.max(1, movedCount);
        // Phase 4: 源瓶回正并回到原位
        const t4 = motionTime * (0.15 / 0.6);

        const parent = this.node.parent;
        const sourceMouthWorld = new Vec3();
        const targetMouthWorld = new Vec3();
        this.getMouthWorldPosition(sourceMouthWorld);
        targetBottle.getMouthWorldPosition(targetMouthWorld);
        const sourceMouthLocal = new Vec3();
        const targetMouthLocal = new Vec3();
        let pourAngle = 58;
        if (parent) {
            const parentUT = parent.getComponent(UITransformType);
            if (parentUT) {
                parentUT.convertToNodeSpaceAR(sourceMouthWorld, sourceMouthLocal);
                parentUT.convertToNodeSpaceAR(targetMouthWorld, targetMouthLocal);
                const dx = targetMouthLocal.x - sourceMouthLocal.x;
                const dy = targetMouthLocal.y - sourceMouthLocal.y;
                pourAngle = -Math.atan2(dx, dy) * (180 / Math.PI);
                const sign = pourAngle >= 0 ? 1 : -1;
                // 统一固定倾倒角：按方向使用 ±85 度。
                pourAngle = sign * 85;
            }
        }
        const H = BottleComponent.BOTTLE_BODY_HEIGHT / 2;
        const rad = pourAngle * (Math.PI / 180);
        const offsetX = -H * Math.sin(rad);
        const offsetY = H * Math.cos(rad);
        /** 源瓶上抬量，避免与目标瓶重合 */
        const pourRaiseY = BottleComponent.BOTTLE_BODY_HEIGHT * 0.2;
        const targetPos = new Vec3(
            targetMouthLocal.x - offsetX,
            targetMouthLocal.y - offsetY + pourRaiseY,
            targetMouthLocal.z
        );

        const cleanup = (): void => {
            this.unschedule(this._updatePourProgress);
            this.clearPourStream();
            targetBottle.setState(BottleStateEnum.IDLE, false);
            this.node.emit(BottleComponent.EVENT_POUR_END, {
                from: this._bottleIndex,
                to: targetBottle.bottleIndex
            });
            if (onComplete) onComplete();
        };

        this._pourTargetStartWaterCount = targetBottle.getWaterCount();
        this._pourTargetCapacity = Math.max(1, targetBottle.getCapacity() || 4);
        this._pourTargetFinalWaterCount = Math.min(
            this._pourTargetCapacity,
            this._pourTargetStartWaterCount + movedCount
        );
        const growUnits = Math.max(0, this._pourTargetCapacity - this._pourTargetStartWaterCount);
        const shrinkUnits = Math.max(0, this._pourTargetCapacity - this._pourTargetFinalWaterCount);
        this._pourPhase3GrowDuration = growUnits * BottleComponent.POUR_STREAM_UNIT_TIME;
        this._pourPhase3ShrinkDuration = shrinkUnits * BottleComponent.POUR_STREAM_UNIT_TIME;
        const t3Total = this._pourPhase3GrowDuration + t3 + this._pourPhase3ShrinkDuration;

        const startPhase3 = (): void => {
            this._pourTarget = targetBottle;
            this._pourColorId = colorId;
            this._pourMovedCount = movedCount;
            this._pourPhase3StartTime = Date.now() / 1000;
            this._pourPhase3Duration = t3Total;
            if (parent) {
                this.ensurePourStream(parent);
            }
            this.schedule(this._updatePourProgress, 0.02);
        };

        tween(this.node)
            .to(t1, { position: targetPos }, { easing: 'sineOut' })
            .to(t2, { angle: pourAngle }, { easing: 'sineInOut' })
            .call(startPhase3)
            .delay(t3Total)
            .call(() => {
                this.unschedule(this._updatePourProgress);
                this.setOutgoingPour(1, this._pourMovedCount, 0);
                this.clearPourStream();
            })
            .to(t4, { position: this._originalPosition.clone(), angle: 0 }, { easing: 'sineOut' })
            .call(cleanup)
            .start();
    }

    private _updatePourProgress(): void {
        const now = Date.now() / 1000;
        const elapsed = Math.max(0, now - this._pourPhase3StartTime);

        const target = this._pourTarget;
        if (!target || !target.isValid) {
            return;
        }

        const grow = this._pourPhase3GrowDuration;
        const shrink = this._pourPhase3ShrinkDuration;
        const pour = Math.max(1e-6, this._pourPhase3Duration - grow - shrink);
        const parent = this.node.parent;
        const parentUT = parent?.getComponent(UITransformType) || null;

        const sourceMouthWorld = new Vec3();
        this.getMouthWorldPosition(sourceMouthWorld);
        const sourceMouthLocal = parentUT ? parentUT.convertToNodeSpaceAR(sourceMouthWorld) : new Vec3();
        const sourceStreamOutletLocal = parentUT
            ? this.getPourOutletInParent(parentUT)
            : sourceMouthLocal;
        const startFillRatio = this._pourTargetStartWaterCount / this._pourTargetCapacity;
        const finalFillRatio = this._pourTargetFinalWaterCount / this._pourTargetCapacity;
        const pourProgress = Math.min(1, Math.max(0, (elapsed - grow) / pour));

        if (elapsed < grow) {
            target.setIncomingPour(0, this._pourColorId, this._pourMovedCount);
            this.setOutgoingPour(0, this._pourMovedCount, 0);
            if (parentUT) {
                const growRatio = grow <= 1e-6 ? 1 : Math.min(1, elapsed / grow);
                const startSurface = this.getTargetSurfaceInParent(parentUT, startFillRatio);
                const streamEnd = new Vec3(
                    sourceStreamOutletLocal.x + (startSurface.x - sourceStreamOutletLocal.x) * growRatio,
                    sourceStreamOutletLocal.y + (startSurface.y - sourceStreamOutletLocal.y) * growRatio,
                    0
                );
                this.drawPourStream(sourceStreamOutletLocal, streamEnd, this._pourColorId);
            }
            return;
        }

        if (elapsed < grow + pour) {
            const pourRatio = pourProgress;
            target.setIncomingPour(pourRatio, this._pourColorId, this._pourMovedCount);
            this.setOutgoingPour(pourRatio, this._pourMovedCount, 2);
            if (parentUT) {
                const dynamicFillRatio = startFillRatio + (finalFillRatio - startFillRatio) * pourRatio;
                const dynamicSurface = this.getTargetSurfaceInParent(parentUT, dynamicFillRatio);
                this.drawPourStream(sourceStreamOutletLocal, dynamicSurface, this._pourColorId);
            }
            return;
        }

        target.setIncomingPour(1, this._pourColorId, this._pourMovedCount);
        this.setOutgoingPour(1, this._pourMovedCount, 0);
        if (!parentUT) return;

        const finalSurface = this.getTargetSurfaceInParent(parentUT, finalFillRatio);
        if (shrink <= 1e-6) {
            this.clearPourStream();
            return;
        }

        const shrinkRatio = Math.min(1, Math.max(0, (elapsed - grow - pour) / shrink));
        const streamTop = new Vec3(
            sourceStreamOutletLocal.x + (finalSurface.x - sourceStreamOutletLocal.x) * shrinkRatio,
            sourceStreamOutletLocal.y + (finalSurface.y - sourceStreamOutletLocal.y) * shrinkRatio,
            0
        );
        this.drawPourStream(streamTop, finalSurface, this._pourColorId);
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
     * 获取瓶口在世界坐标系中的位置（瓶顶中心）
     */
    public getMouthWorldPosition(out: Vec3): Vec3 {
        const ut = this.node.getComponent(UITransformType);
        if (!ut) {
            return this.node.getWorldPosition(out);
        }
        const localMouth = new Vec3(0, BottleComponent.BOTTLE_BODY_HEIGHT / 2, 0);
        Vec3.copy(out, ut.convertToWorldSpaceAR(localMouth));
        return out;
    }

    /**
     * 设置临时注入层（倒水动画中目标瓶液面上涨），ratio 0 表示清除
     */
    public setIncomingPour(ratio: number, colorId: number, pourLayerCount: number): void {
        if (!this.waterContainer || pourLayerCount <= 0) {
            this.clearPourVisualState();
            return;
        }
        const capacity = this.getCapacity() || 4;
        if (ratio <= 0) {
            this.clearPourVisualState();
            return;
        }

        if (this.waterSprite?.customMaterial) {
            // 目标瓶为空时 node 可能处于 inactive，先激活以确保可拿到 MaterialInstance。
            this.waterSprite.node.active = true;
            if (!this._waterMaterial) {
                this._waterMaterial = this.waterSprite.getMaterialInstance(0) || null;
                if (!this._waterMaterial) {
                    this.ensureWaterMaterial(() => { /* 下一帧继续由 setIncomingPour 驱动 */ });
                    return;
                }
            }
        }
        if (this._waterMaterial) {
            this._lastWaveType = 1;
            this._waterMaterial.setProperty('tiltWave', new Vec4(this.node.angle, 1, 0, 0));
            const waters = this._bottleData?.waters ?? [];
            const incomingHeightRatio = (ratio * pourLayerCount) / capacity;
            this.syncWaterToShader(waters, capacity, { colorId, heightRatio: incomingHeightRatio });
        }
    }

    /**
     * 设置源瓶临时倒出预览（倒水动画中源瓶液面下降），ratio 0 表示清除
     */
    private setOutgoingPour(ratio: number, pourLayerCount: number, waveType: number): void {
        if (!this.waterContainer || pourLayerCount <= 0) {
            this.clearPourVisualState();
            return;
        }
        const capacity = this.getCapacity() || 4;
        if (ratio <= 0) {
            this.clearPourVisualState();
            return;
        }

        if (this.waterSprite?.customMaterial) {
            this.waterSprite.node.active = true;
            if (!this._waterMaterial) {
                this._waterMaterial = this.waterSprite.getMaterialInstance(0) || null;
                if (!this._waterMaterial) {
                    this.ensureWaterMaterial(() => { /* 下一帧继续由 setOutgoingPour 驱动 */ });
                    return;
                }
            }
        }

        if (this._waterMaterial) {
            this._lastWaveType = waveType;
            this._waterMaterial.setProperty('tiltWave', new Vec4(this.node.angle, waveType, 0, 0));
            const waters = this._bottleData?.waters ?? [];
            const outgoingDrainHeightRatio = (ratio * pourLayerCount) / capacity;
            this.syncWaterToShader(waters, capacity, undefined, outgoingDrainHeightRatio);
        }
    }

    private clearPourVisualState(): void {
        if (this._waterMaterial) {
            this._lastWaveType = 0;
            this._waterMaterial.setProperty('tiltWave', new Vec4(this.node.angle, 0, 0, 0));
        }
        if (this.waterSprite && (this._bottleData?.waters.length ?? 0) <= 0) {
            this.waterSprite.node.active = false;
        }
    }

    private ensurePourStream(parent: Node): void {
        if (this._pourStreamGraphics && this._pourStreamNode?.isValid) {
            return;
        }
        const streamNode = new Node(`PourStream_${this._bottleIndex}`);
        parent.addChild(streamNode);
        const targetIndex = this._pourTarget?.node?.getSiblingIndex() ?? this.node.getSiblingIndex();
        const streamIndex = Math.max(0, Math.min(this.node.getSiblingIndex(), targetIndex) - 1);
        streamNode.setSiblingIndex(streamIndex);
        this._pourStreamNode = streamNode;
        this._pourStreamGraphics = streamNode.addComponent(Graphics);
    }

    private clearPourStream(): void {
        if (this._pourStreamGraphics) {
            this._pourStreamGraphics.clear();
        }
        if (this._pourStreamNode && this._pourStreamNode.isValid) {
            this._pourStreamNode.destroy();
        }
        this._pourStreamNode = null;
        this._pourStreamGraphics = null;
    }

    private drawPourStream(top: Vec3, bottom: Vec3, colorId: number): void {
        const g = this._pourStreamGraphics;
        if (!g) return;
        const dx = bottom.x - top.x;
        const dy = bottom.y - top.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len < 1e-3) {
            g.clear();
            return;
        }
        const nx = dx / len;
        const ny = dy / len;
        const hw = BottleComponent.POUR_STREAM_WIDTH * 0.5;
        const px = -ny * hw;
        const py = nx * hw;
        const p1x = top.x + px;
        const p1y = top.y + py;
        const p2x = top.x - px;
        const p2y = top.y - py;
        const p3x = bottom.x - px;
        const p3y = bottom.y - py;
        const p4x = bottom.x + px;
        const p4y = bottom.y + py;
        const c = this.getColorById(colorId);
        g.clear();
        g.fillColor = c;
        g.moveTo(p1x, p1y);
        g.lineTo(p2x, p2y);
        g.lineTo(p3x, p3y);
        g.lineTo(p4x, p4y);
        g.close();
        g.fill();
    }

    private getTargetSurfaceInParent(parentUT: UITransformType, fillRatio: number): Vec3 {
        const target = this._pourTarget;
        if (!target) return new Vec3();
        const ut = target.node.getComponent(UITransformType);
        if (!ut) {
            const fallback = new Vec3();
            target.getMouthWorldPosition(fallback);
            return parentUT.convertToNodeSpaceAR(fallback);
        }
        const clampedFill = Math.max(0, Math.min(1, fillRatio));
        const localSurface = new Vec3(0, -BottleComponent.BOTTLE_BODY_HEIGHT * 0.5 + BottleComponent.BOTTLE_BODY_HEIGHT * clampedFill, 0);
        const world = ut.convertToWorldSpaceAR(localSurface);
        return parentUT.convertToNodeSpaceAR(world);
    }

    /**
     * 获取液柱出液点（倾倒侧瓶口角点，向内缩一点避免穿帮）
     */
    private getPourOutletInParent(parentUT: UITransformType): Vec3 {
        const selfUT = this.node.getComponent(UITransformType);
        if (!selfUT) {
            const fallback = new Vec3();
            this.getMouthWorldPosition(fallback);
            return parentUT.convertToNodeSpaceAR(fallback);
        }
        const sign = this.node.angle >= 0 ? -1 : 1;
        const localOutlet = new Vec3(
            sign * (BottleComponent.BOTTLE_BODY_WIDTH * 0.5 - BottleComponent.POUR_STREAM_OUTLET_INSET),
            BottleComponent.BOTTLE_BODY_HEIGHT * 0.5 - BottleComponent.POUR_STREAM_OUTLET_INSET,
            0
        );
        const worldOutlet = selfUT.convertToWorldSpaceAR(localOutlet);
        return parentUT.convertToNodeSpaceAR(worldOutlet);
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
