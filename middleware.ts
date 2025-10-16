import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

const isSignInPage = createRouteMatcher(["/"]);
const isUnauthorizedPage = createRouteMatcher(["/unauthorized"]);
const isProtectedRoute = createRouteMatcher(["/student", "/admin"]);

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  if (isUnauthorizedPage(request)) {
    // Allow access to unauthorized page without authentication
    return;
  }
  if (isProtectedRoute(request) && !(await convexAuth.isAuthenticated())) {
    return nextjsMiddlewareRedirect(request, "/");
  }
});

export const config = {
  // The following matcher runs middleware on all routes
  // except static assets.
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
