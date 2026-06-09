import { type NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // City routing logic
  const pathname = request.nextUrl.pathname;

  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/auth")
  ) {
    return response;
  }

  const citySlugMatch = pathname.match(/^\/([a-z0-9-]+)(\/.*)?$/);

  if (citySlugMatch) {
    const possibleCitySlug = citySlugMatch[1];
    const reservedRoutes = [
      "login",
      "register",
      "dashboard",
      "guide",
      "driver",
      "admin",
      "api",
      "auth",
      "about",
      "contact",
      "terms",
      "privacy",
      "dev",
      "tourist",
    ];

    if (!reservedRoutes.includes(possibleCitySlug)) {
      response.headers.set("x-city-slug", possibleCitySlug);
      return response;
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
