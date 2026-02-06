// /** @format */

// "use client";

// import { VideoCarousel } from "@/components/video-carousel";
// import { useEffect, useState, useRef } from "react";

// interface Video {
//   _id: string;
//   videoUrl: string;
//   createdAt: string;
//   views: number;
//   downloads: number;
// }

// export default function MyComponent() {
//   const [currentVideos, setCurrentVideos] = useState<Video[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const existingIdsRef = useRef<Set<string>>(new Set());

//   const fetchVideos = async () => {
//     try {
//       const res = await fetch("/api/videos");
//       const result = await res.json();

//       if (Array.isArray(result)) {
//         // Find new videos that don't exist in current list
//         const newVideos = result.filter(
//           (video) => !existingIdsRef.current.has(video._id)
//         );

//         if (newVideos.length > 0) {
//           // Add new video IDs to the set
//           newVideos.forEach((video) => {
//             existingIdsRef.current.add(video._id);
//           });

//           // Append new videos to the end without disrupting current playback
//           setCurrentVideos((prev) => [...prev, ...newVideos]);

//           console.log(`Added ${newVideos.length} new videos`);
//         }
//       } else {
//         console.error("Invalid response format");
//       }
//     } catch (err) {
//       console.error("Fetch error:", err);
//     }
//   };

//   // Initial fetch
//   useEffect(() => {
//     fetch("/api/videos")
//       .then((res) => res.json())
//       .then((result) => {
//         console.log("Initial Response:", result);
//         if (Array.isArray(result)) {
//           setCurrentVideos(result);
//           // Store initial IDs
//           result.forEach((video) => {
//             existingIdsRef.current.add(video._id);
//           });
//         } else {
//           setError("Invalid response format");
//         }
//         setLoading(false);
//       })
//       .catch((err) => {
//         console.error(err);
//         setError(err.message);
//         setLoading(false);
//       });
//   }, []);

//   // Periodic fetch every 15 seconds
//   useEffect(() => {
//     if (loading) return;

//     const interval = setInterval(() => {
//       console.log("Fetching new videos...");
//       fetchVideos();
//     }, 15000); // 15 seconds

//     return () => clearInterval(interval);
//   }, [loading]);

//   if (loading) return <div>Loading...</div>;
//   if (error) return <div>Error: {error}</div>;

//   return (
//     <main className="min-h-screen w-full flex items-center justify-center bg-background overflow-hidden relative bg-gray-800 px-[94px]">
//       <div className="w-full h-full absolute">
//         <img
//           src="/images/background.png"
//           alt="Background"
//           className="w-full h-full object-contain"
//         />
//       </div>

//       {/* 9:16 aspect ratio container centered on screen */}
//       <div className="relative translate-y-[310px] aspect-[9/16] w-full rounded-lg overflow-hidden shadow-2xl">
//         <VideoCarousel videos={currentVideos} />
//       </div>
//     </main>
//   );
// }

import { redirect } from "next/navigation";

export default function Page() {
  redirect("/video");
}
