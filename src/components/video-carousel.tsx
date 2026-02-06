/** @format */

"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MusicIcon } from "lucide-react";
import { IoIosShareAlt, IoMdHeart } from "react-icons/io";
import { FaCommentDots } from "react-icons/fa";
import { getVideoFromCache, saveVideoToCache } from "@/lib/videoCache";

interface Video {
  _id: string;
  videoUrl: string;
  createdAt: string;
  views: number;
  downloads: number;
}

interface VideoCarouselProps {
  videos: Video[];
  onIndexChange?: (index: number) => void;
  externalIndex?: number;
}

export function VideoCarousel({
  videos,
  onIndexChange,
  externalIndex,
}: VideoCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(externalIndex || 0);
  const [direction, setDirection] = useState(1);
  const [blobUrls, setBlobUrls] = useState<Map<string, string>>(new Map());
  const [loadingVideos, setLoadingVideos] = useState<Set<string>>(new Set());
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const prevVideosLengthRef = useRef(videos.length);
  const [interactions, setInteractions] = useState<
    Map<string, { likes: number; comments: number }>
  >(new Map());

  // Sync with external index changes
  useEffect(() => {
    if (externalIndex !== undefined && externalIndex !== currentIndex) {
      console.log(`External index change: ${currentIndex} -> ${externalIndex}`);
      setCurrentIndex(externalIndex);
    }
  }, [externalIndex]);

  const getRandomInteractions = (videoId: string) => {
    if (!interactions.has(videoId)) {
      return {
        likes: Math.floor(Math.random() * 10000) + 100,
        comments: Math.floor(Math.random() * 500) + 10,
      };
    }
    return interactions.get(videoId)!;
  };

  useEffect(() => {
    if (videos[currentIndex] && !interactions.has(videos[currentIndex]._id)) {
      const videoId = videos[currentIndex]._id;
      const newInteractions = {
        likes: Math.floor(Math.random() * 10000) + 100,
        comments: Math.floor(Math.random() * 500) + 10,
      };
      setInteractions((prev) => new Map(prev).set(videoId, newInteractions));
    }
  }, [currentIndex, videos, interactions]);

  // Function to fetch video as blob (with caching)
  const fetchVideoAsBlob = async (videoUrl: string, videoId: string) => {
    if (blobUrls.has(videoId) || loadingVideos.has(videoId)) {
      return;
    }

    setLoadingVideos((prev) => new Set(prev).add(videoId));

    try {
      // Check cache first
      const cachedBlob = await getVideoFromCache(videoId);

      let blob: Blob;

      if (cachedBlob) {
        // Use cached blob
        blob = cachedBlob;
      } else {
        // Download and cache
        console.log(`⬇️ Downloading video: ${videoId}`);
        const response = await fetch(videoUrl);
        blob = await response.blob();

        // Save to cache
        await saveVideoToCache(videoId, blob);
      }

      const blobUrl = URL.createObjectURL(blob);

      setBlobUrls((prev) => new Map(prev).set(videoId, blobUrl));
      setLoadingVideos((prev) => {
        const newSet = new Set(prev);
        newSet.delete(videoId);
        return newSet;
      });
    } catch (error) {
      console.error(`Failed to fetch video ${videoId}:`, error);
      setLoadingVideos((prev) => {
        const newSet = new Set(prev);
        newSet.delete(videoId);
        return newSet;
      });
    }
  };

  // Load current and next video as blobs
  useEffect(() => {
    if (videos.length === 0) return;

    const currentVideo = videos[currentIndex];
    const nextIndex = (currentIndex + 1) % videos.length;
    const nextVideo = videos[nextIndex];

    // Fetch current video
    if (currentVideo) {
      fetchVideoAsBlob(currentVideo.videoUrl, currentVideo._id);
    }

    // Preload next video
    if (nextVideo) {
      fetchVideoAsBlob(nextVideo.videoUrl, nextVideo._id);
    }
  }, [currentIndex, videos]);

  // Preload new videos when they're added to the list
  useEffect(() => {
    if (videos.length > prevVideosLengthRef.current) {
      // New videos were added
      const newVideos = videos.slice(prevVideosLengthRef.current);

      console.log(`Preloading ${newVideos.length} new videos in background`);

      // Preload new videos in the background without blocking
      newVideos.forEach((video) => {
        fetchVideoAsBlob(video.videoUrl, video._id);
      });
    }

    prevVideosLengthRef.current = videos.length;
  }, [videos.length]);

  // Cleanup blob URLs when videos are removed
  useEffect(() => {
    // Find blob URLs that no longer have corresponding videos
    const currentVideoIds = new Set(videos.map((v) => v._id));
    const blobsToRemove: string[] = [];

    blobUrls.forEach((blobUrl, videoId) => {
      if (!currentVideoIds.has(videoId)) {
        blobsToRemove.push(videoId);
        URL.revokeObjectURL(blobUrl);
      }
    });

    if (blobsToRemove.length > 0) {
      setBlobUrls((prev) => {
        const newMap = new Map(prev);
        blobsToRemove.forEach((id) => newMap.delete(id));
        return newMap;
      });
      console.log(`Cleaned up ${blobsToRemove.length} blob URLs`);
    }
  }, [videos]);

  // Cleanup all blob URLs on unmount
  useEffect(() => {
    return () => {
      blobUrls.forEach((blobUrl) => {
        URL.revokeObjectURL(blobUrl);
      });
    };
  }, []);

  // Handle video end
  const handleVideoEnd = () => {
    setDirection(1);
    const newIndex = (currentIndex + 1) % videos.length;
    setCurrentIndex(newIndex);

    // Notify parent component
    if (onIndexChange) {
      onIndexChange(newIndex);
    }
  };

  // Auto-play current video when blob is ready
  useEffect(() => {
    const currentVideo = videoRefs.current[currentIndex];
    const currentVideoId = videos[currentIndex]?._id;

    if (currentVideo && blobUrls.has(currentVideoId)) {
      currentVideo.play().catch((error) => {
        console.log("Video autoplay failed:", error);
      });
    }
  }, [currentIndex, blobUrls, videos]);

  // Reset to valid index if current index is out of bounds
  useEffect(() => {
    if (videos.length > 0 && currentIndex >= videos.length) {
      const newIndex = Math.min(currentIndex, videos.length - 1);
      console.log(
        `Index out of bounds, resetting: ${currentIndex} -> ${newIndex}`,
      );
      setCurrentIndex(newIndex);

      if (onIndexChange) {
        onIndexChange(newIndex);
      }
    }
  }, [videos.length, currentIndex]);

  const variants = {
    enter: {
      y: "100%",
      opacity: 0,
    },
    center: {
      y: 0,
      opacity: 1,
    },
    exit: {
      y: "-100%",
      opacity: 0,
    },
  };

  if (videos.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-white">
        No videos available
      </div>
    );
  }

  const currentBlobUrl = blobUrls.get(videos[currentIndex]._id);
  const currentInteractions = getRandomInteractions(videos[currentIndex]._id);

  return (
    <div className="relative w-full h-full overflow-hidden">
      {!currentBlobUrl && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
          Loading video...
        </div>
      )}

      {currentBlobUrl && (
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              y: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.7 },
            }}
            className="absolute inset-0"
          >
            <video
              ref={(el) => {
                videoRefs.current[currentIndex] = el;
              }}
              src={currentBlobUrl}
              className="w-full h-full object-cover"
              playsInline
              muted
              onEnded={handleVideoEnd}
              preload="auto"
            />
          </motion.div>
        </AnimatePresence>
      )}

      {/* Preload next video (hidden) */}
      {videos.map((video, index) => {
        if (index === currentIndex) return null;
        const videoBlobUrl = blobUrls.get(video._id);
        if (!videoBlobUrl) return null;

        return (
          <video
            key={video._id}
            ref={(el) => {
              videoRefs.current[index] = el;
            }}
            src={videoBlobUrl}
            className="hidden"
            playsInline
            muted
            preload="auto"
          />
        );
      })}

      {/* Debug info - remove in production */}
      <div className="absolute top-4 left-4 bg-black/50 text-white text-xs p-2 rounded">
        Video {currentIndex + 1} / {videos.length}
      </div>
    </div>
  );
}
