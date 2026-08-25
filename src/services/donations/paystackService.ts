const PAYSTACK_CHECKOUT_HOST = "checkout.paystack.com";

export function isTrustedPaystackCheckoutUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === PAYSTACK_CHECKOUT_HOST;
  } catch {
    return false;
  }
}

export function isDonationCallbackUrl(value: string, callbackUrl: string) {
  try {
    const current = new URL(value);
    const expected = new URL(callbackUrl);
    const normalizePath = (path: string) => path.replace(/\/+$/, "") || "/";
    return current.protocol === expected.protocol
      && current.host === expected.host
      && normalizePath(current.pathname) === normalizePath(expected.pathname);
  } catch {
    return false;
  }
}

export function isValidDonationReference(value: string) {
  return /^APSUP-[A-Za-z0-9.-]{20,100}$/.test(value);
}
