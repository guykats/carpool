export type BiometricGateResult = 'passed' | 'unsupported' | 'failed';

/**
 * Client-side-only Face ID / fingerprint gate for first-time device setup
 * (see PRD 4.1). This intentionally does NOT register a credential with the
 * server or verify a signature - it only uses the browser's platform
 * authenticator prompt as a local "a human is present" check before letting
 * someone reach the one-time name/child form. If the device has no platform
 * authenticator (e.g. a desktop with no biometric hardware), it degrades
 * gracefully rather than blocking access.
 */
export async function requestBiometricGate(): Promise<BiometricGateResult> {
    if (
        typeof window === 'undefined' ||
        !window.PublicKeyCredential ||
        typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable !== 'function'
    ) {
        return 'unsupported';
    }

    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().catch(() => false);
    if (!available) {
        return 'unsupported';
    }

    try {
        const challenge = crypto.getRandomValues(new Uint8Array(32));
        const userId = crypto.getRandomValues(new Uint8Array(16));

        const credential = await navigator.credentials.create({
            publicKey: {
                challenge,
                rp: { name: 'הסעות לחוג' },
                user: { id: userId, name: 'device-gate', displayName: 'device-gate' },
                pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
                authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
                timeout: 60000,
            },
        });

        return credential ? 'passed' : 'failed';
    } catch {
        return 'failed';
    }
}
