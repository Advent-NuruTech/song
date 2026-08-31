import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  isSupportPromptContentRoute,
  isSupportPromptIntroComplete,
  supportMonthKey,
} from "@/src/services/donations/supportPromptPolicy";
import { useEffect, useRef, useState } from "react";

const LAST_SEEN_KEY = "support_prompt_last_seen";
const FIRST_USE_KEY = "support_prompt_first_use_at";
const PROMPT_DELAY_MS = 12_000;

export function useMonthlySupportPrompt(pathname: string) {
  const [visible, setVisible] = useState(false);
  const checking = useRef(false);

  useEffect(() => {
    if (checking.current || visible) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    checking.current = true;

    void AsyncStorage.multiGet([LAST_SEEN_KEY, FIRST_USE_KEY])
      .then(async ([[, lastSeen], [, firstUseAt]]) => {
        if (cancelled) return;

        // Record first use as soon as the app is ready, even if the reader has not
        // visited a content screen yet. This ensures the 21-day grace period is
        // based on owning the app rather than on the first donation-eligible route.
        if (!firstUseAt) {
          await AsyncStorage.setItem(FIRST_USE_KEY, String(Date.now()));
          return;
        }

        // People who have already received an invitation keep the existing monthly
        // cadence when they update. New readers must first have 21 days with the app.
        if (
          !isSupportPromptContentRoute(pathname) ||
          lastSeen === supportMonthKey() ||
          (!lastSeen && !isSupportPromptIntroComplete(firstUseAt))
        ) {
          return;
        }

        timer = setTimeout(() => {
          if (cancelled) return;
          const month = supportMonthKey();
          // Mark the invitation as shown before rendering it. A crash cannot cause repeated prompts.
          void AsyncStorage.setItem(LAST_SEEN_KEY, month).then(() => {
            if (!cancelled) setVisible(true);
          });
        }, PROMPT_DELAY_MS);
      })
      .catch((error) => {
        // A storage failure must never result in a donation invitation appearing early.
        console.warn("Unable to evaluate support invitation schedule:", error);
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
