import { useWebHaptics } from 'web-haptics/react';

/**
 * Semantic haptic feedback hook for the landing page.
 * Maps action names to curated haptic presets.
 */
const PRESETS = {
    cta: 'medium',       // Primary CTA buttons (Open Editor)
    nav: 'selection',    // Nav link taps
    toggle: 'light',     // Mobile menu open/close
    card: 'soft',        // Format card hover/tap
    secondary: 'light',  // Secondary buttons (View Showcase)
};

export function useHaptics() {
    const { trigger, cancel, isSupported } = useWebHaptics({ debug: false });

    const haptic = (action) => {
        const preset = PRESETS[action] || 'light';
        trigger?.(preset);
    };

    return { haptic, trigger, cancel, isSupported };
}
