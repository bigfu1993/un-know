/** 滚动字幕方向。 */
export type ScrollingTickerDirection = "horizontal" | "vertical";

/** 滚动字幕组件属性。 */
export interface ScrollingTickerProps {
  ariaLabel?: string;
  className?: string;
  direction?: ScrollingTickerDirection;
  items: string[];
  speed?: number;
}

/** 单行滚动字幕组件，默认横向滚动。 */
export function ScrollingTicker({
  ariaLabel = "滚动字幕",
  className = "",
  direction = "horizontal",
  items,
  speed = 3000
}: ScrollingTickerProps) {
  const normalizedItems = useMemo(() => items.map((item) => item.trim()).filter(Boolean), [items]);
  const [activeIndex, setActiveIndex] = useState(0);
  const isVertical = direction === "vertical";

  useEffect(() => {
    if (!isVertical || normalizedItems.length <= 1) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % normalizedItems.length);
    }, speed);

    return () => window.clearInterval(timer);
  }, [isVertical, normalizedItems.length, speed]);

  useEffect(() => {
    setActiveIndex(0);
  }, [normalizedItems.length]);

  if (normalizedItems.length === 0) {
    return null;
  }

  return (
    <div
      aria-label={ariaLabel}
      className={`scrolling-ticker scrolling-ticker--${direction} ${className}`}
      role="status"
      style={
        {
          "--ticker-duration": `${Math.max(speed, 1000) * Math.max(normalizedItems.length, 1)}ms`,
          "--ticker-speed": `${Math.max(speed, 1000)}ms`
        } as CSSProperties
      }
    >
      <div
        className="scrolling-ticker-track"
        style={isVertical ? { transform: `translateY(-${activeIndex * 100}%)` } : undefined}
      >
        {normalizedItems.map((item) => (
          <span className="scrolling-ticker-item" key={item}>
            {item}
          </span>
        ))}
        {!isVertical ? (
          normalizedItems.map((item) => (
            <span className="scrolling-ticker-item" key={`${item}-copy`} aria-hidden="true">
              {item}
            </span>
          ))
        ) : null}
      </div>
    </div>
  );
}
