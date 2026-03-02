import { Node, SpriteFrame, Sprite, UITransform, Mask } from 'cc';
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
    /** 瓶子图片资源 */
    spriteFrame?: SpriteFrame;
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
        if (!spriteFrame && config.data.bottleType) {
            spriteFrame = await AssetLoader.loadBottleSprite(config.data.bottleType, 1);
        }

        // 创建瓶子 Sprite
        const spriteNode = new Node('BottleSprite');
        const sprite = spriteNode.addComponent(Sprite);
        const transform = spriteNode.addComponent(UITransform);
        transform.setContentSize(BottleComponent.BOTTLE_BODY_WIDTH, BottleComponent.BOTTLE_BODY_HEIGHT);

        if (spriteFrame) {
            sprite.spriteFrame = spriteFrame;
        }

        bottleNode.addChild(spriteNode);

        // 创建水层容器（与 BottleComponent 内腔尺寸保持一致）
        const waterContainer = new Node('WaterContainer');
        const waterTransform = waterContainer.addComponent(UITransform);
        waterTransform.setContentSize(BottleComponent.BOTTLE_INNER_WIDTH, BottleComponent.BOTTLE_BODY_HEIGHT);
        const mask = waterContainer.addComponent(Mask);
        mask.type = 3; // SPRITE_STENCIL
        waterContainer.addComponent(Sprite);
        bottleNode.addChild(waterContainer);

        bottleComp.setRuntimeRefs(sprite, waterContainer);
        bottleComp.init(config.index, config.data);

        if (config.position) {
            bottleNode.setPosition(config.position.x, config.position.y, 0);
        }

        return bottleNode;
    }
}
