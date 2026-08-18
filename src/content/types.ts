/**
 * Shared content-layer contracts.
 *
 * `ContentSource` is the single seam through which content reaches the local SQLite
 * cache. A source can be the bundled starter set (`localSource`) or a remote CDN
 * (`remoteSource`). New collections (songs, studies, bible, …) and new delivery
 * mechanisms slot in behind this interface without touching UI code.
 */

export type CollectionKey = "songs" | "studies" | "bible";

/** One entry in the remote content manifest. */
export type ManifestCollection = {
  key: CollectionKey | string;
  /** Opaque version/hash; a change here means "re-sync this collection". */
  version: string;
  /** Path (relative to baseUrl) of the shard or shard index for this collection. */
  path: string;
  /** Optional human label. */
  title?: string;
};

export type ContentManifest = {
  /** Manifest schema version. */
  schema: number;
  /** When the manifest was generated (epoch ms). */
  generatedAt: number;
  collections: ManifestCollection[];
};

/** Progress callback for long-running syncs/installs. */
export type ProgressFn = (done: number, total: number, label?: string) => void;

export interface ContentSource {
  readonly id: string;
  /** True when this source can currently serve content. */
  isAvailable(): boolean | Promise<boolean>;
}
