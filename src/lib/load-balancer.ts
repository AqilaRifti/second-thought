// API Key Load Balancer with health tracking

interface KeyHealth {
    key: string;
    healthy: boolean;
    errorCount: number;
    lastError?: Date;
    lastSuccess?: Date;
}

const API_KEYS = [
    'csk-c9ddc69fd3pk9jj3py24jmhydft6c2ymmdk59tyt6em6derc',
    'csk-nrtfnn56xmvkyckdt9nwn3rh8ef8vwx9xxktvxwmk6yxw566',
    'csk-hrtwc24p9mtw48m4dmvf95j4xx539nth4y63wxympjhkdhfp',
    'csk-4r22m82n6pve9ywhd9hkpdneek6t52keethr5dn66jpw6fyw',
    'csk-wp589vwjn2hfhnxhv9rwyj54tnpexc6yfxev5en9x6ffej5m',
    'csk-6232phepe8nxn25vrwjenf2p9mpke9txvw6pjjd6jx8reh2n',
    'csk-4f9vfnrkmd898h5dyr98y8j2ftnjhvhee322mvy8tmhnfthh',
    'csk-mennk8jmdnxptr4r56xv9mc95t9vwjpwhhnr54jhp4382wjt',
];

const ERROR_THRESHOLD = 3;
const RECOVERY_TIME_MS = 60000; // 1 minute

class LoadBalancer {
    private keys: KeyHealth[];
    private currentIndex: number;

    constructor(apiKeys: string[] = API_KEYS) {
        this.keys = apiKeys.map((key) => ({
            key,
            healthy: true,
            errorCount: 0,
        }));
        this.currentIndex = 0;
    }

    getNextKey(): string {
        // Try to find a healthy key using round-robin
        const startIndex = this.currentIndex;
        let attempts = 0;

        while (attempts < this.keys.length) {
            const keyHealth = this.keys[this.currentIndex];
            this.currentIndex = (this.currentIndex + 1) % this.keys.length;

            // Check if key should be recovered
            if (!keyHealth.healthy && keyHealth.lastError) {
                const timeSinceError = Date.now() - keyHealth.lastError.getTime();
                if (timeSinceError > RECOVERY_TIME_MS) {
                    keyHealth.healthy = true;
                    keyHealth.errorCount = 0;
                }
            }

            if (keyHealth.healthy) {
                return keyHealth.key;
            }

            attempts++;
        }

        // All keys unhealthy, reset and return first key
        this.resetAllKeys();
        return this.keys[startIndex].key;
    }

    reportError(key: string): void {
        const keyHealth = this.keys.find((k) => k.key === key);
        if (keyHealth) {
            keyHealth.errorCount++;
            keyHealth.lastError = new Date();

            if (keyHealth.errorCount >= ERROR_THRESHOLD) {
                keyHealth.healthy = false;
            }
        }
    }

    reportSuccess(key: string): void {
        const keyHealth = this.keys.find((k) => k.key === key);
        if (keyHealth) {
            keyHealth.healthy = true;
            keyHealth.errorCount = 0;
            keyHealth.lastSuccess = new Date();
        }
    }

    getHealthyKeyCount(): number {
        return this.keys.filter((k) => k.healthy).length;
    }

    private resetAllKeys(): void {
        this.keys.forEach((k) => {
            k.healthy = true;
            k.errorCount = 0;
        });
    }
}

// Singleton instance
export const loadBalancer = new LoadBalancer();

// Export class for testing
export { LoadBalancer, API_KEYS };
