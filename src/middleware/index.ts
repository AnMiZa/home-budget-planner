import { defineMiddleware } from "astro:middleware";

import { createSupabaseServerInstance } from "../db/supabase.client";

// Public paths that don't require authentication
const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/reset-password",
  "/update-password",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/reset-password",
  "/api/auth/callback",
];

export const onRequest = defineMiddleware(async ({ locals, cookies, url, request, redirect }, next) => {
  // Create Supabase client for this request
  const supabase = createSupabaseServerInstance({
    cookies,
    headers: request.headers,
  });

  // Make supabase client available to all routes
  locals.supabase = supabase;

  // Check if current path is public
  const isPublicPath = PUBLIC_PATHS.includes(url.pathname);

  // Get user session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // User is authenticated - fetch household_id
    const { data: household } = await supabase.from("households").select("id").eq("user_id", user.id).single();

    if (household) {
      locals.user = {
        id: user.id,
        email: user.email ?? "",
        household_id: household.id,
      };
    } else {
      // User exists but no household - this shouldn't happen due to trigger
      // but handle it gracefully
      console.error("User authenticated but no household found:", user.id);
      locals.user = undefined;
    }

    // If user is authenticated and trying to access login/register, redirect to home
    if (url.pathname === "/login" || url.pathname === "/register") {
      return redirect("/");
    }
  } else {
    // User is not authenticated
    locals.user = undefined;

    // If trying to access protected route, redirect to login
    if (!isPublicPath) {
      return redirect("/login");
    }
  }

  return next();
});
