import { Directory, File, Paths } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";

import { ensureAdminModeEnabled } from "@/src/admin/adminAccess";
import { db } from "@/src/db/database";

const ABOUT_PAGE_KEY = "about-page-v1";
const DEFAULT_IMAGE_ID = "bundled-byron";

export type AboutGalleryImage = {
  id: string;
  uri: string;
};

export type AboutPageContent = {
  story: string;
  primaryImageUri: string | null;
  gallery: AboutGalleryImage[];
};

export const DEFAULT_ABOUT_STORY = `

Advent Pro was born from a problem I personally experienced.

When I was younger and sincerely searching for truth, one of the greatest challenges I faced was finding the right resources in one place. The information was there, but it was scattered everywhere.

I could go to YouTube and find valuable truth, but alongside it were distractions, conflicting teachings, and resources from sources I did not always know whether to trust. Facebook was the same. TikTok, websites, and other platforms presented a mixture of many voices.

The difficulty was not simply finding information. The difficulty was knowing what to trust and where to begin.

Sometimes what I needed most was not another platform with endless content, but a focused environment where I could study Scripture, discover valuable Present Truth resources, and continue learning without constantly sorting through everything else.

Finding someone to guide me was not always easy either.

But by God's grace, He guided my steps. Along the way, I discovered books, sermons, studies, hymns, messages, and faithful people whose work helped me understand more clearly the truths I was searching for.

That experience stayed with me.

Eventually, a question began to trouble my mind: What about the young or old person somewhere today who is facing the same problem I faced?

What about someone who sincerely wants to know the truth but does not know where to begin? What about the person searching through hundreds of videos, posts, websites, and opinions, simply trying to find something trustworthy to study?

That is one of the reasons I decided to build Advent Pro.

Why Advent Pro Exists

Advent Pro is being built as a focused digital hub for Present Truth resources — bringing together Bible studies, hymns, sermons, videos, historical materials, devotional resources, and other useful content into one accessible place.

I am not building Advent Pro on the assumption that we already have everything right or that everything currently inside the app is perfect. This is a growing work. I am still learning too.

As understanding increases and the platform develops, some resources I once considered useful may need to be corrected, improved, replaced, or even removed. Other valuable materials will be added as they are discovered and carefully considered.

That is why your feedback matters. Do not use Advent Pro silently. Tell me what helped you. Tell me what could be improved. Recommend resources. Point out something that deserves another examination. Suggest features that could make studying easier.

While you are using Advent Pro, you are also helping me build a better Advent Pro for the person who will discover it tomorrow.

About Offline Access

I do not promise that 100% of Advent Pro will always be available offline. As the library grows to include more studies, sermons, books, videos, audio, hymns, and other resources, forcing everything onto every device would eventually make the application unnecessarily large and heavy.

Instead, the goal is to increasingly allow you to keep the resources that are most valuable to you available offline whenever technically possible. You should not have to carry the entire Advent Pro library on your phone just to keep the few studies, hymns, or resources that have become important to you.

This approach allows the platform to continue growing while remaining practical for everyday use.

About the Monthly Support Request

While using Advent Pro, you may occasionally see an invitation asking you to support the work financially. This request appears only once in a month. It does not lock anything, reduce your access, or create a subscription.

You are completely free to choose “Remind Me Later,” continue using Advent Pro, and return to support the work whenever you are ready and able. Present Truth resources are not behind a paywall. Whether you donate or not, I want you to continue benefiting from the resources available in Advent Pro.

Servers have to be maintained. Infrastructure has costs. Development takes resources. Content has to be organized, stored, improved, and delivered. Your contribution is voluntary, but it helps meet the costs necessary to keep building.

This Mission Needs More Than Money

Financial support is only one way to participate. Pray for the work. Share Advent Pro. Send feedback and words of encouragement. Contribute what God has given you.

An Invitation to Preachers, Writers, Developers and Content Creators

I do not want Advent Pro to become a platform built around one person. If you are a Present Truth preacher, Bible teacher, evangelist, writer, researcher, musician, developer, designer, translator, or content creator, and you believe you have something that could genuinely bless others, I invite you to get in touch.

You may have something I do not have. You may understand something I have not yet understood. You may possess a skill that can solve a problem I cannot solve alone. And somewhere there may be someone waiting for the very resource God has placed in your hands.

The Hope Behind It All

Advent Pro is more than an application to me. It is an attempt to make the road a little clearer for someone searching today.

My hope is simple: that Advent Pro may become the resource I wish I had when I was younger and searching — a place where another sincere seeker can find valuable resources without having to wander as widely as some of us had to wander.

If this platform grows, I do not want its success to be measured merely by downloads, users, features, or numbers. I want it measured by usefulness.

Advent Pro is only a tool. May everything truly useful within it ultimately point beyond the app, beyond its developer, beyond every preacher and contributor, and back to God, His Word, and the everlasting gospel.

— Byron Onyango
Engineer, Advent Pro
Present Truth Advocate`;

