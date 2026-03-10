import * as React from "react";

export function useMediaQuery(query: string) {
  const [matches, setMatches] = React.useState<boolean>(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const updateMatches = () => {
      setMatches(mediaQuery.matches);
    };

    // Initial check
    updateMatches();

    // Add listener
    mediaQuery.addEventListener("change", updateMatches);

    // Clean up
    return () => {
      mediaQuery.removeEventListener("change", updateMatches);
    };
  }, [query]);

  return matches;
}

// Helper function specifically for detecting mobile devices
export function useIsMobile() {
  return useMediaQuery("(max-width: 768px)");
}

// Adding default export for more flexibility
export default useMediaQuery;
