"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button, Badge, Card } from "@platform/ui";
import { PublicUserProfile, TrackSummary } from "@platform/types";
import { api } from "@/lib/api";
import {
  User,
  Music,
  ExternalLink,
  Globe,
  MapPin,
  Calendar,
  Sparkles,
  Play,
  Pause,
  Clock,
  Radio,
  Share2,
  Check,
  AlertCircle,
  Loader2,
  Disc,
} from "lucide-react";

export default function PublicUserProfilePage() {
  const params = useParams();
  const username = (params?.username as string)?.toLowerCase().trim();

  const [profile, setProfile] = React.useState<PublicUserProfile | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [copiedLink, setCopiedLink] = React.useState(false);
  const [playingTrackId, setPlayingTrackId] = React.useState<string | null>(null);
  const [audioUrl, setAudioUrl] = React.useState<string | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  React.useEffect(() => {
    if (!username) return;

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    api.profiles
      .get(username)
      .then((data) => {
        if (isMounted) {
          setProfile(data);
        }
      })
      .catch((err: any) => {
        if (isMounted) {
          setError(err?.response?.data?.message || err?.message || "User not found");
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [username]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handlePlayToggle = async (track: TrackSummary) => {
    if (playingTrackId === track.id) {
      audioRef.current?.pause();
      setPlayingTrackId(null);
      return;
    }

    try {
      setPlayingTrackId(track.id);
      const res = await api.tracks.download(track.id);
      setAudioUrl(res.downloadUrl);
      if (audioRef.current) {
        audioRef.current.src = res.downloadUrl;
        await audioRef.current.play();
      }
    } catch {
      setPlayingTrackId(null);
    }
  };

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds <= 0) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-28 space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-violet-500" />
        <p className="text-sm text-zinc-400">Loading creator profile...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 border border-zinc-800 rounded-2xl text-center space-y-4 bg-zinc-900/40">
        <div className="h-14 w-14 rounded-full bg-red-950/60 text-red-400 flex items-center justify-center mx-auto border border-red-800/60">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold text-zinc-100">Profile Not Found</h2>
        <p className="text-xs text-zinc-400">{error || "The requested user profile does not exist or has been removed."}</p>
        <Link href="/hosts">
          <Button variant="outline" size="sm" className="mt-2">
            Browse Active Stations
          </Button>
        </Link>
      </div>
    );
  }

  const joinYear = profile.stats.joinedDate
    ? new Date(profile.stats.joinedDate).toLocaleDateString(undefined, {
        month: "short",
        year: "numeric",
      })
    : "Member";

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      <audio
        ref={audioRef}
        onEnded={() => setPlayingTrackId(null)}
        className="hidden"
      />

      {/* Banner & Identity Header */}
      <div className="relative rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900">
        {/* Banner */}
        <div className="h-44 sm:h-56 w-full bg-gradient-to-r from-violet-950 via-zinc-900 to-zinc-950 relative">
          {profile.bannerUrl && (
            <img
              src={profile.bannerUrl}
              alt="Banner"
              className="w-full h-full object-cover opacity-60"
            />
          )}
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="gap-2 bg-zinc-900/80 backdrop-blur text-xs min-h-[36px]"
            >
              {copiedLink ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" /> Copied Profile
                </>
              ) : (
                <>
                  <Share2 className="h-3.5 w-3.5" /> Share
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Profile Card Header Info */}
        <div className="p-6 sm:p-8 pt-0 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-16 sm:-mt-20">
            <div className="flex items-end gap-4">
              <div className="h-24 w-24 sm:h-32 sm:w-32 rounded-2xl bg-zinc-950 border-4 border-zinc-900 overflow-hidden shadow-2xl flex items-center justify-center text-violet-400 shrink-0">
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={profile.displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User className="h-12 w-12 text-zinc-600" />
                )}
              </div>
              <div className="space-y-1 mb-2">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-black text-zinc-50">
                    {profile.displayName}
                  </h1>
                  <Badge variant="secondary" className="text-xs">
                    @{profile.username}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-zinc-400 flex-wrap">
                  {profile.country && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-zinc-500" /> {profile.country}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-zinc-500" /> Joined {joinYear}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap mb-2">
              <Link href="/hosts">
                <Button variant="primary" size="sm" className="gap-2 text-xs min-h-[40px]">
                  <Radio className="h-3.5 w-3.5" /> Find Stations to Submit
                </Button>
              </Link>
            </div>
          </div>

          {/* Bio & Links */}
          <div className="mt-6 space-y-4 border-t border-zinc-800/80 pt-5">
            {profile.bio ? (
              <p className="text-sm text-zinc-300 max-w-2xl leading-relaxed whitespace-pre-line">
                {profile.bio}
              </p>
            ) : (
              <p className="text-xs italic text-zinc-500">No biography provided yet.</p>
            )}

            {/* External Links */}
            <div className="flex items-center gap-3 flex-wrap pt-1">
              {profile.websiteUrl && (
                <a
                  href={profile.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 text-zinc-300 text-xs transition-colors"
                >
                  <Globe className="h-3.5 w-3.5 text-zinc-400" /> Website
                  <ExternalLink className="h-3 w-3 text-zinc-500" />
                </a>
              )}

              {profile.spotifyProfileUrl && (
                <a
                  href={profile.spotifyProfileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-800/50 hover:bg-emerald-900/50 text-emerald-300 text-xs transition-colors"
                >
                  <Disc className="h-3.5 w-3.5 text-emerald-400" /> Spotify Profile
                  <ExternalLink className="h-3 w-3 text-emerald-400/70" />
                </a>
              )}

              {profile.genres && profile.genres.length > 0 && (
                <div className="flex items-center gap-1.5">
                  {profile.genres.map((genre) => (
                    <span
                      key={genre}
                      className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-violet-950/40 border border-violet-800/40 text-violet-300"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Left = Artist Identities & Stats, Right = Public Music Releases */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Creator Stats */}
          <Card className="p-5 border-zinc-800 space-y-4">
            <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-400" /> Creator Highlights
            </h3>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/80 text-center">
                <p className="text-2xl font-black text-zinc-100">{profile.stats.publicTracksCount}</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">Public Tracks</p>
              </div>
              <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/80 text-center">
                <p className="text-2xl font-black text-zinc-100">{profile.stats.artistIdentitiesCount}</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">Artist Identities</p>
              </div>
            </div>
          </Card>

          {/* Artist Identities Section */}
          <Card className="p-5 border-zinc-800 space-y-4">
            <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
              <Disc className="h-4 w-4 text-emerald-400" /> Artist Identities
            </h3>
            {profile.artistIdentities.length === 0 ? (
              <p className="text-xs text-zinc-500 italic">No public artist profiles configured.</p>
            ) : (
              <div className="space-y-2.5">
                {profile.artistIdentities.map((artist) => (
                  <div
                    key={artist.id}
                    className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-zinc-100">{artist.artistName}</p>
                      {artist.spotifyUrl && (
                        <a
                          href={artist.spotifyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300"
                        >
                          <Disc className="h-3 w-3" /> Spotify
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                    </div>
                    {artist.biography && (
                      <p className="text-xs text-zinc-400 line-clamp-2">{artist.biography}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Public Tracks Catalog */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
              <Music className="h-5 w-5 text-violet-400" /> Public Releases & Catalog
            </h2>
            <span className="text-xs text-zinc-400">
              {profile.publicTracks.length} {profile.publicTracks.length === 1 ? "track" : "tracks"} available
            </span>
          </div>

          {profile.publicTracks.length === 0 ? (
            <Card className="p-8 border-dashed border-zinc-800 text-center space-y-3">
              <div className="h-12 w-12 rounded-full bg-zinc-900 text-zinc-500 flex items-center justify-center mx-auto">
                <Music className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-zinc-200">No Public Tracks Released</h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                This creator hasn't published any tracks publicly yet. Uploaded tracks remain private by default until the artist toggles their public visibility.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {profile.publicTracks.map((track) => {
                const isPlaying = playingTrackId === track.id;
                return (
                  <Card
                    key={track.id}
                    className="p-4 border-zinc-800 hover:border-zinc-700 transition-colors flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <button
                        onClick={() => handlePlayToggle(track)}
                        className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                          isPlaying
                            ? "bg-violet-600 text-white shadow-lg shadow-violet-600/30"
                            : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700 hover:text-white"
                        }`}
                        aria-label={isPlaying ? "Pause track" : "Play track"}
                      >
                        {isPlaying ? (
                          <Pause className="h-5 w-5 fill-current" />
                        ) : (
                          <Play className="h-5 w-5 fill-current ml-0.5" />
                        )}
                      </button>

                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-zinc-100 truncate">{track.songName}</p>
                          {track.explicitContent && (
                            <Badge variant="warning" className="text-[10px] py-0 px-1 font-bold">
                              EXPLICIT
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-zinc-400 flex-wrap">
                          <span>{track.artistIdentity?.artistName || profile.displayName}</span>
                          {track.bpm && <span>• {track.bpm} BPM</span>}
                          {track.musicalKey && <span>• Key {track.musicalKey}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-zinc-400 font-mono flex items-center gap-1">
                        <Clock className="h-3 w-3 text-zinc-500" />
                        {formatDuration(track.durationSeconds)}
                      </span>

                      {track.artistIdentity?.spotifyUrl && (
                        <a
                          href={track.artistIdentity.spotifyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-8 w-8 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 hover:bg-emerald-900/50 flex items-center justify-center transition-colors"
                          title="Open Spotify Profile"
                        >
                          <Disc className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
