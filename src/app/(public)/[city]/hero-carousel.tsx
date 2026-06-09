"use client";

import { useState, useEffect } from "react";

export function HeroCarousel({
  images,
  children,
}: {
  images: string[];
  children: React.ReactNode;
}) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % images.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [images.length]);

  return (
    <section className="relative text-white py-24 px-4 overflow-hidden">
      {/* Background layers with crossfade */}
      {images.map((img, i) => (
        <div
          key={i}
          className="absolute inset-0 transition-opacity duration-1000"
          style={{
            backgroundImage: `linear-gradient(rgba(15,23,42,0.65), rgba(15,23,42,0.75)), url(${img})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: i === current ? 1 : 0,
          }}
        />
      ))}

      {/* Fallback solid background when no images */}
      {images.length === 0 && (
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to bottom right, #0f172a, #1e293b)" }}
        />
      )}

      {/* Dots */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-10">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === current ? "bg-white" : "bg-white/40"
              }`}
              aria-label={`Show image ${i + 1}`}
            />
          ))}
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 container mx-auto max-w-4xl text-center space-y-6">
        {children}
      </div>
    </section>
  );
}
