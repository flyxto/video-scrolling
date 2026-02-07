/** @format */

"use client";

import { VideoCarousel } from "@/components/video-carousel";
import { useEffect, useState, useRef } from "react";

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
  const existingIdsRef = useRef<Set<string>>(new Set());

  const fetchVideos = async () => {
    try {
      const res = await fetch("/api/videos");
      const result = await res.json();

      if (Array.isArray(result)) {
        // Sort by createdAt to get newest videos first
        const sortedVideos = result.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );

        // Get the last 10 videos (most recent)
        const latestVideos = sortedVideos.slice(0, MAX_VIDEOS);

        // Find truly new videos that don't exist in current list
        const newVideos = latestVideos.filter(
          (video) => !existingIdsRef.current.has(video._id),
        );

        if (newVideos.length > 0) {
          setCurrentVideos((prev) => {
            // Combine previous and new videos
            const combined = [...prev, ...newVideos];

            // Keep only the last MAX_VIDEOS
            const trimmed = combined.slice(-MAX_VIDEOS);

            // Update the tracking set with current IDs
            existingIdsRef.current = new Set(trimmed.map((v) => v._id));

            console.log(
              `Added ${newVideos.length} new videos, removed ${combined.length - trimmed.length} old videos`,
            );
            console.log(`Total videos in carousel: ${trimmed.length}`);

            return trimmed;
          });
        }
      } else {
        console.error("Invalid response format");
      }
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetch("/api/videos")
      .then((res) => res.json())
      .then((result) => {
        console.log("Initial Response:", result);
        if (Array.isArray(result)) {
          // Sort and get the last 10 videos
          const sortedVideos = result.sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          );
          const latestVideos = sortedVideos.slice(0, MAX_VIDEOS);

          setCurrentVideos(latestVideos);

          // Store initial IDs
          latestVideos.forEach((video) => {
            existingIdsRef.current.add(video._id);
          });

          console.log(`Loaded ${latestVideos.length} most recent videos`);
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
  }, [loading]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <main className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#442E8D] via-[#702A8C] to-[#442E8D] overflow-hidden ">
      {/* 9:16 aspect ratio container centered on screen */}
      <div className="aspect-[9/16] w-full rounded-lg overflow-hidden shadow-2xl">
        <VideoCarousel videos={currentVideos} />
      </div>
    </main>
  );
}
