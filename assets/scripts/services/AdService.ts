import { UMNativeSdk } from '../platform/UMNativeSdk';

/**
 * 广告服务：集中广告触发策略，避免业务层重复实现。
 */
class _AdService {
    private static readonly FOREGROUND_DUPLICATE_GUARD_MS = 1000;
    private _lastForegroundAdAt = 0;

    /**
     * 应用回到前台时触发开屏广告（首次进入也可复用该入口）。
     */
    public onAppForeground(): void {
        const now = Date.now();
        if (now - this._lastForegroundAdAt < _AdService.FOREGROUND_DUPLICATE_GUARD_MS) {
            return;
        }
        this._lastForegroundAdAt = now;
        UMNativeSdk.ShowSplash();
    }

    /**
     * 结算前展示插屏广告，然后继续原有流程。
     * 复刻旧 SDK 形态：当前不依赖插屏回调。
     */
    public showResultInterstitialThen(next: () => void): void {
        UMNativeSdk.ShowInterstitial('normal');
        next();
    }
}

export const AdService = new _AdService();
