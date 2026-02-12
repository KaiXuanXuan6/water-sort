import { Node, Prefab, SpriteFrame, instantiate, Sprite, UITransform } from 'cc';
import { BottleState } from '../data/LevelConfig';
import { BottleComponent } from '../ui/BottleComponent';
import { AssetLoader } from './AssetLoader';

/**
 * 瓶子创建配置
 */
export interface BottleCreateConfig {
    /** 瓶子索引 */
    index: number;
    /** 瓶子数据 */
    data: BottleState;
    /** 瓶子图片资源（可选，不提供则自动加载） */
    spriteFrame?: SpriteFrame;
    /** 选中状态图片（可选） */
    selectedSpriteFrame?: SpriteFrame;
    /** 瓶子位置 */
    position?: { x: number; y: number };
    /** 水层颜色映射表 */
    colorSpriteFrames?: Map<number, SpriteFrame>;
}

/**
 * 瓶子创建器
 * 提供便捷方法在编辑器外创建和配置瓶子
 */
export class BottleCreator {
    /**
     * 创建单个瓶子节点（自动加载图片）
     */
    public static async createBottle(config: BottleCreateConfig): Promise<Node> {
        const bottleNode = new Node(`Bottle_${config.index}`);
        const bottleComp = bottleNode.addComponent(BottleComponent);

        // 自动加载瓶子图片（如果没有提供）
        let spriteFrame = config.spriteFrame;
        let selectedSpriteFrame = config.selectedSpriteFrame || null;

        if (!spriteFrame && config.data.bottleType) {
            const [normal, selected] = await Promise.all([
                AssetLoader.loadBottleSprite(config.data.bottleType, 1),
                AssetLoader.loadBottleSprite(config.data.bottleType, 2)
            ]);
            spriteFrame = normal;
            selectedSpriteFrame = selected;
        }

        // 创建瓶子 Sprite
        const spriteNode = new Node('BottleSprite');
        const sprite = spriteNode.addComponent(Sprite);
        const transform = spriteNode.addComponent(UITransform);
        transform.setContentSize(80, 120);

        if (spriteFrame) {
            sprite.spriteFrame = spriteFrame;
        }

        bottleNode.addChild(spriteNode);

        // 创建水层容器
        const waterContainer = new Node('WaterContainer');
        const waterTransform = waterContainer.addComponent(UITransform);
        waterTransform.setContentSize(72, 100);
        bottleNode.addChild(waterContainer);

        // 配置 BottleComponent
        bottleComp.init(config.index, config.data);
        (bottleComp as any)['bottleSprite'] = sprite;
        (bottleComp as any)['waterContainer'] = waterContainer;
        (bottleComp as any)['bottleSpriteFrame'] = spriteFrame || null;
        (bottleComp as any)['selectedSpriteFrame'] = selectedSpriteFrame || null;
        (bottleComp as any)['_originalSpriteFrame'] = spriteFrame || null;
        (bottleComp as any)['_bottleSpriteFrameLoaded'] = spriteFrame || null;
        (bottleComp as any)['_selectedSpriteFrameLoaded'] = selectedSpriteFrame || null;

        // 设置位置
        if (config.position) {
            bottleNode.setPosition(config.position.x, config.position.y, 0);
        }

        return bottleNode;
    }

    /**
     * 从预制体创建瓶子
     */
    public static createFromPrefab(
        prefab: Prefab,
        index: number,
        data: BottleState,
        position?: { x: number; y: number }
    ): Node {
        const bottleNode = instantiate(prefab);
        const bottleComp = bottleNode.getComponent(BottleComponent);

        if (bottleComp) {
            bottleComp.init(index, data);

            if (position) {
                bottleNode.setPosition(position.x, position.y, 0);
            }
        }

        return bottleNode;
    }

    /**
     * 批量创建瓶子（异步）
     */
    public static async createBottles(
        configs: BottleCreateConfig[],
        container: Node
    ): Promise<Node[]> {
        const bottles: Node[] = [];

        for (const config of configs) {
            const bottleNode = await this.createBottle(config);
            container.addChild(bottleNode);
            bottles.push(bottleNode);
        }

        return bottles;
    }

    /**
     * 批量创建瓶子（同步，使用预制体）
     */
    public static createBottlesSync(
        configs: BottleCreateConfig[],
        container: Node
    ): Node[] {
        const bottles: Node[] = [];

        for (const config of configs) {
            // 同步版本需要手动提供 SpriteFrame
            if (!config.spriteFrame) {
                console.warn('[BottleCreator] 同步创建需要提供 spriteFrame');
                continue;
            }

            const bottleNode = new Node(`Bottle_${config.index}`);
            const bottleComp = bottleNode.addComponent(BottleComponent);

            // 创建瓶子 Sprite
            const spriteNode = new Node('BottleSprite');
            const sprite = spriteNode.addComponent(Sprite);
            const transform = spriteNode.addComponent(UITransform);
            transform.setContentSize(80, 120);
            sprite.spriteFrame = config.spriteFrame;
            bottleNode.addChild(spriteNode);

            // 创建水层容器
            const waterContainer = new Node('WaterContainer');
            const waterTransform = waterContainer.addComponent(UITransform);
            waterTransform.setContentSize(72, 100);
            bottleNode.addChild(waterContainer);

            // 配置 BottleComponent
            bottleComp.init(config.index, config.data);
            (bottleComp as any)['bottleSprite'] = sprite;
            (bottleComp as any)['waterContainer'] = waterContainer;
            (bottleComp as any)['bottleSpriteFrame'] = config.spriteFrame;
            (bottleComp as any)['selectedSpriteFrame'] = config.selectedSpriteFrame || null;
            (bottleComp as any)['_originalSpriteFrame'] = config.spriteFrame;

            // 设置位置
            if (config.position) {
                bottleNode.setPosition(config.position.x, config.position.y, 0);
            }

            container.addChild(bottleNode);
            bottles.push(bottleNode);
        }

        return bottles;
    }

    /**
     * 计算瓶子排列位置（水平居中排列）
     */
    public static calculateBottlePositions(
        bottleCount: number,
        startX: number = 0,
        spacing: number = 90
    ): { x: number; y: number }[] {
        const positions: { x: number; y: number }[] = [];
        const totalWidth = (bottleCount - 1) * spacing;
        const offsetX = -totalWidth / 2;

        for (let i = 0; i < bottleCount; i++) {
            positions.push({
                x: startX + offsetX + i * spacing,
                y: 0
            });
        }

        return positions;
    }

    /**
     * 预加载多个瓶子类型的图片
     */
    public static async preloadBottleTypes(types: number[]): Promise<void> {
        const promises = types.map(type => AssetLoader.preloadBottle(type));
        await Promise.all(promises);
        console.log(`[BottleCreator] 预加载完成: ${types.length} 个瓶子类型`);
    }
}
