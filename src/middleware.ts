import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
  // NOTE: Authentication state cannot be reliably checked in middleware
  // without specific libraries or patterns (like using cookies set upon login).
  // Middleware runs on the edge and doesn't have full client-side context easily.

  // A common pattern is to let the client-side handle the redirect *after*
  // checking auth state (as done in dashboard/page.tsx and account/[accountId]/page.tsx).

  // If you *need* server-side protection via middleware, you'd typically:
  // 1. Set an HTTP-only cookie upon successful login (e.g., containing a session token).
  // 2. Check for the presence and validity of this cookie in the middleware.

  // For this example, we'll keep the client-side redirection approach
  // as implemented in the page components using the useAuth hook.
  // This middleware file is added as a placeholder for future enhancement
  // if server-side route protection is required.

  // Example (if using a session cookie named 'auth-token'):
  // const authToken = request.cookies.get('auth-token')?.value;
  // const { pathname } = request.nextUrl;
  //
  // const protectedRoutes = ['/dashboard', '/account', '/profile'];
  //
  // if (protectedRoutes.some(route => pathname.startsWith(route)) && !authToken) {
  //   const loginUrl = new URL('/', request.url); // Redirect to home/login page
  //   return NextResponse.redirect(loginUrl);
  // }

  return NextResponse.next() // Continue processing the request
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
     /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - / (the root path, which is the login page)
     */
    // '/((?!api|_next/static|_next/image|favicon.ico|^/$).*)', // Example matcher if protecting routes server-side
     '/dashboard/:path*',
     '/account/:path*',
     '/profile/:path*',
    ],
}
