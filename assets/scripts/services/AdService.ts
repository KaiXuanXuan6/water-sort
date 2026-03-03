import { UMNativeSdk } from '../platform/UMNativeSdk';

/**
 * 广告服务：集中广告触发策略，避免业务层重复实现。
 */
class _AdService {
    private static readonly FOREGROUND_DUPLICATE_GUARD_MS = 1000;
    private _pendingInterstitialNext: (() => void) | null = null;
    private _afterPlayInterstitialPatched = false;
    private _lastForegroundAdAt = 0;

    constructor() {
        this.patchInterstitialCallback();
    }

    /**
     * 应用回到前台时触发开屏广告。
     */
    public onAppForeground(): void {
        const now = Date.now();
        if (now - this._lastForegroundAdAt < _AdService.FOREGROUND_DUPLICATE_GUARD_MS) {
            return;
        }
        this._lastForegroundAdAt = now;
        UMNativeSdk.ShowVideo(() => { });
    }

    /**
     * 结算前展示插屏广告，然后继续原有流程。
     */
    public showResultInterstitialThen(next: () => void): void {
        this._pendingInterstitialNext = next;
        UMNativeSdk.ShowInterstitial('normal');
    }

    private patchInterstitialCallback(): void {
        if (this._afterPlayInterstitialPatched) {
            return;
        }
        this._afterPlayInterstitialPatched = true;
        const original = UMNativeSdk.AfterPlayInterstitial.bind(UMNativeSdk);
        UMNativeSdk.AfterPlayInterstitial = (type: string): void => {
            original(type);
            const done = this._pendingInterstitialNext;
            this._pendingInterstitialNext = null;
            done?.();
        };
    }
}

export const AdService = new _AdService();
