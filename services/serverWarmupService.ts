import { AppState, AppStateStatus } from 'react-native';

const SERVER_BASE_URL = 'https://saigonmatch.com.vn';
const WARMUP_INTERVAL = 10 * 60 * 1000; // 10 minutes
const HEALTH_CHECK_TIMEOUT = 5000; // 5 seconds

class ServerWarmupService {
    private warmupTimer: ReturnType<typeof setInterval> | null = null;
    private isWarming = false;
    private appStateSubscription: any = null;

    /**
     * Initialize the warmup service
     * Starts periodic pings and monitors app state
     */
    initialize() {
        console.log('🔥 [ServerWarmup] Initializing server warmup service');

        // Initial warmup
        this.warmupServer();

        // Start periodic warmup
        this.startPeriodicWarmup();

        // Monitor app state to resume warmup when app becomes active
        this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
    }

    /**
     * Cleanup when service is no longer needed
     */
    cleanup() {
        console.log('🧹 [ServerWarmup] Cleaning up warmup service');
        this.stopPeriodicWarmup();
        if (this.appStateSubscription) {
            this.appStateSubscription.remove();
        }
    }

    /**
     * Ping server health endpoint to keep it awake
     */
    private async warmupServer() {
        if (this.isWarming) {
            return;
        }

        this.isWarming = true;

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT);

            const response = await fetch(`${SERVER_BASE_URL}/health`, {
                method: 'GET',
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                console.warn(`⚠️ [ServerWarmup] Server responded with status ${response.status}`);
            }
        } catch (error: any) {
            // Silently ignore network errors during warmup - not critical
            if (__DEV__) {
                if (error.name === 'AbortError') {
                    console.log(`⏱️ [ServerWarmup] Health check timeout`);
                } else {
                    console.log(`🔌 [ServerWarmup] Server unreachable (offline/dev mode)`);
                }
            }
        } finally {
            this.isWarming = false;
        }
    }

    /**
     * Start periodic warmup pings
     */
    private startPeriodicWarmup() {
        if (this.warmupTimer) {
            console.log('⚠️ [ServerWarmup] Warmup timer already running');
            return;
        }

        console.log(`⏰ [ServerWarmup] Starting periodic warmup every ${WARMUP_INTERVAL / 1000}s`);
        this.warmupTimer = setInterval(() => {
            this.warmupServer();
        }, WARMUP_INTERVAL);
    }

    /**
     * Stop periodic warmup pings
     */
    private stopPeriodicWarmup() {
        if (this.warmupTimer) {
            console.log('🛑 [ServerWarmup] Stopping periodic warmup');
            clearInterval(this.warmupTimer);
            this.warmupTimer = null;
        }
    }

    /**
     * Handle app state changes
     */
    private handleAppStateChange = (nextAppState: AppStateStatus) => {
        if (nextAppState === 'active') {
            console.log('📱 [ServerWarmup] App became active, warming up server');
            this.warmupServer();
            if (!this.warmupTimer) {
                this.startPeriodicWarmup();
            }
        } else if (nextAppState === 'background' || nextAppState === 'inactive') {
            console.log('💤 [ServerWarmup] App went to background, stopping warmup');
            this.stopPeriodicWarmup();
        }
    };

    /**
     * Manually trigger a warmup (useful before making important API calls)
     */
    async manualWarmup(): Promise<void> {
        console.log('🔥 [ServerWarmup] Manual warmup triggered');
        await this.warmupServer();
    }
}

// Export singleton instance
export const serverWarmupService = new ServerWarmupService();
export default serverWarmupService;
