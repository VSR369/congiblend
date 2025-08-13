import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface AutoScaleSectionProps {
  children: React.ReactNode;
  className?: string;
  /** Small padding to keep space from viewport edges (px) */
  viewportPadding?: number;
  /** Minimum scale allowed when shrinking content */
  minScale?: number; // e.g., 0.7
}

/**
 * AutoScaleSection
 * Scales its children down when they would overflow the available viewport
 * (width or height). Uses CSS transform: scale() with transform-origin: top center.
 *
 * Notes:
 * - Only scales down (never up). Max scale = 1.
 * - Recomputes on window resize/orientation change and content size changes.
 * - Avoids layout shifts by transforming inner content only.
 */
export function AutoScaleSection({
  children,
  className,
  viewportPadding = 16,
  minScale = 0.7,
}: AutoScaleSectionProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);

  // Recompute scale based on content vs available space
  const recompute = () => {
    const wrapper = wrapperRef.current;
    const content = contentRef.current;
    if (!wrapper || !content) return;

    const wrapperRect = wrapper.getBoundingClientRect();

    // Available width is wrapper width minus horizontal padding
    const availableW = Math.max(0, wrapperRect.width - viewportPadding * 2);
    // Available height is viewport height from wrapper top minus padding
    const availableH = Math.max(0, window.innerHeight - wrapperRect.top - viewportPadding);

    // Measure intrinsic (untransformed) content size
    // offsetWidth/Height are layout sizes and are not affected by transforms
    const contentW = content.scrollWidth || content.offsetWidth || 0;
    const contentH = content.scrollHeight || content.offsetHeight || 0;

    if (contentW === 0 || contentH === 0 || availableW === 0 || availableH === 0) {
      setScale(1);
      return;
    }

    const scaleW = availableW / contentW;
    const scaleH = availableH / contentH;

    const computed = Math.min(1, scaleW, scaleH);
    const next = computed < 1 ? Math.max(minScale, computed) : 1;

    setScale(next);
  };

  // Resize observers and window events
  useLayoutEffect(() => {
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(recompute);
    };

    const ro = new ResizeObserver(() => schedule());
    if (contentRef.current) ro.observe(contentRef.current);
    if (wrapperRef.current) ro.observe(wrapperRef.current);

    window.addEventListener("resize", schedule);
    window.addEventListener("orientationchange", schedule);

    schedule(); // initial

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewportPadding, minScale]);

  // Also recompute once after paint to catch fonts/images
  useEffect(() => {
    const t = setTimeout(recompute, 50);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section ref={wrapperRef} className={cn("relative w-full min-w-0 overflow-x-hidden", className)} aria-live="polite">
      <div
        ref={contentRef}
        style={{
          transform: scale < 1 ? `scale(${scale})` : undefined,
          transformOrigin: "top center",
        }}
        className="origin-top will-change-transform max-w-full"
      >
        {children}
      </div>
    </section>
  );
}

export default AutoScaleSection;
