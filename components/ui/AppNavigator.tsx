import { router } from "expo-router";

/**
 * Centralized navigation helper for the app.
 * Keeps routing logic out of screens and components.
 */
export const AppNavigator = {
  /* ===============================
     Songs
     =============================== */

  goToSongList(lang: "en" | "sw" | "luo") {
    router.push({
      pathname: "/(tabs)/songs",
      params: { lang },
    });
  },

  goToSongDetails(params: {
    id: string;
    lang: "en" | "sw" | "luo";
  }) {
    router.push({
      pathname: "/song/[id]",
      params,
    });
  },

  /* ===============================
     Navigation controls
     =============================== */

  back() {
    router.back();
  },

  replaceToHome() {
    router.replace("/");
  },
};
