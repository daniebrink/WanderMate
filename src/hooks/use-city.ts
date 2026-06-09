"use client";

import { useParams } from "next/navigation";

export function useCity() {
  const params = useParams();
  const citySlug = (params?.city as string) || null;

  return {
    citySlug,
    isCityRoute: !!citySlug,
  };
}
