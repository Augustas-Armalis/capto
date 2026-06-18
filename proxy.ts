import { NextRequest, NextResponse } from "next/server";

const PROTECTED = ["/dashboard", "/onboarding", "/settings", "/billing", "/editor"];

// Next.js 16 renamed the middleware convention to "proxy". This runs at the
// edge before protected routes and bounces logged-out users to /signin. It only
// checks for the presence of better-auth's session cookie — the pages
// themselves re-validate the session server-side, so this is a fast gate, not
// the security boundary.
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!PROTECTED.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  const session =
    req.cookies.get("better-auth.session_token") ||
    req.cookies.get("__Secure-better-auth.session_token");

  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/signin";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|_editor|fonts|.*\\..*).*)"],
};
