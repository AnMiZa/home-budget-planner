import { useEffect, useState } from "react";

export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return false;
    }

    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
      const mediaQueryList = window.matchMedia(query);

      const updateMatches = (event: MediaQueryListEvent) => {
        setMatches(event.matches);
      };

      setMatches(mediaQueryList.matches);
      mediaQueryList.addEventListener("change", updateMatches);

      return () => {
        mediaQueryList.removeEventListener("change", updateMatches);
      };
    }

    return undefined;
  }, [query]);

  return matches;
};
