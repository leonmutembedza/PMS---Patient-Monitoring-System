import React, { useRef, useEffect } from 'react';

interface ChannelConfig {
  label: string;
  units: string;
  fs: number;
  data: number[];
  peakIndices?: number[];
  color?: string;
  minVal: number;
  maxVal: number;
  scaleLabel: string;
}

interface BiosignalCanvasProps {
  channels: ChannelConfig[];
  visibleWindowSec?: number; // default 10 seconds
  isPlaying: boolean;
  prefersReducedMotion?: boolean;
}

export const BiosignalCanvas: React.FC<BiosignalCanvasProps> = ({
  channels,
  visibleWindowSec = 10,
  prefersReducedMotion = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI Retina displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Clear background (clinical dark)
    ctx.fillStyle = '#111214';
    ctx.fillRect(0, 0, width, height);

    const numChannels = channels.length;
    if (numChannels === 0) return;

    const channelHeight = height / numChannels;

    // Draw time calibration grid (1.0s major lines, 0.2s minor lines)
    const pixelsPerSec = width / visibleWindowSec;
    ctx.strokeStyle = '#1e2023';
    ctx.lineWidth = 0.5;

    // Minor 0.2s gridlines
    ctx.beginPath();
    for (let t = 0; t <= visibleWindowSec; t += 0.2) {
      const x = t * pixelsPerSec;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    ctx.stroke();

    // Major 1.0s gridlines
    ctx.strokeStyle = '#26282c';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    for (let t = 0; t <= visibleWindowSec; t += 1.0) {
      const x = t * pixelsPerSec;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    ctx.stroke();

    // Render Each Channel Trace
    channels.forEach((ch, chIdx) => {
      const topY = chIdx * channelHeight;
      const bottomY = topY + channelHeight;
      const midY = topY + channelHeight / 2;

      // Channel divider hairline
      ctx.strokeStyle = '#35373d';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(0, bottomY);
      ctx.lineTo(width, bottomY);
      ctx.stroke();

      // Channel Header Label (Top Left of trace)
      ctx.fillStyle = '#9ca0a8';
      ctx.font = '600 10px "IBM Plex Sans", sans-serif';
      ctx.fillText(`${ch.label} (${ch.units})`, 10, topY + 14);

      // Sampling rate & scale indicator (Top Right of trace)
      ctx.fillStyle = '#6b7076';
      ctx.font = '400 9px "IBM Plex Mono", monospace';
      ctx.fillText(`${ch.fs} Hz • ${ch.scaleLabel}`, width - 110, topY + 14);

      // Small voltage / amplitude calibration bar (e.g. 0.5 mV standard)
      ctx.strokeStyle = '#4b5563';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      const calibX = 14;
      const calibHeightPx = Math.min(24, channelHeight * 0.35);
      ctx.moveTo(calibX, midY - calibHeightPx / 2);
      ctx.lineTo(calibX, midY + calibHeightPx / 2);
      ctx.stroke();

      // Plot trace with Min/Max decimation to prevent losing narrow R-peaks
      const data = ch.data;
      if (!data || data.length === 0) {
        ctx.fillStyle = '#dc2626';
        ctx.font = '500 10px "IBM Plex Mono", monospace';
        ctx.fillText('NO SIGNAL DATA', width / 2 - 40, midY);
        return;
      }

      const totalSamples = data.length;
      const traceColor = ch.color || '#e4e5e7';
      ctx.strokeStyle = traceColor;
      ctx.lineWidth = 1.25;
      ctx.lineJoin = 'round';
      ctx.beginPath();

      const range = (ch.maxVal - ch.minVal) || 1;
      const scaleY = (channelHeight * 0.72) / range;

      for (let px = 0; px < width; px++) {
        // Samples covered by this pixel column
        const sampleStart = Math.floor((px / width) * totalSamples);
        const sampleEnd = Math.min(totalSamples, Math.floor(((px + 1) / width) * totalSamples));

        if (sampleStart >= totalSamples) break;

        let colMin = data[sampleStart];
        let colMax = data[sampleStart];
        for (let s = sampleStart; s < sampleEnd; s++) {
          if (data[s] < colMin) colMin = data[s];
          if (data[s] > colMax) colMax = data[s];
        }

        const yMin = midY - (colMax - (ch.minVal + ch.maxVal) / 2) * scaleY;
        const yMax = midY - (colMin - (ch.minVal + ch.maxVal) / 2) * scaleY;

        if (px === 0) {
          ctx.moveTo(px, yMin);
          ctx.lineTo(px, yMax);
        } else {
          ctx.lineTo(px, yMin);
          ctx.lineTo(px, yMax);
        }
      }
      ctx.stroke();

      // Peak Markers Overlaid (R-peaks or Systolic Peaks)
      if (ch.peakIndices && ch.peakIndices.length > 0) {
        ctx.fillStyle = '#0891b2'; // Cyan peak marker dot
        for (const pIdx of ch.peakIndices) {
          if (pIdx >= 0 && pIdx < totalSamples) {
            const px = (pIdx / totalSamples) * width;
            const val = data[pIdx];
            const py = midY - (val - (ch.minVal + ch.maxVal) / 2) * scaleY;

            ctx.beginPath();
            ctx.arc(px, py, 2.5, 0, 2 * Math.PI);
            ctx.fill();
          }
        }
      }
    });

  }, [channels, visibleWindowSec, prefersReducedMotion]);

  // Handle dynamic resize when expanding/restoring full-screen panel
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animId: number;
    const resizeObserver = new ResizeObserver(() => {
      // Trigger canvas re-render on next tick
      animId = requestAnimationFrame(() => {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
      });
    });

    resizeObserver.observe(canvas);
    return () => {
      resizeObserver.disconnect();
      if (animId) cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div className="relative w-full h-full min-h-[300px] bg-surface-0 border border-surface-border rounded-[2px] overflow-hidden">
      <canvas
        ref={canvasRef}
        key={visibleWindowSec}
        className="w-full h-full block"
      />
    </div>
  );
};
