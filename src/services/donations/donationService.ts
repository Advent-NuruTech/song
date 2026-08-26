import { supabase } from "@/src/auth/supabaseClient";

type InitializeDonationInput = {
  amountKes: number;
  email: string;
  appVersion: string;
};

export type InitializedDonation = {
  authorizationUrl: string;
  reference: string;
  callbackUrl: string;
};

export type DonationVerification = {
  status: "successful" | "pending" | "failed";
  reference: string;
};

async function edgeFunctionMessage(error: unknown, fallback: string) {
  const context = (error as { context?: { json?: () => Promise<{ code?: string; error?: string; message?: string }>; status?: number } })?.context;
  if (context?.json) {
    try {
      const body = await context.json();
      if (typeof body?.error === "string" && body.error.length <= 200) return body.error;
      if (context.status === 404 || body?.code === "NOT_FOUND") {
        return "Payments are temporarily unavailable. Please try again later.";
      }
    } catch {
      // Use the safe fallback below.
    }
  }
  return fallback;
}

export async function initializeDonation(input: InitializeDonationInput): Promise<InitializedDonation> {
  const { data, error } = await supabase.functions.invoke("initialize-donation", { body: input });
  if (error) throw new Error(await edgeFunctionMessage(error, "Payments are temporarily unavailable. Please try again later."));
  if (!data?.authorizationUrl || !data?.reference || !data?.callbackUrl) throw new Error("The payment service returned an incomplete response.");
  return data as InitializedDonation;
}

export async function verifyDonation(reference: string): Promise<DonationVerification> {
  const { data, error } = await supabase.functions.invoke("verify-donation", { body: { reference } });
  if (error) throw new Error(await edgeFunctionMessage(error, "We could not verify the payment yet. Please try again."));
  if (!data?.status || !data?.reference) throw new Error("The payment verification response was incomplete.");
  return data as DonationVerification;
}
