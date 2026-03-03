import { UMNativeSdk } from '../platform/UMNativeSdk';

/**
 * 广告服务：集中广告触发策略，避免业务层重复实现。
 */
class _AdService {
    private static readonly FOREGROUND_DUPLICATE_GUARD_MS = 1000;
    private static readonly INTERSTITIAL_FALLBACK_MS = 2500;
    private _interstitialCompletion: (() => void) | null = null;
    private _interstitialFallbackTimer: ReturnType<typeof setTimeout> | null = null;
    private _isInterstitialCallbackHooked = false;
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
        try {
            UMNativeSdk.ShowVideo(() => { });
        } catch (err) {
            console.warn('[AdService] ShowVideo 调用失败，忽略并继续运行', err);
        }
    }

    /**
     * 结算前展示插屏广告，然后继续原有流程。
     */
    public showResultInterstitialThen(next: () => void): void {
        // 若上一次异常未清理，先放行，避免覆盖后永远不返回。
        this.resolvePendingInterstitial();
        this._interstitialCompletion = next;
        this._interstitialFallbackTimer = setTimeout(() => {
            console.warn('[AdService] 插屏回调超时，自动放行结算流程');
            this.resolvePendingInterstitial();
        }, _AdService.INTERSTITIAL_FALLBACK_MS);

        try {
            UMNativeSdk.ShowInterstitial('normal');
        } catch (err) {
            console.warn('[AdService] ShowInterstitial 调用失败，自动放行结算流程', err);
            this.resolvePendingInterstitial();
        }
    }

    private patchInterstitialCallback(): void {
        if (this._isInterstitialCallbackHooked) {
            return;
        }
        this._isInterstitialCallbackHooked = true;
        const original = UMNativeSdk.AfterPlayInterstitial.bind(UMNativeSdk);
        UMNativeSdk.AfterPlayInterstitial = (type: string): void => {
            original(type);
            this.resolvePendingInterstitial();
        };
    }

    private resolvePendingInterstitial(): void {
        if (this._interstitialFallbackTimer) {
            clearTimeout(this._interstitialFallbackTimer);
            this._interstitialFallbackTimer = null;
        }
        const done = this._interstitialCompletion;
        this._interstitialCompletion = null;
        done?.();
    }
}

export const AdService = new _AdService();
