import { z } from 'zod';

export const SUPPORTED_FORMATS = ['mp4', 'gif'];

const animationStyleSchema = z.enum(['letter', 'flow', 'classic']);

const clusterMetaSchema = z.object({
  clusterIndex: z.number().int().min(0),
  indexInCluster: z.number().int().min(0),
  clusterSize: z.number().int().min(1),
});

const animationSchema = z.object({
  paths: z.array(z.string().min(1).max(4000)).min(1).max(1500),
  animStyle: animationStyleSchema,
  animSpeed: z.number().min(0.25).max(3),
  clusterMeta: z.array(clusterMetaSchema).max(1500).default([]),
  viewBox: z.string().min(3).max(120),
  svgTransform: z.string().max(500).default(''),
  isFill: z.boolean().default(false),
});

const presetSchema = z.object({
  maxLongEdge: z.number().int().min(64).max(1920),
  targetFps: z.number().min(1).max(60),
  maxFrames: z.number().int().min(2).max(600),
  background: z.string().max(40).default('#ffffff'),
});

export const createJobBodySchema = z.object({
  format: z.enum(SUPPORTED_FORMATS),
  animation: animationSchema,
  preset: presetSchema,
  idempotencyKey: z.string().min(8).max(200),
  reason: z.string().max(200).optional(),
});

export const encodePayloadSchema = z.object({
  format: z.enum(SUPPORTED_FORMATS),
  animation: animationSchema,
  preset: presetSchema,
  reason: z.string().max(200).optional(),
});

export function estimateComplexity({ animation, preset }) {
  const estimatedFrames = Math.min(
    Math.max(Math.ceil((animation.paths.length * 0.5) + preset.targetFps * 3), 12),
    preset.maxFrames,
  );

  const viewBoxParts = String(animation.viewBox).trim().split(/\s+/).map(Number);
  const viewW = Number.isFinite(viewBoxParts[2]) ? Math.max(viewBoxParts[2], 1) : 600;
  const viewH = Number.isFinite(viewBoxParts[3]) ? Math.max(viewBoxParts[3], 1) : 300;
  const longEdge = Math.max(viewW, viewH);
  const scale = preset.maxLongEdge / longEdge;
  const width = Math.max(1, Math.round(viewW * scale));
  const height = Math.max(1, Math.round(viewH * scale));

  return {
    estimatedFrames,
    width,
    height,
    estimatedPixels: estimatedFrames * width * height,
  };
}
