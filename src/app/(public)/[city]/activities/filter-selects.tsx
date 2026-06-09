"use client";

interface FilterSelectsProps {
  city: string;
  maxPrice: string;
  maxDuration: string;
  minRating: string;
  q: string;
  category: string;
}

export function FilterSelects({
  city,
  maxPrice,
  maxDuration,
  minRating,
  q,
  category,
}: FilterSelectsProps) {
  function buildQuery(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (category) params.set("category", category);
    if (maxPrice && !overrides.hasOwnProperty("maxPrice"))
      params.set("maxPrice", maxPrice);
    if (maxDuration && !overrides.hasOwnProperty("maxDuration"))
      params.set("maxDuration", maxDuration);
    if (minRating && !overrides.hasOwnProperty("minRating"))
      params.set("minRating", minRating);
    for (const [key, value] of Object.entries(overrides)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    const str = params.toString();
    return str ? `?${str}` : "";
  }

  function handleChange(key: string, val: string) {
    const url = `/${city}/activities${buildQuery({ [key]: val || undefined })}`;
    window.location.href = url;
  }

  return (
    <>
      <select
        name="maxPrice"
        className="rounded-md border border-input bg-background px-2 py-1.5 text-xs"
        onChange={(e) => handleChange("maxPrice", e.target.value)}
        defaultValue={maxPrice}
      >
        <option value="">Any price</option>
        <option value="50000">Under R500</option>
        <option value="100000">Under R1,000</option>
        <option value="200000">Under R2,000</option>
        <option value="500000">Under R5,000</option>
      </select>

      <select
        name="maxDuration"
        className="rounded-md border border-input bg-background px-2 py-1.5 text-xs"
        onChange={(e) => handleChange("maxDuration", e.target.value)}
        defaultValue={maxDuration}
      >
        <option value="">Any duration</option>
        <option value="2">Under 2 hours</option>
        <option value="4">Under 4 hours</option>
        <option value="8">Under 8 hours</option>
        <option value="12">Under 12 hours</option>
      </select>

      <select
        name="minRating"
        className="rounded-md border border-input bg-background px-2 py-1.5 text-xs"
        onChange={(e) => handleChange("minRating", e.target.value)}
        defaultValue={minRating}
      >
        <option value="">Any rating</option>
        <option value="4">4+ stars</option>
        <option value="4.5">4.5+ stars</option>
        <option value="5">5 stars</option>
      </select>
    </>
  );
}
