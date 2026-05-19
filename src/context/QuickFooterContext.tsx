import React, { createContext, useCallback, useContext, useRef, useState } from "react";

type QuickFooterContextValue = {
  visible: boolean;
  reportScroll: (offsetY: number) => void;
  reset: () => void;
};

const QuickFooterContext = createContext<QuickFooterContextValue | null>(null);

export function QuickFooterProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(true);
  const lastOffsetRef = useRef(0);

  const reportScroll = useCallback((offsetY: number) => {
    const offset = Number.isFinite(offsetY) ? offsetY : 0;

    if (offset <= 24) {
      lastOffsetRef.current = offset;
      setVisible(true);
      return;
    }

    const delta = offset - lastOffsetRef.current;
    if (delta > 16) {
      setVisible(false);
    } else if (delta < -16) {
      setVisible(true);
    }

    lastOffsetRef.current = offset;
  }, []);

  const reset = useCallback(() => {
    lastOffsetRef.current = 0;
    setVisible(true);
  }, []);

  return (
    <QuickFooterContext.Provider value={{ visible, reportScroll, reset }}>
      {children}
    </QuickFooterContext.Provider>
  );
}

export function useQuickFooter() {
  const ctx = useContext(QuickFooterContext);
  if (!ctx) {
    throw new Error("useQuickFooter must be used inside QuickFooterProvider");
  }
  return ctx;
}
