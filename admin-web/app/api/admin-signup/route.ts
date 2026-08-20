import { createClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function codesMatch(submitted: string, expected: string) {
  const submittedBuffer = Buffer.from(submitted);
  const expectedBuffer = Buffer.from(expected);
  return (
    submittedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(submittedBuffer, expectedBuffer)
  );
}

export async function POST(request: Request) {
  let body: { email?: unknown; password?: unknown; signupCode?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const signupCode = typeof body.signupCode === "string" ? body.signupCode : "";
  const expectedCode = process.env.ADMIN_SIGNUP_CODE;

  if (!expectedCode) {
    console.error("ADMIN_SIGNUP_CODE is not configured");
    return NextResponse.json(
      { error: "Admin signup is not configured." },
      { status: 503 }
    );
  }
  if (!codesMatch(signupCode, expectedCode)) {
    return NextResponse.json({ error: "Invalid admin signup code." }, { status: 403 });
  }
  if (!email || password.length < 6) {
    return NextResponse.json(
      { error: "Enter a valid email and a password of at least 6 characters." },
      { status: 400 }
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceRoleKey) {
    console.error("Admin signup requires Supabase URL, anon key, and service-role key");
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const authClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const adminClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: signup, error: signupError } = await authClient.auth.signUp({
    email,
    password,
  });

  let userId = signup.user?.id;
  let confirmationRequired = !signup.session;
  let existingAccount = false;

  // Supabase may return either an error or an identity-less user when an email
  // already exists. Re-authenticate before changing that account's privileges.
  if (signupError || signup.user?.identities?.length === 0) {
    const { data: signin, error: signinError } =
      await authClient.auth.signInWithPassword({ email, password });
    if (signinError || !signin.user) {
      return NextResponse.json(
        { error: signupError?.message || "This account already exists. Sign in or confirm its email first." },
        { status: 400 }
      );
    }
    userId = signin.user.id;
    confirmationRequired = false;
    existingAccount = true;
  }

  if (!userId) {
    return NextResponse.json(
      { error: "Supabase did not return the new account. Please try again." },
      { status: 502 }
    );
  }

  // The auth trigger normally creates the profile and Reader role. These
  // service-role writes make the protected admin-signup contract explicit and
  // also repair accounts created before this endpoint granted admin access.
  const { error: profileError } = await adminClient.from("profiles").upsert(
    { id: userId, email },
    { onConflict: "id" }
  );
  if (profileError) {
    console.error("Failed to provision admin profile", profileError);
    return NextResponse.json(
      { error: "Account created, but its admin profile could not be provisioned." },
      { status: 500 }
    );
  }

  const { error: roleError } = await adminClient.from("app_user_roles").upsert(
    { user_id: userId, role_name: "super_admin", granted_by: userId },
    { onConflict: "user_id,role_name" }
  );
  if (roleError) {
    console.error("Failed to grant super-admin role", roleError);
    return NextResponse.json(
      { error: "Account created, but admin access could not be granted." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, confirmationRequired, existingAccount });
}
