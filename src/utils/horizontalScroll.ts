/**
 * FASTTYPING - TU TIÊN ĐẠO
 * Global Horizontal Mouse Wheel Scroll Helper
 * Tự động chuyển đổi cuộn chuột dọc (wheel deltaY) thành cuộn ngang (scrollLeft)
 * cho toàn bộ các thanh tab, danh sách huy hiệu, bảng và vùng cuộn ngang (overflow-x-auto) trên website.
 */

export function initGlobalHorizontalWheelScroll(): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleWheel = (e: WheelEvent) => {
    // Nếu không có cuộn dọc hoặc người dùng đang vuốt ngang tự nhiên bằng Touchpad (deltaX lớn hơn deltaY), bỏ qua
    if (e.deltaY === 0 || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      return;
    }

    let el = e.target as HTMLElement | null;

    // Không can thiệp nếu đang thao tác trong textarea hoặc vùng soạn thảo
    if (el && (el.tagName === 'TEXTAREA' || el.isContentEditable)) {
      return;
    }

    // Duyệt ngược lên từ phần tử mục tiêu để tìm phần tử cha gần nhất có khả năng cuộn ngang
    while (el && el !== document.body && el !== document.documentElement) {
      const scrollRange = el.scrollWidth - el.clientWidth;

      if (scrollRange > 2) {
        const style = window.getComputedStyle(el);
        const overflowX = style.overflowX;
        const isScrollableX = overflowX === 'auto' || overflowX === 'scroll';

        // Xác định phần tử ưu tiên cuộn ngang (Hàng tab, thanh điều hướng, dải nút, thanh filter)
        // 1. Chênh lệch chiều cao cuộn dọc rất nhỏ (<= 40px)
        // 2. Hoặc overflow-y là hidden/clip
        // 3. Hoặc chứa class overflow-x-auto / custom-scrollbar
        const verticalOverflow = el.scrollHeight - el.clientHeight;
        const classNameStr = typeof el.className === 'string' ? el.className : '';
        const isExplicitHorizontal =
          classNameStr.includes('overflow-x-') ||
          classNameStr.includes('scrollbar-') ||
          style.flexWrap === 'nowrap' ||
          style.whiteSpace === 'nowrap';

        const isHorizontalContainer =
          isScrollableX && (verticalOverflow <= 45 || style.overflowY === 'hidden' || isExplicitHorizontal);

        if (isHorizontalContainer) {
          const delta = e.deltaY;
          const canScrollRight = delta > 0 && el.scrollLeft < scrollRange - 0.5;
          const canScrollLeft = delta < 0 && el.scrollLeft > 0.5;

          if (canScrollRight) {
            el.scrollLeft = Math.min(scrollRange, el.scrollLeft + delta);
            e.preventDefault();
            return;
          } else if (canScrollLeft) {
            el.scrollLeft = Math.max(0, el.scrollLeft + delta);
            e.preventDefault();
            return;
          } else {
            // Đã chạm biên nhưng chuột vẫn đang nằm trực tiếp trên thanh tab ngang
            // Chặn cuộn dọc của modal để giao diện không bị giật
            e.preventDefault();
            return;
          }
        }
      }

      el = el.parentElement;
    }
  };

  window.addEventListener('wheel', handleWheel, { passive: false });

  return () => {
    window.removeEventListener('wheel', handleWheel);
  };
}
