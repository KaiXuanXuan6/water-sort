import { sys } from 'cc';

/**
 * 用户档案
 * 当前关卡进度、已解锁关卡、道具数量等；持久化到 localStorage
 */

export interface UserProfileData {
    /** 音效开关（短音效 SFX） */
    soundEnabled: boolean;
    /** 背景音乐开关 */
    musicEnabled: boolean;
    /** 震动开关 */
    vibrationEnabled: boolean;
    /** 当前玩到的最大关卡序号（1-based） */
    currentLevel: number;
    /** 已解锁的最大关卡序号 */
    unlockedLevel: number;
    /** 各关卡星数 1～3，key 为 levelId */
    levelStars: Record<string, number>;
    /** 金币数量 */
    coinCount: number;
    /** 撤销道具剩余次数，-1 表示无限 */
    undoCount: number;
    /** 加管道具剩余次数 */
    addTubeCount: number;
    /** 当前进度条已通关数（本段内） */
    progressBarCleared: number;
    /** 攒满本次进度条需要的通关数 */
    progressBarTarget: number;
    /** 已解锁的瓶子类型 ID 列表，默认只解锁第一种 */
    unlockedBottleTypes: number[];
    /** 当前选中的瓶子类型（用户当前使用的瓶子，一次只能一种），持久化 */
    selectedBottleType: number;
    /** 已解锁的背景 ID 列表 */
    unlockedBackgroundTypes: number[];
    /** 当前选中的背景 ID，持久化 */
    selectedBackgroundType: number;
}

const STORAGE_KEY = 'water_sort_user_profile';

const DEFAULT_PROFILE: UserProfileData = {
    soundEnabled: true,
    musicEnabled: true,
    vibrationEnabled: true,
    currentLevel: 1,
    unlockedLevel: 1,
    levelStars: {},
    coinCount: 0,
    undoCount: 3,
    addTubeCount: 1,
    progressBarCleared: 0,
    progressBarTarget: 6,
    unlockedBottleTypes: [1, 2],
    selectedBottleType: 1,
    unlockedBackgroundTypes: [1, 2],
    selectedBackgroundType: 1
};

let _profile: UserProfileData = { ...DEFAULT_PROFILE };

/** 金币数量变化时调用（由 UI 注册，用于刷新显示） */
let _onCoinCountChange: (() => void) | null = null;

export function setOnCoinCountChange(fn: (() => void) | null): void {
    _onCoinCountChange = fn;
}

export function getSoundEnabled(): boolean {
    return _profile.soundEnabled;
}

export function setSoundEnabled(enabled: boolean): void {
    _profile.soundEnabled = enabled;
    saveToStorage();
}

export function getMusicEnabled(): boolean {
    return _profile.musicEnabled;
}

export function setMusicEnabled(enabled: boolean): void {
    _profile.musicEnabled = enabled;
    saveToStorage();
}

export function getVibrationEnabled(): boolean {
    return _profile.vibrationEnabled;
}

export function setVibrationEnabled(enabled: boolean): void {
    _profile.vibrationEnabled = enabled;
    saveToStorage();
}

export function getCurrentLevel(): number {
    return _profile.currentLevel;
}

export function setCurrentLevel(level: number): void {
    _profile.currentLevel = sanitizeNumber(level, 1, 1);
    saveToStorage();
}

export function getUnlockedLevel(): number {
    return _profile.unlockedLevel;
}

