import { useWebHaptics } from 'web-haptics/react';

/**
 * Semantic haptic feedback hook for the editor app.
 * Maps action names to curated haptic presets.
 */
const PRESETS = {
    click: 'light',       // General button click (ghost/outline variants)
    primary: 'medium',    // Primary/accent buttons
    danger: 'error',      // Danger/destructive actions
    export: 'success',    // Export/download/copy actions
    tab: 'selection',     // Tab switching
    draw: 'soft',         // Stroke completion
    reset: 'nudge',       // Reset/clear action
    upload: 'success',    // Successful file upload
    slider: 'rigid',      // Slider value snapping
};

export function useHaptics() {
    const { trigger, cancel, isSupported } = useWebHaptics({ debug: false });

    const haptic = (action) => {
        const preset = PRESETS[action] || 'light';
        trigger?.(preset);
    };

    return { haptic, trigger, cancel, isSupported };
}
