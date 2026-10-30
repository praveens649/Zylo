"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Headphones,
  Loader2,
  Music2,
  Pause,
  Play,
  RefreshCw,
  Search,
  SkipBack,
  SkipForward,
  Volume2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AppDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { ApiRequestError } from "@/lib/api";
import {
  musicApi,
  MUSIC_FEATURED_KEY,
  MUSIC_PLANS_KEY,
  MUSIC_SUB_KEY,
  musicSearchKey,
  type MusicPlan,
  type MusicTrack,
} from "@/api/music.api";

const fmtPrice = (price: string | number, currency: string) =>
  `₹${Number(price).toLocaleString("en-IN")}${currency.toLowerCase() === "inr" ? "" : ` ${currency}`}`;

const fmtDuration = (ms: number | null) => {
  if (!ms) return "0:30";
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

const errorMessage = (err: unknown, fallback = "Something went wrong") =>
  err instanceof ApiRequestError ? err.message : fallback;

// ------------------------------------------------------------ plans

function PlanCard({ plan }: { plan: MusicPlan }) {
  const checkout = useMutation({
    mutationFn: () => musicApi.checkout(plan.id),
    onSuccess: (d) => {
      if (d.url) window.location.href = d.url;
      else toast({ title: "Checkout session created", description: `Order ${d.orderId}` });
    },
    onError: (err) => toast({ title: errorMessage(err), variant: "destructive" }),
  });

  const featured = plan.audioQuality === "hd";

  return (
    <Card className={featured ? "border-primary/60 shadow-lg shadow-primary/10" : ""}>
      <CardContent className="flex h-full flex-col gap-3 p-5">
        <div className="flex items-center justify-between">
          <Badge variant={featured ? "default" : "secondary"}>{plan.audioQuality.toUpperCase()}</Badge>
          {featured && <Badge variant="outline" className="text-[10px]">POPULAR</Badge>}
        </div>
        <div>
          <p className="font-display text-lg font-bold">{plan.name}</p>
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{plan.description}</p>
        </div>
        <p className="mt-auto font-display text-3xl font-black text-primary">
          {fmtPrice(plan.price, plan.currency)}
          <span className="text-sm font-normal text-muted-foreground"> /{plan.validityDays} days</span>
        </p>
        <p className="text-xs text-muted-foreground">{plan.maxDevices} device{plan.maxDevices > 1 ? "s" : ""}</p>
        <Button disabled={checkout.isPending} onClick={() => checkout.mutate()} className="w-full">
          {checkout.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
          Subscribe
        </Button>
      </CardContent>
    </Card>
  );
}

// ------------------------------------------------------------ track list

function TrackRow({
  track,
  active,
  playing,
  onPlay,
}: {
  track: MusicTrack;
  active: boolean;
  playing: boolean;
  onPlay: (t: MusicTrack) => void;
}) {
  return (
    <button
      onClick={() => onPlay(track)}
      disabled={!track.previewUrl}
      className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors ${
        active ? "bg-primary/10" : "hover:bg-muted/60"
      } ${!track.previewUrl ? "cursor-default opacity-50" : "cursor-pointer"}`}
    >
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
        {track.artworkUrl ? (
          <img src={track.artworkUrl} alt={track.title} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Music2 className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
          {active && playing ? (
            <Pause className="h-4 w-4 text-white" fill="currentColor" />
          ) : (
            <Play className="h-4 w-4 text-white" fill="currentColor" />
          )}
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm font-medium ${active ? "text-primary" : ""}`}>{track.title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {track.artist}
          {track.album ? ` · ${track.album}` : ""}
        </p>
      </div>
      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{fmtDuration(track.durationMs)}</span>
    </button>
  );
}

// ------------------------------------------------------------ player bar

function PlayerBar({
  queue,
  index,
  onIndex,
  playing,
  setPlaying,
}: {
  queue: MusicTrack[];
  index: number | null;
  onIndex: (i: number) => void;
  playing: boolean;
  setPlaying: (p: boolean) => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [progress, setProgress] = useState({ trackId: "", value: 0 });
  const [volume, setVolume] = useState(0.9);
  const track = index != null ? queue[index] : null;
  // Progress is keyed to the track — switching songs automatically shows 0%.
  const shownProgress = track && progress.trackId === track.id ? progress.value : 0;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !track) return;
    if (playing) {
      void audio.play().catch(() => setPlaying(false));
    } else {
      audio.pause();
    }
  }, [playing, track, setPlaying]);

  if (!track) return null;

  const step = (dir: 1 | -1) => {
    if (index == null) return;
    const next = index + dir;
    if (next >= 0 && next < queue.length) onIndex(next);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur">
      <audio
        key={track.id}
        ref={audioRef}
        src={track.previewUrl ?? undefined}
        onTimeUpdate={(e) => {
          const el = e.currentTarget;
          setProgress({
            trackId: track.id,
            value: el.duration ? el.currentTime / el.duration : 0,
          });
        }}
        onEnded={() => step(1)}
        onPause={() => setPlaying(false)}
      />
      <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
          {track.artworkUrl ? (
            <img src={track.artworkUrl} alt={track.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Music2 className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{track.title}</p>
          <p className="truncate text-xs text-muted-foreground">
            {track.artist} · <span className="text-primary/80">30s preview</span>
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button size="icon" variant="ghost" onClick={() => step(-1)} disabled={!index}>
            <SkipBack className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            className="h-11 w-11 rounded-full"
            onClick={() => setPlaying(!playing)}
            disabled={!track.previewUrl}
          >
            {playing ? <Pause className="h-5 w-5" fill="currentColor" /> : <Play className="ml-0.5 h-5 w-5" fill="currentColor" />}
          </Button>
          <Button size="icon" variant="ghost" onClick={() => step(1)} disabled={index == null || index >= queue.length - 1}>
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>
        <div className="hidden w-40 items-center gap-2 md:flex">
          <Volume2 className="h-4 w-4 text-muted-foreground" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="w-full accent-primary"
          />
        </div>
      </div>
      <div className="h-0.5 bg-muted">
        <div className="h-full bg-primary transition-all" style={{ width: `${shownProgress * 100}%` }} />
      </div>
    </div>
  );
}

// ------------------------------------------------------------ video card

function VideoCard({
  track,
  onWatch,
}: {
  track: MusicTrack;
  onWatch: (t: MusicTrack) => void;
}) {
  return (
    <button
      onClick={() => onWatch(track)}
      className="group flex cursor-pointer flex-col gap-2 overflow-hidden rounded-xl text-left"
    >
      <div className="relative aspect-video overflow-hidden rounded-xl bg-muted">
        {track.artworkUrl ? (
          <img
            src={track.artworkUrl}
            alt={track.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Music2 className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600">
            <Play className="ml-0.5 h-5 w-5 text-white" fill="currentColor" />
          </div>
        </div>
        <Badge className="absolute left-2 top-2 bg-red-600/90 text-[10px] text-white hover:bg-red-600/90">
          YouTube
        </Badge>
      </div>
      <div className="px-1 pb-1">
        <p className="line-clamp-2 text-sm font-medium leading-snug">{track.title}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{track.artist}</p>
      </div>
    </button>
  );
}

// ------------------------------------------------------------ view

export function MusicView() {
  const [params, setParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [playerQueue, setPlayerQueue] = useState<MusicTrack[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [watching, setWatching] = useState<MusicTrack | null>(null);

  // Return from Stripe — verify + fulfil server-side, then clear the param.
  const sessionId = params.get("session_id");
  useEffect(() => {
    if (!sessionId) return;
    musicApi
      .syncCheckout(sessionId)
      .then((d) => {
        if (d.subscription) {
          toast({ title: `${d.subscription.plan.name} activated`, description: `${d.subscription.daysLeft} days of Zylo Music.` });
        }
        queryClient.invalidateQueries({ queryKey: MUSIC_SUB_KEY });
      })
      .catch((err) => toast({ title: errorMessage(err), variant: "destructive" }))
      .finally(() => setParams({}, { replace: true }));
  }, [sessionId, queryClient, setParams]);

  useEffect(() => {
    if (params.get("cancelled")) {
      toast({ title: "Checkout cancelled" });
      setParams({}, { replace: true });
    }
  }, [params, setParams]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 400);
    return () => clearTimeout(t);
  }, [query]);

  const sub = useQuery({ queryKey: MUSIC_SUB_KEY, queryFn: musicApi.subscription });
  const plans = useQuery({
    queryKey: MUSIC_PLANS_KEY,
    queryFn: musicApi.plans,
    enabled: !sub.data?.subscription,
  });
  const featured = useQuery({
    queryKey: MUSIC_FEATURED_KEY,
    queryFn: musicApi.featured,
    enabled: !!sub.data?.subscription,
  });
  const search = useQuery({
    queryKey: musicSearchKey(debouncedQuery),
    queryFn: () => musicApi.search(debouncedQuery),
    enabled: !!sub.data?.subscription && debouncedQuery.length >= 2,
  });

  const subscription = sub.data?.subscription ?? null;
  const tracks = debouncedQuery.length >= 2 ? search.data?.tracks : featured.data?.tracks;
  const isLoading = sub.isLoading || (subscription && featured.isLoading);

  const songs = useMemo(() => (tracks ?? []).filter((t) => t.previewUrl), [tracks]);
  const videos = useMemo(() => (tracks ?? []).filter((t) => t.youtubeVideoId), [tracks]);

  const watch = (t: MusicTrack) => {
    setPlaying(false); // pause the audio preview while the video plays
    setWatching(t);
  };

  const play = (t: MusicTrack) => {
    const i = songs.findIndex((x) => x.id === t.id);
    setPlayerQueue(songs);
    if (i === currentIndex) {
      setPlaying(!playing);
    } else {
      setCurrentIndex(i);
      setPlaying(true);
    }
  };

  const activeTrack = currentIndex != null ? playerQueue[currentIndex] : null;

  return (
    <div className={`flex flex-col gap-6 ${activeTrack ? "pb-24" : "pb-10"}`}>
      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-r from-violet-500/15 via-primary/10 to-pink-500/10 p-6 shadow-sm md:p-8">
        <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute -bottom-10 -left-10 h-64 w-64 rounded-full bg-pink-500/10 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Badge className="border-primary/30 bg-primary/20 px-2.5 py-0.5 text-xs font-semibold text-primary">
              <Headphones className="mr-1 h-3.5 w-3.5" />
              Streaming for subscribers
            </Badge>
            <h1 className="mt-2 font-display text-3xl font-black tracking-tight text-foreground sm:text-4xl">
              Zylo Music
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
              Search millions of tracks and play instant previews — one
              subscription covers the whole family.
            </p>
          </div>
          {subscription && (
            <div className="flex shrink-0 items-center gap-3 rounded-2xl border bg-background/70 px-4 py-3">
              <Music2 className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm font-bold">{subscription.plan.name}</p>
                <p className="text-xs text-muted-foreground">
                  {subscription.daysLeft} days left · {subscription.plan.audioQuality.toUpperCase()}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {sub.isError && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex items-center justify-between p-5">
            <div className="flex items-center gap-3 text-sm text-destructive">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p className="font-semibold">Unable to load your subscription</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => sub.refetch()}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      )}

      {/* No active subscription → plan picker */}
      {!isLoading && !subscription && (
        <div>
          <h2 className="font-display text-xl font-bold">Pick a plan to start listening</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            {(plans.data?.plans ?? []).map((p) => (
              <PlanCard key={p.id} plan={p} />
            ))}
          </div>
        </div>
      )}

      {/* Subscribed → search + catalog */}
      {!isLoading && subscription && (
        <>
          <div className="relative max-w-xl">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search songs, artists, albums…"
              className="h-12 rounded-full pl-10 text-sm"
            />
          </div>

          <div>
            <h2 className="font-display text-lg font-bold">
              {debouncedQuery.length >= 2 ? `Results for “${debouncedQuery}”` : "Trending now"}
            </h2>
            {(search.isFetching || featured.isFetching) && (
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading tracks…
              </div>
            )}
            {(search.isError || featured.isError) && (
              <p className="mt-4 text-sm text-destructive">
                {errorMessage(search.error ?? featured.error)}
              </p>
            )}
            {tracks && tracks.length === 0 && !search.isFetching && (
              <p className="mt-6 text-sm text-muted-foreground">No tracks found — try another search.</p>
            )}
            <div className="mt-3 grid grid-cols-1 gap-0.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {songs.map((t) => (
                <TrackRow
                  key={t.id}
                  track={t}
                  active={activeTrack?.id === t.id}
                  playing={playing}
                  onPlay={play}
                />
              ))}
            </div>
          </div>

          {videos.length > 0 && (
            <div>
              <h2 className="font-display text-lg font-bold">Music videos</h2>
              <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {videos.map((t) => (
                  <VideoCard key={t.id} track={t} onWatch={watch} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <PlayerBar
        queue={playerQueue}
        index={currentIndex}
        onIndex={setCurrentIndex}
        playing={playing}
        setPlaying={setPlaying}
      />

      {/* YouTube watch dialog — official embed player, pauses the audio bar */}
      <AppDialog
        open={!!watching}
        onOpenChange={() => setWatching(null)}
        size="xl"
        title={watching?.title ?? ""}
        description={watching?.artist}
      >
        {watching?.youtubeVideoId && (
          <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
            <iframe
              className="h-full w-full"
              src={`https://www.youtube.com/embed/${watching.youtubeVideoId}?autoplay=1&rel=0`}
              title={watching.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}
      </AppDialog>
    </div>
  );
}

export default MusicView;
