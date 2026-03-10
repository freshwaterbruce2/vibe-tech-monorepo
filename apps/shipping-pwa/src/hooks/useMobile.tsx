import { useMediaQuery } from "./useMediaQuery";

export function useMobile() {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const isTablet = useMediaQuery("(min-width: 769px) and (max-width: 1024px)");
  const isDesktop = useMediaQuery("(min-width: 1025px)");

  return {
    isMobile,
    isTablet,
    isDesktop,
  };
}

// Also re-export useMediaQuery for backward compatibility
export { useMediaQuery } from "./useMediaQuery";
