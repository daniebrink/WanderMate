"use client";

import { useRef, useState } from "react";

export function ImageUpload({
  label,
  name,
}: {
  label: string;
  name: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);

  function handleClick() {
    inputRef.current?.click();
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const urls = files.map((file) => URL.createObjectURL(file));
      setPreviews((prev) => [...prev, ...urls]);
    }
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <input
        ref={inputRef}
        type="file"
        name={name}
        accept="image/*"
        multiple
        onChange={handleChange}
        className="hidden"
      />
      <div className="flex flex-wrap gap-3">
        {previews.map((url, i) => (
          <div key={i} className="w-20 h-20 rounded-md bg-muted overflow-hidden border">
            <img src={url} alt={`Preview ${i + 1}`} className="w-full h-full object-cover" />
          </div>
        ))}
        <button
          type="button"
          onClick={handleClick}
          className="w-20 h-20 rounded-md border border-dashed flex items-center justify-center text-muted-foreground text-xs hover:bg-muted transition-colors"
        >
          + Add
        </button>
      </div>
    </div>
  );
}
