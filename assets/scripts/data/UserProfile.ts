import { sys } from 'cc';

/**
 * 用户档案
 * 当前关卡进度、已解锁关卡、道具数量等；持久化到 localStorage
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
    /** 当前进度条已通关数（本段内） */
    progressBarCleared: number;
    /** 攒满本次进度条需要的通关数 */
    progressBarTarget: number;
}

const STORAGE_KEY = 'water_sort_user_profile';

const DEFAULT_PROFILE: UserProfileData = {
    currentLevel: 1,
    unlockedLevel: 1,
    levelStars: {},
    undoCount: 3,
    addTubeCount: 1,
    progressBarCleared: 0,
    progressBarTarget: 8
};

let _profile: UserProfileData = { ...DEFAULT_PROFILE };

export function getUnlockedLevel(): number {
    return _profile.unlockedLevel;
}

export function setUnlockedLevel(level: number): void {
    _profile.unlockedLevel = Math.max(_profile.unlockedLevel, level);
}

export function setLevelStars(levelId: string, stars: number): void {
    _profile.levelStars[levelId] = Math.min(3, Math.max(0, stars));
}

export function getProgressBarCleared(): number {
    return _profile.progressBarCleared;
}

export function getProgressBarTarget(): number {
    return _profile.progressBarTarget;
}

/** 胜利时调用：本段进度 +1，攒满则清零开始下一段 */
export function addProgressBarCleared(): void {
    _profile.progressBarCleared++;
    if (_profile.progressBarCleared >= _profile.progressBarTarget) {
        _profile.progressBarCleared = 0;
    }
}

/** 从本地存储读取并合并到内存 */
export function loadFromStorage(): UserProfileData {
    try {
        const raw = sys.localStorage.getItem(STORAGE_KEY);
        if (!raw) return _profile;
        const parsed = JSON.parse(raw) as Partial<UserProfileData>;
        if (parsed && typeof parsed === 'object') {
            _profile = {
                currentLevel: sanitizeNumber(parsed.currentLevel, 1, 1),
                unlockedLevel: sanitizeNumber(parsed.unlockedLevel, 1, 1),
                levelStars: (parsed.levelStars && typeof parsed.levelStars === 'object') ? parsed.levelStars : {},
                undoCount: typeof parsed.undoCount === 'number' ? parsed.undoCount : -1,
                addTubeCount: sanitizeNumber(parsed.addTubeCount, 0, 0),
                progressBarCleared: sanitizeNumber(parsed.progressBarCleared, 0, 0),
                progressBarTarget: sanitizeNumber(parsed.progressBarTarget, 8, 1)
            };
        }
    } catch (e) {
        console.warn('[UserProfile] loadFromStorage 解析失败', e);
    }
    return _profile;
}

/** 写入本地存储 */
export function saveToStorage(): void {
    try {
        sys.localStorage.setItem(STORAGE_KEY, JSON.stringify(_profile));
    } catch (e) {
        console.warn('[UserProfile] saveToStorage 写入失败', e);
    }
}

/** 使用撤销道具，返回是否成功 */
export function useUndo(): boolean {
    if (_profile.undoCount > 0) {
        _profile.undoCount--;
        saveToStorage();
        return true;
    }
    return false;
}

/** 使用加管道具，返回是否成功 */
export function useAddTube(): boolean {
    if (_profile.addTubeCount > 0) {
        _profile.addTubeCount--;
        saveToStorage();
        return true;
    }
    return false;
}

/** 增加撤销道具次数 */
export function addUndoCount(count: number): void {
    _profile.undoCount = Math.max(0, _profile.undoCount + count);
    saveToStorage();
}

/** 增加加管道具次数 */
export function addAddTubeCount(count: number): void {
    _profile.addTubeCount = Math.max(0, _profile.addTubeCount + count);
    saveToStorage();
}

/** 获取当前道具数量 */
export function getUndoCount(): number {
    return _profile.undoCount;
}

export function getAddTubeCount(): number {
    return _profile.addTubeCount;
}

function sanitizeNumber(val: unknown, defaultVal: number, min: number): number {
    const n = typeof val === 'number' && !isNaN(val) ? val : defaultVal;
    return Math.max(min, Math.floor(n));
}
