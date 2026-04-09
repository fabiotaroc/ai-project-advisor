import { NextResponse, type NextRequest } from "next/server";
import { updateSupabaseSession } from "@/lib/supabase/proxy";

const publicRoutes = new Set(["/", "/login", "/signup"]);
const protectedPrefixes = ["/app", "/project", "/workspace"];

function isProtectedPath(pathname: string) {
  return protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function copyResponseMetadata(from: NextResponse, to: NextResponse) {
  from.headers.forEach((value, key) => {
    if (key.toLowerCase() !== "location") {
      to.headers.set(key, value);
    }
  });

  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie);
  });

  return to;
}

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSupabaseSession(request);
  const pathname = request.nextUrl.pathname;

  if (isProtectedPath(pathname) && !user) {
    const redirectResponse = NextResponse.redirect(new URL("/login", request.url));
    return copyResponseMetadata(response, redirectResponse);
  }

  if (publicRoutes.has(pathname) && user) {
    const redirectResponse = NextResponse.redirect(new URL("/app", request.url));
    return copyResponseMetadata(response, redirectResponse);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml|woff2?)$).*)",
  ],
};
