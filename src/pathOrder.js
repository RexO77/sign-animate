// ─── PATH ORDERING & CLUSTERING ──────────────────────────────────────────────
// Sorts SVG paths into natural left-to-right writing order by:
// 1. Computing bounding boxes from path data
// 2. Clustering nearby paths into "letter groups" by X proximity
// 3. Sorting clusters L→R, paths within clusters T→B

/**
 * Parse an SVG path `d` string and return its bounding box.
 * Handles M, L, Q, C, Z commands (covers ImageTracer & our outline output).
 */
export function getPathBBox(d) {
    if (!d) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    // Extract all coordinate pairs from the path string
    // Match patterns like "M 100 200", "L100,200", "Q 10 20, 30 40"
    const numRegex = /-?\d+\.?\d*/g;
    const cmdRegex = /[MLHVCSQTAZ]/gi;

    let currentCmd = '';
    let nums = [];
    const tokens = d.match(/([MLHVCSQTAZ]|-?\d+\.?\d*)/gi) || [];

    for (const token of tokens) {
        if (token.match(/^[MLHVCSQTAZ]$/i)) {
            // Process previous command's accumulated numbers
            processNums(currentCmd, nums);
            currentCmd = token;
            nums = [];
        } else {
            nums.push(parseFloat(token));
        }
    }
    // Process final command
    processNums(currentCmd, nums);

    function processNums(cmd, numbers) {
        if (!cmd || numbers.length === 0) return;
        const c = cmd.toUpperCase();
        switch (c) {
            case 'M': case 'L': case 'T':
                for (let i = 0; i < numbers.length - 1; i += 2) update(numbers[i], numbers[i + 1]);
                break;
            case 'H':
                for (const n of numbers) { minX = Math.min(minX, n); maxX = Math.max(maxX, n); }
                break;
            case 'V':
                for (const n of numbers) { minY = Math.min(minY, n); maxY = Math.max(maxY, n); }
                break;
            case 'Q': case 'S':
                for (let i = 0; i < numbers.length - 1; i += 2) update(numbers[i], numbers[i + 1]);
                break;
            case 'C':
                for (let i = 0; i < numbers.length - 1; i += 2) update(numbers[i], numbers[i + 1]);
                break;
            case 'A':
                // Arc: skip radii/flags, take endpoint
                for (let i = 0; i < numbers.length - 1; i += 7) {
                    if (i + 6 < numbers.length) update(numbers[i + 5], numbers[i + 6]);
                }
                break;
        }
    }

    function update(x, y) {
        if (isFinite(x) && isFinite(y)) {
            minX = Math.min(minX, x); maxX = Math.max(maxX, x);
            minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        }
    }

    if (!isFinite(minX)) return null;
    return { minX, minY, maxX, maxY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, w: maxX - minX, h: maxY - minY };
}

/**
 * Cluster paths into "letter groups" based on horizontal proximity.
 * Paths whose bounding boxes overlap or are within `gapThreshold` horizontally
 * are grouped together.
 *
 * @param {Array<{path: string, bbox: object}>} items
 * @returns {Array<Array<{path: string, bbox: object}>>} clusters
 */
export function clusterPaths(items) {
    if (items.length === 0) return [];

    // Sort by leftmost X first
    const sorted = [...items].sort((a, b) => a.bbox.minX - b.bbox.minX);

    // Compute gap threshold: median path width × 0.6
    // This adaptively handles different signature sizes
    const widths = sorted.map(p => p.bbox.w).filter(w => w > 0).sort((a, b) => a - b);
    const medianWidth = widths.length > 0 ? widths[Math.floor(widths.length / 2)] : 20;
    const gapThreshold = medianWidth * 0.6;

    const clusters = [];
    let current = [sorted[0]];
    let clusterMaxX = sorted[0].bbox.maxX;

    for (let i = 1; i < sorted.length; i++) {
        const item = sorted[i];
        // If this path starts within gapThreshold of the cluster's rightmost edge, merge
        if (item.bbox.minX - clusterMaxX <= gapThreshold) {
            current.push(item);
            clusterMaxX = Math.max(clusterMaxX, item.bbox.maxX);
        } else {
            clusters.push(current);
            current = [item];
            clusterMaxX = item.bbox.maxX;
        }
    }
    clusters.push(current);

    // Within each cluster, sort top-to-bottom by center Y
    for (const cluster of clusters) {
        cluster.sort((a, b) => a.bbox.cy - b.bbox.cy);
    }

    return clusters;
}

/**
 * Full ordering pipeline: bbox → cluster → sort → flatten.
 * Returns { orderedPaths, clusterMeta } where clusterMeta[i] = { clusterIndex, indexInCluster, clusterSize }
 *
 * @param {string[]} paths - Array of SVG path `d` strings
 * @returns {{ orderedPaths: string[], clusterMeta: Array<{clusterIndex: number, indexInCluster: number, clusterSize: number}> }}
 */
export function orderPaths(paths) {
    const items = paths
        .map(p => ({ path: p, bbox: getPathBBox(p) }))
        .filter(item => item.bbox !== null);

    if (items.length === 0) return { orderedPaths: [], clusterMeta: [] };

    const clusters = clusterPaths(items);

    const orderedPaths = [];
    const clusterMeta = [];

    clusters.forEach((cluster, clusterIndex) => {
        cluster.forEach((item, indexInCluster) => {
            orderedPaths.push(item.path);
            clusterMeta.push({ clusterIndex, indexInCluster, clusterSize: cluster.length });
        });
    });

    return { orderedPaths, clusterMeta };
}

/**
 * Compute animation delay for a path based on style, cluster metadata, and speed.
 *
 * @param {number} globalIndex - Global index in the ordered path array
 * @param {object} meta - { clusterIndex, indexInCluster, clusterSize }
 * @param {'letter'|'flow'|'classic'} style
 * @param {number} speed - Multiplier (1 = normal, 2 = 2x fast, 0.5 = slow)
 * @returns {{ delay: number, duration: number }}
 */
export function computeTiming(globalIndex, meta, style, speed = 1) {
    const s = 1 / speed; // Higher speed = shorter times

    if (style === 'classic' || !meta) {
        // Original flat delay behavior
        return { delay: globalIndex * 0.4 * s, duration: 0.6 * s };
    }

    if (style === 'letter') {
        // Paths in the same cluster animate nearly simultaneously,
        // with a noticeable pause between clusters
        const clusterDelay = meta.clusterIndex * 0.5 * s;  // Pause between letters
        const intraDelay = meta.indexInCluster * 0.08 * s;  // Tiny stagger within letter
        return { delay: clusterDelay + intraDelay, duration: 0.5 * s };
    }

    if (style === 'flow') {
        // Continuous left-to-right motion with minimal gaps
        const perPath = 0.15 * s;  // Short gap between each path
        const clusterGap = 0.05 * s; // Tiny extra gap at cluster boundaries
        const clusterOffset = meta.clusterIndex * clusterGap;
        return { delay: globalIndex * perPath + clusterOffset, duration: 0.45 * s };
    }

    return { delay: globalIndex * 0.4 * s, duration: 0.6 * s };
}