export function setUnlockedLevel(level: number): void {
    _profile.unlockedLevel = Math.max(_profile.unlockedLevel, level);
    saveToStorage();
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

/** 胜利时调用：本段进度 +1 */
export function addProgressBarCleared(): void {
    _profile.progressBarCleared++;
}

/** 领取奖励后调用：本段进度清零并持久化（结算页进度条展示不刷新，仅数据清 0） */
export function resetProgressBarSegment(): void {
    if (_profile.progressBarCleared >= _profile.progressBarTarget) {
        _profile.progressBarCleared = 0;
        saveToStorage();
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
                soundEnabled: typeof parsed.soundEnabled === 'boolean' ? parsed.soundEnabled : true,
                musicEnabled: typeof parsed.musicEnabled === 'boolean' ? parsed.musicEnabled : true,
                vibrationEnabled: typeof parsed.vibrationEnabled === 'boolean' ? parsed.vibrationEnabled : true,
                currentLevel: sanitizeNumber(parsed.currentLevel, 1, 1),
                unlockedLevel: sanitizeNumber(parsed.unlockedLevel, 1, 1),
                levelStars: (parsed.levelStars && typeof parsed.levelStars === 'object') ? parsed.levelStars : {},
                coinCount: sanitizeNumber(parsed.coinCount, 0, 0),
                undoCount: typeof parsed.undoCount === 'number' ? parsed.undoCount : -1,
                addTubeCount: sanitizeNumber(parsed.addTubeCount, 0, 0),
                progressBarCleared: sanitizeNumber(parsed.progressBarCleared, 0, 0),
                progressBarTarget: sanitizeNumber(parsed.progressBarTarget, 8, 1),
                unlockedBottleTypes: Array.isArray(parsed.unlockedBottleTypes) ? parsed.unlockedBottleTypes.filter((n): n is number => typeof n === 'number') : [1, 2],
                selectedBottleType: sanitizeNumber(parsed.selectedBottleType, 1, 1),
                unlockedBackgroundTypes: Array.isArray(parsed.unlockedBackgroundTypes) ? parsed.unlockedBackgroundTypes.filter((n): n is number => typeof n === 'number') : [1, 2],
                selectedBackgroundType: sanitizeNumber(parsed.selectedBackgroundType, 1, 1)
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

export function getCoinCount(): number {
    return _profile.coinCount;
}

export function addCoinCount(amount: number): void {
    _profile.coinCount = Math.max(0, _profile.coinCount + amount);
    saveToStorage();
    _onCoinCountChange?.();
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

/** 获取已解锁的瓶子类型列表 */
export function getUnlockedBottleTypes(): number[] {
    return _profile.unlockedBottleTypes.slice();
}

/** 设置已解锁的瓶子类型列表 */
export function setUnlockedBottleTypes(types: number[]): void {
    _profile.unlockedBottleTypes = types.filter((n) => typeof n === 'number');
    saveToStorage();
}

/** 添加一个已解锁的瓶子类型 */
export function addUnlockedBottleType(typeId: number): void {
    if (_profile.unlockedBottleTypes.indexOf(typeId) >= 0) return;
    _profile.unlockedBottleTypes.push(typeId);
    saveToStorage();
}

/** 是否已解锁该瓶子类型 */
export function isBottleTypeUnlocked(bottleType: number): boolean {
    return _profile.unlockedBottleTypes.indexOf(bottleType) >= 0;
}

/** 获取当前选中的瓶子类型 */
export function getSelectedBottleType(): number {
    return _profile.selectedBottleType;
}

/** 设置当前选中的瓶子类型并持久化 */
export function setSelectedBottleType(typeId: number): void {
    _profile.selectedBottleType = typeId;
    saveToStorage();
}

/** 是否已解锁该背景类型 */
export function isBackgroundTypeUnlocked(bgType: number): boolean {
    return _profile.unlockedBackgroundTypes.indexOf(bgType) >= 0;
}

/** 获取当前选中的背景类型 */
export function getSelectedBackgroundType(): number {
    return _profile.selectedBackgroundType;
}

/** 设置当前选中的背景类型并持久化 */
export function setSelectedBackgroundType(typeId: number): void {
    _profile.selectedBackgroundType = typeId;
    saveToStorage();
}

function sanitizeNumber(val: unknown, defaultVal: number, min: number): number {
    const n = typeof val === 'number' && !isNaN(val) ? val : defaultVal;
    return Math.max(min, Math.floor(n));
}
