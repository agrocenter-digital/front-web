"use client";

import { useEffect } from "react";

/** Progressive enhancement: content stays visible without JS or observer support. */
export function useScrollReveal(pathname: string) {
  useEffect(() => {
    if (pathname !== "/" || !("IntersectionObserver" in window)) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const elements = Array.from(document.querySelectorAll<HTMLElement>(
      ".about-section > div, #productos, #soluciones, .contact-section > div",
    ));
    const reveal = (element: HTMLElement) => {
      element.classList.remove("reveal-pending");
    };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const element = entry.target as HTMLElement;
        // Never hide a focused form/control. Reset only beyond the viewport buffer.
        const keepVisible = entry.isIntersecting || motion.matches || element.contains(document.activeElement);
        element.classList.toggle("reveal-pending", !keepVisible);
      });
    }, { threshold: 0, rootMargin: "32px 0px 32px 0px" });
    const observe = () => {
      observer.disconnect();
      elements.forEach((element, index) => {
        element.dataset.reveal = index % 2 ? "right" : "left";
        const bounds = element.getBoundingClientRect();
        const outside = bounds.top > window.innerHeight + 32 || bounds.bottom < -32;
        element.classList.toggle("reveal-pending", !motion.matches && outside && !element.contains(document.activeElement));
        if (!motion.matches) observer.observe(element);
      });
    };
    observe();
    const onMotion = observe;
    const onFocus = (event: FocusEvent) => {
      if (!(event.target instanceof Element)) return;
      const element = event.target.closest<HTMLElement>("[data-reveal]");
      if (element) reveal(element);
    };
    motion.addEventListener("change", onMotion);
    document.addEventListener("focusin", onFocus);
    return () => {
      observer.disconnect();
      motion.removeEventListener("change", onMotion);
      document.removeEventListener("focusin", onFocus);
      elements.forEach((element) => {
        element.classList.remove("reveal-pending");
        delete element.dataset.reveal;
      });
    };
  }, [pathname]);
}
