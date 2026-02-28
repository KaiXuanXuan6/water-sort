/**
 * 结算弹窗 payload
 * GameSceneController 与 ResultPopupController 共用，避免两处各自定义
 */
export interface ResultPayload {
    /** 是否胜利 */
    success: boolean;
    /** 关卡ID */
    levelId: string;
    /** 移动次数 */
    moveCount?: number;
    /** 最少步数（可选） */
    minMoves?: number;
    /** 获得星数（可选） */
    stars?: number;
    /** 本局胜利是否导致进度条刚好攒满（用于展示 Reward 弹窗） */
    progressBarJustFilled?: boolean;
}
