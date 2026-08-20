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
  if (!url || !anonKey) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
