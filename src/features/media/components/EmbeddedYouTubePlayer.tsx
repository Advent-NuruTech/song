import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import YoutubePlayer, { PLAYER_STATES } from "react-native-youtube-iframe";

import { recordMediaView } from "../mediaService";
import type { MediaItem } from "../types";

export function EmbeddedYouTubePlayer({
  item,
  active = true,
  height,
  onViewCount,
}: {
  item: MediaItem;
  active?: boolean;
  height: number;
  onViewCount?: (value: number) => void;
}) {
  const [playing, setPlaying] = useState(active);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordedRef = useRef(false);

  useEffect(() => {
    setPlaying(active);
    if (!active && timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, [active]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const scheduleView = () => {
    if (recordedRef.current || timerRef.current) return;
    const threshold = item.mediaType === "short" ? 3 : 5;
    timerRef.current = setTimeout(() => {
      recordedRef.current = true;
      timerRef.current = null;
      void recordMediaView(item.id, threshold)
        .then((result) => onViewCount?.(result.viewCount))
        .catch(() => undefined);
    }, threshold * 1000);
  };

  if (failed) return <View style={[styles.wrap, styles.failed, { height }]}><Text style={styles.failedTitle}>Playback unavailable</Text><Text style={styles.failedBody}>Check your connection or try again later.</Text></View>;

  return (
    <View style={[styles.wrap, { height }]}>
      {!ready && <ActivityIndicator color="#fff" style={StyleSheet.absoluteFill} />}
      <YoutubePlayer
        height={height}
        videoId={item.youtubeVideoId}
        play={playing && active}
        onReady={() => setReady(true)}
        onError={() => setFailed(true)}
        onChangeState={(state: PLAYER_STATES) => {
          if (state === PLAYER_STATES.PLAYING) { setPlaying(true); scheduleView(); }
          if (state === PLAYER_STATES.PAUSED || state === PLAYER_STATES.ENDED) {
            setPlaying(false);
            if (!recordedRef.current && timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
          }
        }}
        webViewProps={{
          allowsFullscreenVideo: true,
          mediaPlaybackRequiresUserAction: false,
          androidLayerType: "hardware",
        }}
        initialPlayerParams={{ controls: true, modestbranding: true, rel: false }}
      />
    </View>
  );
}

const styles = StyleSheet.create({ wrap: { width: "100%", backgroundColor: "#000", overflow: "hidden" }, failed: { alignItems: "center", justifyContent: "center", padding: 24 }, failedTitle: { color: "#fff", fontSize: 17, fontWeight: "800" }, failedBody: { color: "rgba(255,255,255,.7)", fontSize: 12, marginTop: 5, textAlign: "center" } });
