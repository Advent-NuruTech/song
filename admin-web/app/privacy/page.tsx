import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy | Advent Pro", description: "Advent Pro privacy policy" };
const sections = [
  ["Information we process", "When you create an account, Advent Pro processes your email address, display name, account identifier, assigned roles, authentication and session information, content you submit, and security records. Supabase processes encrypted authentication credentials; Advent Pro cannot view your password."],
  ["Offline and device data", "Songs, studies, Bible versions, settings, search indexes, and cached content may be stored locally so the app works offline. Clearing app data or uninstalling can remove information that has not synchronized."],
  ["How we use information", "We use information to authenticate users, synchronize roles, deliver and correct content, provide support, prevent abuse, maintain security, and meet legal obligations. We do not sell personal information or use it for third-party behavioral advertising."],
  ["Service providers and sharing", "We use Supabase for authentication, database, and synchronization, and may use hosting, content delivery, monitoring, or email providers. Information is shared only with providers operating the service, when you intentionally publish content, when required by law, or to protect users and the service."],
  ["Retention and deletion", "Account information is retained while the account is active and as reasonably required for security, disputes, backups, audit integrity, and legal obligations. You can initiate deletion in Advent Pro under Settings, Account & access, Request account deletion, or use our public account-deletion page."],
  ["Security", "We use authenticated sessions, HTTPS, row-level database security, role-based permissions, and audit records. No system is completely secure, so users should protect passwords and report suspected misuse."],
  ["Children", "The service is not intended to collect personal information from children without appropriate parent or guardian involvement. Contact us if a child's information should be removed."],
  ["International processing", "Service providers may process information outside your country. We take reasonable steps to use appropriate providers and safeguards."],
  ["Your choices", "Core reading can be used without an account. You can sign out, manage downloads, correct profile information, and request access to or deletion of your personal information, subject to applicable law."],
  ["Contact", "For privacy questions or requests, contact Advent Nuru Tech through https://adventnurutech.xyz."],
];
export default function PrivacyPage(){return <main className="legal-page"><h1>Advent Pro Privacy Policy</h1><p className="legal-date">Effective August 20, 2026</p><p>This policy explains how Advent Pro and Advent Nuru Tech process information in the mobile app, public website, and administration service.</p>{sections.map(([title,body])=><section key={title}><h2>{title}</h2><p>{body}</p></section>)}</main>}
