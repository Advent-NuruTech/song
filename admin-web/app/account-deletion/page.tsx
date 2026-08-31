import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Account Deletion | Advent Pro",
  description: "Request deletion of an Advent Pro account and associated personal data.",
};

export default function AccountDeletionPage() {
  return <main className="legal-page">
    <h1>Advent Pro account deletion</h1>
    <p>Advent Pro users can initiate deletion directly in the mobile app: open <strong>Settings → Account &amp; access → Request account deletion</strong>, confirm the request, and the app will sign you out.</p>
    <h2>What happens next</h2><p>The in-app action creates a pending request; signing out or uninstalling does not itself delete server data. An authorized Advent Nuru Tech administrator or server process reviews and completes the request after any necessary identity, security, fraud-prevention, and legal checks.</p>
    <h2>What is deleted</h2><p>When processing is complete, we delete the Supabase authentication account and associated profile, role assignments, likes, comments, reports, and other personal synchronized data unless retention is permitted or required.</p>
    <h2>What may be retained</h2><p>Limited security, audit, fraud-prevention, dispute, or legally required records may be retained where necessary. Backup copies are removed through normal backup-expiry cycles.</p>
    <h2>Cannot access the app?</h2><p>You do not need to reinstall Advent Pro. Email <a href="mailto:adventnurutech@gmail.com?subject=Advent%20Pro%20account%20deletion%20request">adventnurutech@gmail.com</a> or <a href="https://wa.me/254142225233?text=I%20want%20to%20request%20deletion%20of%20my%20Advent%20Pro%20account">send Advent Nuru Tech a WhatsApp deletion request</a>. Include the email address connected to your account. We may request verification before processing.</p>
    <p>Last updated: August 24, 2026.</p>
    <nav className="legal-links" aria-label="Advent Pro legal resources"><a href="/privacy">Privacy Policy</a><a href="/terms">Terms of Service</a><a href="https://song-pied-eight.vercel.app">Advent Pro</a></nav>
  </main>;
}
