const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";
const NOTIFY_ADDRESS = "offfeeed@gmail.com";

const base64 = (value: string) =>
  btoa(Array.from(new TextEncoder().encode(value), (byte) => String.fromCharCode(byte)).join(""));
const header = (value: string) => (/^[\x00-\x7F]*$/.test(value) ? value : `=?UTF-8?B?${base64(value)}?=`);
const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export type BrandApplicationEmail = {
  applicationId: string;
  brandName: string;
  contactName: string;
  email: string;
  category: string;
  description: string;
  website: string;
  socialHandle: string | null;
  hasProof: boolean;
  commissionRate: number;
};

export async function sendBrandApplicationEmail(application: BrandApplicationEmail): Promise<void> {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const connectionKey = process.env["GOOGLE_MAIL_API_KEY"];
  if (!lovableKey || !connectionKey) {
    console.error("[brand-application-email] Gmail connection is not configured.");
    return;
  }

  const rows: Array<[string, string]> = [
    ["Brand", application.brandName],
    ["Category", application.category],
    ["Contact", application.contactName],
    ["Email", application.email],
    ["Website", application.website],
    ["Social", application.socialHandle || "—"],
    ["Proof of business", application.hasProof ? "Attached in the application files" : "Not provided"],
    ["OFFFEED commission", `${application.commissionRate * 100}% on completed sales · brand receives ${100 - application.commissionRate * 100}%`],
  ];

  const { createBrandApprovalToken, getBrandReviewUrl } = await import("./brand-approval.server");
  const reviewUrl = getBrandReviewUrl(await createBrandApprovalToken(application.applicationId));

  const html = `<div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#2b1c18">
<h2 style="font-weight:600">New brand application — ${escapeHtml(application.brandName)}</h2>
<table cellpadding="6" style="border-collapse:collapse">${rows
    .map(([label, value]) => `<tr><td style="color:#8a6f68">${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`)
    .join("")}</table>
<p style="margin-top:18px;color:#8a6f68">About the brand</p>
<p style="white-space:pre-wrap">${escapeHtml(application.description)}</p>
 <p style="margin:24px 0 10px"><a href="${reviewUrl}" style="display:inline-block;background:#9e5f69;color:#fff;text-decoration:none;padding:12px 18px;border-radius:6px;font-weight:600">Review &amp; decide</a></p>
 <p style="font-size:12px;color:#8a6f68">This private review link expires in 7 days and lets you approve or decline the application.</p>
<p style="margin-top:18px;color:#8a6f68">Logo and cover images are stored privately with the application.</p>
</div>`;

  const text = `${rows.map(([label, value]) => `${label}: ${value}`).join("\n")}\n\nAbout the brand:\n${application.description}\n\nReview and decide: ${reviewUrl}`;

  const message = [
    `To: ${NOTIFY_ADDRESS}`,
    `Subject: ${header(`New OFFFEED brand application — ${application.brandName}`)}`,
    "MIME-Version: 1.0",
    'Content-Type: multipart/alternative; boundary="offfeed-boundary"',
    "",
    "--offfeed-boundary",
    'Content-Type: text/plain; charset="UTF-8"',
    "",
    text,
    "",
    "--offfeed-boundary",
    'Content-Type: text/html; charset="UTF-8"',
    "",
    html,
    "",
    "--offfeed-boundary--",
    "",
  ].join("\r\n");

  const raw = base64(message).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const response = await fetch(`${GATEWAY_URL}/users/me/messages/send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": connectionKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(`[brand-application-email] Gmail send failed [${response.status}]: ${body}`);
  }
}

export async function sendBrandDecisionEmail({ brandName, email, approved, reason, commissionRate }: {
  brandName: string;
  email: string;
  approved: boolean;
  reason?: string | undefined;
  commissionRate: number;
}): Promise<void> {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const connectionKey = process.env["GOOGLE_MAIL_API_KEY"];
  if (!lovableKey || !connectionKey) {
    console.error("[brand-decision-email] Gmail connection is not configured.");
    return;
  }

  const subject = approved ? `OFFFEED approved ${brandName}` : `An update on your OFFFEED application`;
  const headline = approved ? `Welcome to OFFFEED, ${brandName}.` : `An update on your OFFFEED application`;
  const body = approved
    ? `Your brand has been approved. You can now sign in to OFFFEED and start preparing your products for the marketplace. OFFFEED's platform commission is ${commissionRate * 100}% on completed sales, with ${100 - commissionRate * 100}% paid to your brand.`
    : `Thank you for introducing ${brandName} to OFFFEED. We’re not able to approve the application at this time.${reason ? ` Review note: ${reason}` : ""}`;
  const html = `<div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#2b1c18"><h2 style="font-weight:600">${escapeHtml(headline)}</h2><p>${escapeHtml(body)}</p>${approved ? `<p style="color:#8a6f68">There are no upfront subscription or listing fees.</p>` : ""}<p>With care,<br>OFFFEED</p></div>`;
  const text = `${headline}\n\n${body}\n\nWith care,\nOFFFEED`;
  const message = [
    `To: ${email}`,
    `Subject: ${header(subject)}`,
    "MIME-Version: 1.0",
    'Content-Type: multipart/alternative; boundary="offfeed-decision-boundary"',
    "",
    "--offfeed-decision-boundary",
    'Content-Type: text/plain; charset="UTF-8"',
    "",
    text,
    "",
    "--offfeed-decision-boundary",
    'Content-Type: text/html; charset="UTF-8"',
    "",
    html,
    "",
    "--offfeed-decision-boundary--",
    "",
  ].join("\r\n");
  const raw = base64(message).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const response = await fetch(`${GATEWAY_URL}/users/me/messages/send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": connectionKey, "Content-Type": "application/json" },
    body: JSON.stringify({ raw }),
  });
  if (!response.ok) console.error(`[brand-decision-email] Gmail send failed [${response.status}]: ${await response.text()}`);
}