const DEFAULT_CONTENT: AboutPageContent = { story: DEFAULT_ABOUT_STORY, primaryImageUri: null, gallery: [] };

function normalize(value: unknown): AboutPageContent {
  if (!value || typeof value !== "object") return DEFAULT_CONTENT;
  const candidate = value as Partial<AboutPageContent>;
  return {
    story: typeof candidate.story === "string" && candidate.story.trim() ? candidate.story.trim() : DEFAULT_ABOUT_STORY,
    primaryImageUri: typeof candidate.primaryImageUri === "string" && candidate.primaryImageUri.length > 0 ? candidate.primaryImageUri : null,
    gallery: Array.isArray(candidate.gallery)
      ? candidate.gallery.filter((item): item is AboutGalleryImage => Boolean(item && typeof item.id === "string" && typeof item.uri === "string" && item.uri.length > 0))
      : [],
  };
}

export async function getAboutPageContent(): Promise<AboutPageContent> {
  const row = await db.getFirstAsync<{ value: string }>("SELECT value FROM app_page_content WHERE pageKey=? LIMIT 1", [ABOUT_PAGE_KEY]);
  if (!row?.value) return DEFAULT_CONTENT;
  try { return normalize(JSON.parse(row.value)); } catch { return DEFAULT_CONTENT; }
}

export async function saveAboutPageContent(content: AboutPageContent): Promise<void> {
  await ensureAdminModeEnabled();
  const normalized = normalize(content);
  await db.runAsync(
    `INSERT INTO app_page_content(pageKey,value,updatedAt) VALUES(?,?,?)
     ON CONFLICT(pageKey) DO UPDATE SET value=excluded.value,updatedAt=excluded.updatedAt`,
    [ABOUT_PAGE_KEY, JSON.stringify(normalized), Date.now()]
  );
}

function extensionFromUri(uri: string, mimeType: string | null | undefined) {
  if (mimeType?.includes("png")) return "png";
  if (mimeType?.includes("webp")) return "webp";
  const match = uri.match(/\.([a-zA-Z0-9]{2,5})(?:\?|$)/);
  return match?.[1]?.toLowerCase() || "jpg";
}

function imageId() {
  return `about-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function chooseAboutGalleryImages(): Promise<AboutGalleryImage[]> {
  await ensureAdminModeEnabled();
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error("Allow photo-library access to add gallery images.");

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsMultipleSelection: true,
    selectionLimit: 0,
    allowsEditing: false,
    quality: 1,
    orderedSelection: true,
  });
  if (result.canceled) return [];

  const directory = new Directory(Paths.document, "about-gallery");
  directory.create({ idempotent: true, intermediates: true });
  const additions: AboutGalleryImage[] = [];
  for (const asset of result.assets) {
    const id = imageId();
    const destination = new File(directory, `${id}.${extensionFromUri(asset.uri, asset.mimeType)}`);
    destination.create({ overwrite: true, intermediates: true });
    destination.write(await new File(asset.uri).bytes());
    additions.push({ id, uri: destination.uri });
  }
  return additions;
}

export async function chooseAboutPrimaryImage(): Promise<AboutGalleryImage | null> {
  await ensureAdminModeEnabled();
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error("Allow photo-library access to change the main image.");
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: false, quality: 1 });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  const directory = new Directory(Paths.document, "about-gallery");
  directory.create({ idempotent: true, intermediates: true });
  const id = imageId();
  const destination = new File(directory, `${id}.${extensionFromUri(asset.uri, asset.mimeType)}`);
  destination.create({ overwrite: true, intermediates: true });
  destination.write(await new File(asset.uri).bytes());
  return { id, uri: destination.uri };
}

export async function removeAboutGalleryImage(image: AboutGalleryImage): Promise<void> {
  await ensureAdminModeEnabled();
  if (image.id === DEFAULT_IMAGE_ID) throw new Error("The bundled Byron Onyango image is the default gallery image and cannot be removed.");
  const file = new File(image.uri);
  if (file.exists) file.delete();
}
