import React, { useEffect, useRef, useState } from "react";

export function useAnimatedCounter(
  target: number,
  duration = 1200,
  suffix = "",
) {
  const [display, setDisplay] = useState("0");
  const started = useRef(false);
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || started.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || started.current) return;
        started.current = true;

        const start = performance.now();
        const tick = (now: number) => {
          const progress = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          const value = Math.round(eased * target);
          setDisplay(`${value}${suffix}`);
          if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.3 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration, suffix]);

  return { ref, display };
}

interface AnimatedStatProps {
  value: number;
  suffix?: string;
  className?: string;
}

export const AnimatedStat: React.FC<AnimatedStatProps> = ({
  value,
  suffix = "+",
  className = "hal-image-with-tiles-headline hal-counter",
}) => {
  const { ref, display } = useAnimatedCounter(value, 1200, suffix);
  return (
    <p ref={ref} className={className}>
      {display}
    </p>
  );
};
