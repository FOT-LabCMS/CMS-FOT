import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant",
    });

    // Cleanly kill any active camera video tracks when navigating between routes
    try {
      document.querySelectorAll("video").forEach((video) => {
        if (video.srcObject && typeof video.srcObject.getTracks === "function") {
          video.srcObject.getTracks().forEach((track) => track.stop());
          video.srcObject = null;
        }
      });
    } catch {
      // ignore
    }
  }, [pathname]);

  return null;
};

export default ScrollToTop;
