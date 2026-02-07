/** @format */

"use client";

import { VideoCarousel } from "@/components/video-carousel";
import { useEffect, useState, useRef } from "react";
import { removeVideosFromCache } from "@/lib/videoCache";

interface Video {
  _id: string;
  videoUrl: string;
  createdAt: string;
  views: number;
  downloads: number;
}

const MAX_VIDEOS = 10;

export default function MyComponent() {
  const [currentVideos, setCurrentVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const existingIdsRef = useRef<Set<string>>(new Set());

  const fetchVideos = async () => {
    try {
      const res = await fetch("/api/videos");
      const result = await res.json();

      if (Array.isArray(result)) {
        // Find new videos that don't exist in current list
        const newVideos = result.filter(
          (video) => !existingIdsRef.current.has(video._id),
        );

        if (newVideos.length > 0) {
          console.log(`Found ${newVideos.length} new videos`);

          setCurrentVideos((prevVideos) => {
            // Calculate how many videos to remove to maintain MAX_VIDEOS
            const totalAfterAdd = prevVideos.length + newVideos.length;
            const videosToRemove = Math.max(0, totalAfterAdd - MAX_VIDEOS);

            if (videosToRemove === 0) {
              // No need to remove, just add new videos
              newVideos.forEach((video) => {
                existingIdsRef.current.add(video._id);
              });
              return [...prevVideos, ...newVideos];
            }

            // Smart removal: don't remove current or unwatched videos
            const safeRemoveCount = Math.min(videosToRemove, currentIndex);

            const finalRemoveCount = safeRemoveCount;
            const updatedVideos = [...prevVideos];

            let indexAdjustment = 0;

            if (safeRemoveCount < videosToRemove) {
              // Not enough watched videos to remove
              // Remove what we can from the beginning (watched videos)
              if (safeRemoveCount > 0) {
                const removedVideos = updatedVideos.splice(0, safeRemoveCount);

                // Remove from cache
                const removedIds = removedVideos.map((v) => v._id);
                removeVideosFromCache(removedIds).catch((err) =>
                  console.error("Failed to remove videos from cache:", err),
                );

                removedVideos.forEach((video) => {
                  existingIdsRef.current.delete(video._id);
                });
                indexAdjustment = safeRemoveCount;
              }

              // Remove remaining from the end to maintain MAX_VIDEOS
              const remainingToRemove = videosToRemove - safeRemoveCount;
              const removeFromEnd = updatedVideos.splice(
                updatedVideos.length - remainingToRemove,
                remainingToRemove,
              );

              // Remove from cache
              const removedEndIds = removeFromEnd.map((v) => v._id);
              removeVideosFromCache(removedEndIds).catch((err) =>
                console.error("Failed to remove videos from cache:", err),
              );

              removeFromEnd.forEach((video) => {
                existingIdsRef.current.delete(video._id);
              });

              console.log(
                `Removed ${safeRemoveCount} watched videos from start, ${remainingToRemove} from end`,
              );
            } else {
              // Safe to remove from beginning only
              const removedVideos = updatedVideos.splice(0, finalRemoveCount);

              // Remove from cache
              const removedIds = removedVideos.map((v) => v._id);
              removeVideosFromCache(removedIds).catch((err) =>
                console.error("Failed to remove videos from cache:", err),
              );

              removedVideos.forEach((video) => {
                existingIdsRef.current.delete(video._id);
              });
              indexAdjustment = finalRemoveCount;

              console.log(
                `Removed ${finalRemoveCount} watched videos from start`,
              );
            }

            // Add new videos to the set
            newVideos.forEach((video) => {
              existingIdsRef.current.add(video._id);
            });

            // Add new videos to the end
            const finalVideos = [...updatedVideos, ...newVideos];

            // Adjust current index
            setCurrentIndex((prevIndex) => {
              const newIndex = Math.max(0, prevIndex - indexAdjustment);
              console.log(`Index adjusted: ${prevIndex} -> ${newIndex}`);
              return newIndex;
            });

            console.log(
              `Queue updated: ${prevVideos.length} -> ${finalVideos.length} videos`,
            );

            return finalVideos;
          });
        }
      } else {
        console.error("Invalid response format");
      }
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  // Initial fetch - limit to MAX_VIDEOS
  useEffect(() => {
    fetch("/api/videos")
      .then((res) => res.json())
      .then((result) => {
        console.log("Initial Response:", result);
        if (Array.isArray(result)) {
          // Limit to MAX_VIDEOS on initial load
          const limitedVideos = result.slice(0, MAX_VIDEOS);
          setCurrentVideos(limitedVideos);

          // Store initial IDs
          limitedVideos.forEach((video) => {
            existingIdsRef.current.add(video._id);
          });

          console.log(`Loaded ${limitedVideos.length} videos initially`);
        } else {
          setError("Invalid response format");
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Periodic fetch every 15 seconds
  useEffect(() => {
    if (loading) return;

    const interval = setInterval(() => {
      console.log("Fetching new videos...");
      fetchVideos();
    }, 15000); // 15 seconds

    return () => clearInterval(interval);
  }, [loading, currentIndex]);

  // Handle index updates from VideoCarousel
  const handleIndexChange = (newIndex: number) => {
    setCurrentIndex(newIndex);
  };

  if (loading) {
    return (
      <main className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#442E8D] via-[#702A8C] to-[#442E8D]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
          <p className="text-white text-lg font-medium">Loading videos...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#442E8D] via-[#702A8C] to-[#442E8D]">
        <div className="max-w-md mx-auto px-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h2 className="text-white text-xl font-semibold mb-2">
              Something went wrong
            </h2>
            <p className="text-white/70 mb-6">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#442E8D] via-[#702A8C] to-[#442E8D] overflow-hidden ">
      {/* 9:16 aspect ratio container centered on screen */}
      <div className="aspect-[9/16] w-full rounded-lg overflow-hidden shadow-2xl">
        <VideoCarousel
          videos={currentVideos}
          onIndexChange={handleIndexChange}
          externalIndex={currentIndex}
        />
      </div>
    </main>
  );
}
