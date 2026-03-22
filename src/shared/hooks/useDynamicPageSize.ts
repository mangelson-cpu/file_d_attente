import { useState, useEffect, useCallback } from "react";

export function useDynamicPageSize(
  tableContainerRef: React.RefObject<HTMLElement | null>,
  totalItems: number,
  rowHeight = 60,
  headerHeight = 56,
  minItems = 3,
) {
  const [itemsPerPage, setItemsPerPage] = useState(totalItems || 50);

  const calculatePageSize = useCallback(() => {
    const container = tableContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const viewportHeight = window.innerHeight;

    const paginationFooterHeight = 64;
    const bottomPadding = 64;

    const availableHeight =
      viewportHeight -
      rect.top -
      headerHeight -
      paginationFooterHeight -
      bottomPadding;

    const calculated = Math.floor(availableHeight / rowHeight);
    const maxPossibleItems = Math.max(minItems, calculated);

    setItemsPerPage(maxPossibleItems);
  }, [tableContainerRef, headerHeight, rowHeight, minItems]);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        calculatePageSize();
      }, 50);
    };

    calculatePageSize();
    window.addEventListener("resize", handleResize);

    const observer = new ResizeObserver(() => {
      handleResize();
    });

    if (tableContainerRef.current) {
      observer.observe(document.body);
    }

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("resize", handleResize);
      observer.disconnect();
    };
  }, [calculatePageSize, tableContainerRef]);

  useEffect(() => {
    const timer = setTimeout(calculatePageSize, 100);
    return () => clearTimeout(timer);
  }, [totalItems, calculatePageSize]);

  const needsPagination = totalItems > itemsPerPage;

  const effectiveItemsPerPage = needsPagination ? itemsPerPage : totalItems;

  return { itemsPerPage: effectiveItemsPerPage, needsPagination };
}
