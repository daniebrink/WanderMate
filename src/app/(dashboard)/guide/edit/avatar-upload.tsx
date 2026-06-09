"use client";

import { useRef, useState } from "react";

export function AvatarUpload({
  currentSrc,
  name = "avatarFile",
  label,
}: {
  currentSrc: string | null;
  name?: string;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentSrc);

  function handleClick() {
    inputRef.current?.click();
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreview(url);
    }
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <button
          type="button"
          onClick={handleClick}
          className="w-36 h-36 rounded-full bg-muted overflow-hidden border-2 border-border focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          aria-label={label || "Change photo"}
        >
          {preview ? (
            <img
              src={preview}
              alt={label || "Photo"}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
              No photo
            </div>
          )}
        </button>

        {/* Pencil button on border */}
        <button
          type="button"
          onClick={handleClick}
          className="absolute bottom-1 right-1 w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md border-2 border-background hover:bg-primary/90 transition-colors"
          aria-label={label ? `Edit ${label}` : "Edit photo"}
          title={label ? `Edit ${label}` : "Edit photo"}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
          </svg>
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        name={name}
        accept="image/*"
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
}
