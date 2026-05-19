import { Share } from "react-native";

const APP_NAME = "Advent Pro";
const DOWNLOAD_URL = "https://play.google.com/store/apps/details?id=com.adventpro";

function buildDownloadBlock() {
  return [
    `Download ${APP_NAME}:`,
    DOWNLOAD_URL,
  ].join("\n");
}

async function shareMessage(message: string, title: string) {
  try {
    await Share.share({
      title,
      message,
    });
  } catch (error) {
    console.error("Share failed:", error);
  }
}

export async function shareApp() {
  const message = [
    "Discover Advent Pro: songs, hymns, and Bible studies in one place.",
    "",
    buildDownloadBlock(),
  ].join("\n");

  await shareMessage(message, `${APP_NAME} App`);
}

export async function shareStudy(params: {
  title: string;
  category?: string | null;
  author?: string | null;
}) {
  const { title, category, author } = params;
  const meta = [category, author ? `by ${author}` : null].filter(Boolean).join(" - ");
  const message = [
    `I'm reading "${title}" on ${APP_NAME}.`,
    meta ? meta : "",
    "",
    buildDownloadBlock(),
  ]
    .filter(Boolean)
    .join("\n");

  await shareMessage(message, `${APP_NAME} Study`);
}

export async function shareSong(params: {
  title: string;
  hymnNumber?: number | null;
  language?: string | null;
}) {
  const { title, hymnNumber, language } = params;
  const parts = [`"${title}"`];

  if (hymnNumber != null) {
    parts.push(`#${hymnNumber}`);
  }

  if (language) {
    parts.push(language);
  }

  const message = [
    `I'm listening to ${parts.join(" - ")} on ${APP_NAME}.`,
    "",
    buildDownloadBlock(),
  ].join("\n");

  await shareMessage(message, `${APP_NAME} Song`);
}

