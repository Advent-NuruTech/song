import type { Metadata } from "next";
export const metadata: Metadata = { title: "Terms of Service | Advent Pro", description: "Advent Pro terms of service" };
const sections=[
 ["Accounts","Provide accurate information, protect your password, and report unauthorized access. Every new account starts as a Reader. Only authorized administrators can assign additional roles, and privileged access may be revoked to protect the service."],
 ["Acceptable use","Do not bypass security, impersonate others, upload malicious or unlawful material, disrupt the service, scrape it abusively, harass others, deceive users, or infringe another person's rights."],
 ["Contributions","You retain rights you hold in submissions and grant Advent Pro a non-exclusive worldwide license to host, reproduce, format, translate, distribute, and display them to operate and promote the service. You confirm you have permission to submit the material."],
 ["Content","Studies, hymns, and Bible resources are for education, worship, and personal study. Contributor views do not necessarily represent Advent Pro. The service is not medical, legal, financial, or emergency advice."],
 ["Copyright and reports","Respect authors, publishers, ministries, and licenses. Report infringement or content concerns through adventnurutech.xyz, identifying the material and the basis of the request."],
 ["Offline use and updates","Downloaded content may remain available offline. When connected, the app may receive corrections, withdrawals, and compatibility changes without an app-store release. New application capabilities may still require an update."],
 ["Termination and deletion","We may restrict accounts that violate these terms or create risk. You may stop using the service and request deletion. Security, legal, audit, backup, and previously published records may be retained where permitted or required."],
 ["Availability and liability","The service is provided as available without a promise of uninterrupted or error-free operation. To the extent permitted by law, Advent Pro and Advent Nuru Tech are not liable for indirect, incidental, special, consequential, or punitive loss."],
 ["Changes and contact","We may update these terms and will change the effective date or provide additional notice for material changes. Questions can be submitted through https://adventnurutech.xyz."],
];
export default function TermsPage(){return <main className="legal-page"><h1>Advent Pro Terms of Service</h1><p className="legal-date">Effective August 20, 2026</p><p>By using Advent Pro, you agree to these terms. If you do not agree, do not create an account or use the online services.</p>{sections.map(([title,body])=><section key={title}><h2>{title}</h2><p>{body}</p></section>)}</main>}
