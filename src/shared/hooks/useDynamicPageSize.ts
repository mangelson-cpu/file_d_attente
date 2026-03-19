import { useState, useEffect, useCallback } from "react";

export function useDynamicPageSize(
  tableContainerRef: React.RefObject<HTMLElement | null>,
  totalItems: number,
  rowHeight = 60,     // Augmenté pour éviter de sous-estimer la hauteur d'une ligne
  headerHeight = 56,  // Hauteur de l'entête du tableau avec bordures/padding
  minItems = 3,
) {
  const [itemsPerPage, setItemsPerPage] = useState(totalItems || 50);

  const calculatePageSize = useCallback(() => {
    const container = tableContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const viewportHeight = window.innerHeight;

    // Estimation de la marge nécessaire en bas de l'écran (pagination, padding, etc.)
    const paginationFooterHeight = 64; 
    const bottomPadding = 64; // Augmenté pour laisser respirer et garantir aucun scroll
    
    // La hauteur disponible réelle est celle de la fenêtre moins la position du conteneur,
    // garantissant qu'on ne dépasse jamais la fenêtre.
    const availableHeight = viewportHeight - rect.top - headerHeight - paginationFooterHeight - bottomPadding;

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
      }, 50); // Petit debounce pour des redimensionnements fluides
    };

    calculatePageSize();
    window.addEventListener("resize", handleResize);

    // Un MutationObserver peut aussi aider si la position du top change 
    // à cause du chargement d'autres éléments.
    const observer = new ResizeObserver(() => {
      handleResize();
    });

    if (tableContainerRef.current) {
      observer.observe(document.body); // Observer le body pour détecter tout changement de layout
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

  // Si on a la place pour afficher tous les éléments, on le fait, sinon on pagine.
  // Exception : si maxPossibleItems >= totalItems, on affiche tout et needPagination = false
  const needsPagination = totalItems > itemsPerPage;

  // On retourne une version ajustée de itemsPerPage:
  // Si on n'a pas besoin de pagination, on peut juste dire qu'on affiche *tous* les items
  // Cela évite de couper la liste si on a 10 items et que l'écran peut en afficher 10 (mais le calcul donne exactement 10)
  const effectiveItemsPerPage = needsPagination ? itemsPerPage : totalItems;

  return { itemsPerPage: effectiveItemsPerPage, needsPagination };
}
