import { _decorator, Component, AudioSource, AudioClip, assetManager } from 'cc';
import { getSoundEnabled, getMusicEnabled } from '../data/UserProfile';
import { NavigationManager, NavigationEvent, SceneName } from './NavigationManager';

const { ccclass, property } = _decorator;

export type BGMClipKey = 'bgm01' | 'bgm02';
export type SFXClipKey = 'button' | 'select' | 'finish' | 'win' | 'refresh';

const SOUND_DIR = 'Sound';

/**
 * 音效管理器：BGM + 短音效，通过编辑器绑定两个 AudioSource，不使用节点名查找。
 */
@ccclass('SoundManager')
export class SoundManager extends Component {
    @property(AudioSource)
    bgmAudioSource: AudioSource | null = null;

    @property(AudioSource)
    sfxAudioSource: AudioSource | null = null;

    private static _instance: SoundManager | null = null;
    private _currentBGM: BGMClipKey | null = null;

    public static get instance(): SoundManager | null {
        return SoundManager._instance;
    }

    protected onLoad(): void {
        if (SoundManager._instance !== null && SoundManager._instance !== this) {
            this.node.destroy();
            return;
        }
        SoundManager._instance = this;
        this.setupBGMListener();
    }

    protected start(): void {
        const nav = NavigationManager.instance;
        if (nav) {
            this._onSceneComplete({ sceneName: nav.currentScene });
        }
    }

    protected onDestroy(): void {
        if (SoundManager._instance === this) {
            SoundManager._instance = null;
        }
        this.teardownBGMListener();
    }

    private _onSceneComplete: (data: { sceneName?: SceneName }) => void = () => {};

    private setupBGMListener(): void {
        this._onSceneComplete = (data: { sceneName?: SceneName }) => {
            const scene = data.sceneName;
            if (scene === SceneName.GAME) {
                this.playBGM('bgm02');
            } else if (scene === SceneName.HOME || scene === SceneName.MAP || scene === SceneName.COLLECTION) {
                this.playBGM('bgm01');
            }
        };
        const nav = NavigationManager.instance;
        if (nav) {
            nav.addListener(NavigationEvent.SCENE_LOAD_COMPLETE, this._onSceneComplete);
            this._onSceneComplete({ sceneName: nav.currentScene });
        }
    }

    private teardownBGMListener(): void {
        const nav = NavigationManager.instance;
        if (nav) {
            nav.removeListener(NavigationEvent.SCENE_LOAD_COMPLETE, this._onSceneComplete);
        }
    }

    /**
     * 播放背景音乐（会先停止当前 BGM，再加载并播放指定 clip）。
     * 若当前已在播放同一首 BGM 则不重新播放，避免 Home/Collection/Map 切换时重头播。
     */
    public playBGM(clipKey: BGMClipKey): void {
        if (!getMusicEnabled()) {
            this.stopBGM();
            return;
        }
        const src = this.bgmAudioSource;
        if (!src) return;
        if (this._currentBGM === clipKey && src.playing) return;
        const path = `${SOUND_DIR}/${clipKey}`;
        assetManager.resources.load(path, AudioClip, (err, clip) => {
            if (err || !clip) {
                console.warn('[SoundManager] 加载 BGM 失败:', path, err);
                return;
            }
            src.stop();
            src.clip = clip;
            src.loop = true;
            src.play();
            this._currentBGM = clipKey;
        });
    }

    /**
     * 停止背景音乐
     */
    public stopBGM(): void {
        const src = this.bgmAudioSource;
        if (src) src.stop();
        this._currentBGM = null;
    }

    /**
     * 应用背景音乐开关（设置弹窗中 Music 开关切换后调用，立即生效）
     */
    public applyMusicSetting(): void {
        if (!getMusicEnabled()) {
            this.stopBGM();
            return;
        }
        const nav = NavigationManager.instance;
        if (nav) this._onSceneComplete({ sceneName: nav.currentScene });
    }

    /**
     * 播放短音效（playOneShot）
     */
    public playOneShot(clipKey: SFXClipKey): void {
        if (!getSoundEnabled()) return;
        const src = this.sfxAudioSource;
        if (!src) return;
        const path = `${SOUND_DIR}/${clipKey}`;
        assetManager.resources.load(path, AudioClip, (err, clip) => {
            if (err || !clip) {
                console.warn('[SoundManager] 加载音效失败:', path, err);
                return;
            }
            src.playOneShot(clip, 1);
        });
    }
}
