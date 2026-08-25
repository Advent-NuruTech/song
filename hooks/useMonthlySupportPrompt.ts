import AsyncStorage from "@react-native-async-storage/async-storage";
import { isSupportPromptContentRoute, supportMonthKey } from "@/src/services/donations/supportPromptPolicy";
import { useEffect, useRef, useState } from "react";

const LAST_SEEN_KEY = "support_prompt_last_seen";
const PROMPT_DELAY_MS = 12_000;

export function useMonthlySupportPrompt(pathname: string) {
  const [visible, setVisible] = useState(false);
  const checking = useRef(false);

  useEffect(() => {
    if (!isSupportPromptContentRoute(pathname) || checking.current || visible) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    checking.current = true;

    void AsyncStorage.getItem(LAST_SEEN_KEY)
      .then((lastSeen) => {
        if (cancelled || lastSeen === supportMonthKey()) return;
        timer = setTimeout(() => {
          if (cancelled) return;
          const month = supportMonthKey();
          // Mark the invitation as shown before rendering it. A crash cannot cause repeated prompts.
          void AsyncStorage.setItem(LAST_SEEN_KEY, month).then(() => {
            if (!cancelled) setVisible(true);
          });
        }, PROMPT_DELAY_MS);
      })
      .finally(() => {
        checking.current = false;
      });

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      checking.current = false;
    };
  }, [pathname, visible]);

  return {
    visible,
    dismiss: () => setVisible(false),
  };
}
