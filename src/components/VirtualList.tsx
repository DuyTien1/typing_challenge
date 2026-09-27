import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useImperativeHandle,
  forwardRef,
  useMemo,
} from 'react';

export interface VirtualListHandle {
  scrollToIndex: (index: number, behavior?: ScrollBehavior) => void;
  scrollToTop: (behavior?: ScrollBehavior) => void;
  getContainer: () => HTMLDivElement | null;
}

export interface VirtualListProps<T> {
  ref?: React.Ref<VirtualListHandle>;
  items: T[];
  estimateItemHeight: number;
  renderItem: (item: T, index: number, isScrolling: boolean) => React.ReactNode;
  keyExtractor?: (item: T, index: number) => string;
  overscan?: number;
  className?: string;
  style?: React.CSSProperties;
  emptyComponent?: React.ReactNode;
  headerComponent?: React.ReactNode;
  footerComponent?: React.ReactNode;
  gap?: number;
}

function VirtualListInner<T>(
  props: VirtualListProps<T>,
  ref: React.Ref<VirtualListHandle>
) {
  const {
    items,
    estimateItemHeight,
    renderItem,
    keyExtractor = (_, idx) => String(idx),
    overscan = 4,
    className = '',
    style,
    emptyComponent,
    headerComponent,
    footerComponent,
    gap = 0,
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(500);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<number | null>(null);

  // Height cache for measured dynamic items
  const heightCache = useRef<Record<number, number>>({});
  const itemElementsRef = useRef<Map<number, HTMLDivElement>>(new Map());

  // Observe container size
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateHeight = () => {
      if (el) {
        setViewportHeight(el.clientHeight || 500);
      }
    };

    updateHeight();

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === el) {
          setViewportHeight(entry.contentRect.height || el.clientHeight || 500);
        }
      }
    });

    resizeObserver.observe(el);
    return () => resizeObserver.disconnect();
  }, []);

  // Handle scroll events with requestAnimationFrame for 60-120fps performance
  const rAFRef = useRef<number | null>(null);
  const handleScroll = useCallback(() => {
    if (rAFRef.current !== null) return;

    rAFRef.current = requestAnimationFrame(() => {
      rAFRef.current = null;
      if (containerRef.current) {
        setScrollTop(containerRef.current.scrollTop);
      }
    });

    setIsScrolling(true);
    if (scrollTimeoutRef.current !== null) {
      window.clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = window.setTimeout(() => {
      setIsScrolling(false);
    }, 150);
  }, []);

  useEffect(() => {
    return () => {
      if (rAFRef.current !== null) cancelAnimationFrame(rAFRef.current);
      if (scrollTimeoutRef.current !== null) clearTimeout(scrollTimeoutRef.current);
    };
  }, []);

  // Compute item heights & prefix offsets
  const { offsets, totalHeight } = useMemo(() => {
    const count = items.length;
    const offsetsArr = new Float64Array(count);
    let currentOffset = 0;

    for (let i = 0; i < count; i++) {
      offsetsArr[i] = currentOffset;
      const h = heightCache.current[i] ?? estimateItemHeight;
      currentOffset += h + (i < count - 1 ? gap : 0);
    }

    return {
      offsets: offsetsArr,
      totalHeight: currentOffset,
    };
  }, [items.length, estimateItemHeight, gap, scrollTop]); // re-evaluates when items change or scroll measures

  // Measure rendered items and update height cache
  const measureItem = useCallback(
    (index: number, el: HTMLDivElement | null) => {
      if (!el) {
        itemElementsRef.current.delete(index);
        return;
      }
      itemElementsRef.current.set(index, el);
      const measuredH = el.getBoundingClientRect().height;
      if (measuredH > 0 && Math.abs((heightCache.current[index] || 0) - measuredH) > 1) {
        heightCache.current[index] = measuredH;
      }
    },
    []
  );

  // Binary search for visible start index
  const startIndex = useMemo(() => {
    const count = items.length;
    if (count === 0) return 0;

    let low = 0;
    let high = count - 1;
    let found = 0;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const itemTop = offsets[mid];
      const itemH = heightCache.current[mid] ?? estimateItemHeight;
      const itemBottom = itemTop + itemH;

      if (itemBottom >= scrollTop) {
        found = mid;
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    }

    return Math.max(0, found - overscan);
  }, [items.length, offsets, scrollTop, estimateItemHeight, overscan]);

  // Find visible end index
  const endIndex = useMemo(() => {
    const count = items.length;
    if (count === 0) return 0;

    const viewportBottom = scrollTop + viewportHeight;
    let idx = startIndex;

    while (idx < count) {
      const itemTop = offsets[idx];
      if (itemTop > viewportBottom) {
        break;
      }
      idx++;
    }

    return Math.min(count - 1, idx + overscan);
  }, [items.length, startIndex, offsets, scrollTop, viewportHeight, overscan]);

  // Exposed Imperative Methods
  useImperativeHandle(
    ref,
    () => ({
      scrollToIndex: (index: number, behavior: ScrollBehavior = 'smooth') => {
        if (!containerRef.current || index < 0 || index >= items.length) return;
        const targetOffset = offsets[index] || 0;
        containerRef.current.scrollTo({
          top: Math.max(0, targetOffset - 40), // slight padding from top for comfort
          behavior,
        });
      },
      scrollToTop: (behavior: ScrollBehavior = 'smooth') => {
        if (!containerRef.current) return;
        containerRef.current.scrollTo({ top: 0, behavior });
      },
      getContainer: () => containerRef.current,
    }),
    [items.length, offsets]
  );

  if (items.length === 0) {
    return (
      <div ref={containerRef} className={className} style={style}>
        {headerComponent}
        {emptyComponent}
        {footerComponent}
      </div>
    );
  }

  // Calculate spacer heights
  const paddingTop = offsets[startIndex] || 0;
  const lastRenderedBottom =
    (offsets[endIndex] || 0) + (heightCache.current[endIndex] ?? estimateItemHeight);
  const paddingBottom = Math.max(0, totalHeight - lastRenderedBottom);

  const visibleItems = items.slice(startIndex, endIndex + 1);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={`overflow-y-auto will-change-scroll ${className}`}
      style={style}
    >
      {headerComponent}

      <div
        style={{
          paddingTop: `${paddingTop}px`,
          paddingBottom: `${paddingBottom}px`,
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: `${gap}px` }}>
          {visibleItems.map((item, localIdx) => {
            const globalIndex = startIndex + localIdx;
            const key = keyExtractor(item, globalIndex);

            return (
              <div
                key={key}
                ref={(el) => measureItem(globalIndex, el)}
                data-virtual-index={globalIndex}
              >
                {renderItem(item, globalIndex, isScrolling)}
              </div>
            );
          })}
        </div>
      </div>

      {footerComponent}
    </div>
  );
}

export function VirtualList<T>(props: VirtualListProps<T>): React.ReactElement {
  return VirtualListInner(props, props.ref ?? null);
}
