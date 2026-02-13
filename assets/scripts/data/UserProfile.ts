/**
 * 用户档案（占位实现）
 * 当前关卡进度、已解锁关卡、道具数量等；后续可接本地存储
 */

export interface UserProfileData {
    /** 当前玩到的最大关卡序号（1-based） */
    currentLevel: number;
    /** 已解锁的最大关卡序号 */
    unlockedLevel: number;
    /** 各关卡星数 1～3，key 为 levelId */
    levelStars: Record<string, number>;
    /** 撤销道具剩余次数，-1 表示无限 */
    undoCount: number;
    /** 加管道具剩余次数 */
    addTubeCount: number;
}

const DEFAULT_PROFILE: UserProfileData = {
    currentLevel: 1,
    unlockedLevel: 10,
    levelStars: {},
    undoCount: -1,
    addTubeCount: 0
};

let _profile: UserProfileData = { ...DEFAULT_PROFILE };

export function getUserProfile(): UserProfileData {
    return _profile;
}

export function setUserProfile(data: Partial<UserProfileData>): void {
    _profile = { ..._profile, ...data };
}

export function getUnlockedLevel(): number {
    return _profile.unlockedLevel;
}

export function setUnlockedLevel(level: number): void {
    _profile.unlockedLevel = Math.max(_profile.unlockedLevel, level);
}

export function getLevelStars(levelId: string): number {
    return _profile.levelStars[levelId] ?? 0;
}

export function setLevelStars(levelId: string, stars: number): void {
    _profile.levelStars[levelId] = Math.min(3, Math.max(0, stars));
}

/** 占位：从本地存储读取（未实现则返回当前内存值） */
export function loadFromStorage(): UserProfileData {
    // TODO: sys.localStorage 或 Cocos 持久化
    return _profile;
}

/** 占位：写入本地存储（未实现则 no-op） */
export function saveToStorage(): void {
    // TODO: 持久化 _profile
}
