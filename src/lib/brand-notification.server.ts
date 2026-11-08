const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";
const NOTIFY_ADDRESS = "offfeeed@gmail.com";

const base64 = (value: string) =>
  btoa(Array.from(new TextEncoder().encode(value), (byte) => String.fromCharCode(byte)).join(""));
const header = (value: string) => (/^[\x00-\x7F]*$/.test(value) ? value : `=?UTF-8?B?${base64(value)}?=`);
const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const EXPECTED_SENDER = "offfeeed@gmail.com";

async function assertExpectedSender(lovableKey: string, connectionKey: string): Promise<void> {
  const response = await fetch(`${GATEWAY_URL}/users/me/profile`, {
    headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": connectionKey },
  });
  if (!response.ok) throw new Error(`Gmail sender verification failed [${response.status}].`);
  const profile = await response.json() as { emailAddress?: string };
  if ((profile.emailAddress ?? "").trim().toLowerCase() !== EXPECTED_SENDER) {
    throw new Error("The connected Gmail account does not match OFFFEED approved sender address. No email was sent.");
  }
}

async function sendVerifiedEmail(to: string, subject: string, text: string, html: string): Promise<void> {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const connectionKey = process.env["GOOGLE_MAIL_API_KEY"];
  if (!lovableKey || !connectionKey) throw new Error("Gmail connection is not configured.");
  await assertExpectedSender(lovableKey, connectionKey);
  const boundary = "offfeed-notification-boundary";
  const message = [
    `To: ${to}`,
    `Subject: ${header(subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "", text, "",
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "", html, "",
    `--${boundary}--`,
    "",
  ].join("\r\n");
  const raw = base64(message).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const response = await fetch(`${GATEWAY_URL}/users/me/messages/send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": connectionKey, "Content-Type": "application/json" },
    body: JSON.stringify({ raw }),
  });
  if (!response.ok) throw new Error(`Gmail send failed [${response.status}]: ${await response.text()}`);
}

export type BrandApplicationEmail = {
  applicationId: string;
  brandName: string;
  contactName: string;
  email: string;
  category: string;
  audience: string[];
  audienceCategories: { her: string[]; him: string[]; home: string[] };
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
    ["Collection for", application.audience.map((audience) => `${audience === "her" ? "Her" : audience === "him" ? "Him" : "HOME"}: ${(application.audienceCategories[audience as "her" | "him" | "home"] ?? []).join(", ") || "Not selected"}`).join(" · ")],
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

  await assertExpectedSender(lovableKey, connectionKey);

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
    console.error(`[brand-application-email] Admin notification failed [${response.status}]: ${body}`);
  }

  const applicantText = `Hi ${application.contactName},\n\nThank you for applying to join OFFFEED with ${application.brandName}. We have received your application and our team will review it. We will email you again when a decision has been made.\n\nOFFFEED team`;
  const applicantHtml = `<div style="font-family:Helvetica,Arial,sans-serif;line-height:1.7;color:#2b1c18"><h2>We've received your brand application.</h2><p>Hi ${escapeHtml(application.contactName)},</p><p>Thank you for applying to join OFFFEED with ${escapeHtml(application.brandName)}. Your application has been received and is now under review.</p><p>We'll email you again when a decision has been made.</p><p>With care,<br>OFFFEED team</p></div>`;
  await sendVerifiedEmail(application.email, "OFFFEED brand application received", applicantText, applicantHtml);
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
    throw new Error("Gmail connection is not configured: LOVABLE_API_KEY or GOOGLE_MAIL_API_KEY is missing.");
  }

  const subject = approved ? `Welcome to OFFFEED, ${brandName}!` : `An update on your OFFFEED application`;
  const headline = approved ? `Welcome to OFFFEED, ${brandName}.` : `An update on your OFFFEED application`;
  const body = approved
    ? `We’re delighted to let you know that ${brandName} has been approved to join OFFFEED. Thank you for choosing to be part of a marketplace that celebrates independent brands. You can now sign in and begin preparing your products for the marketplace. Our platform commission is ${commissionRate * 100}% on completed sales, and ${100 - commissionRate * 100}% goes to your brand.`
    : `Thank you for taking the time to introduce ${brandName} to OFFFEED and for sharing your work with us. After careful consideration, we’re sorry that we’re unable to move forward with the application at this time. This decision doesn’t take away from the effort you’ve put into your brand, and we truly appreciate your interest in OFFFEED.${reason ? `\n\nA note from our review team: ${reason}` : ""} We wish you and your brand all the very best, and hope there may be an opportunity to connect in the future.`;
  const html = `<div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.7;color:#2b1c18"><h2 style="font-weight:600">${escapeHtml(headline)}</h2><p>${escapeHtml(body).replace(/\n/g, "<br>")}</p>${approved ? `<p style="color:#8a6f68">There are no upfront subscription or listing fees.</p>` : ""}<p>With care,<br>OFFFEED team</p></div>`;
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
  await assertExpectedSender(lovableKey, connectionKey);

  const response = await fetch(`${GATEWAY_URL}/users/me/messages/send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": connectionKey, "Content-Type": "application/json" },
    body: JSON.stringify({ raw }),
  });
  if (!response.ok) throw new Error(`Gmail send failed [${response.status}]: ${await response.text()}`);
}


export async function sendOrderNotificationEmails(order: {
  orderNumber: string; customerName: string; customerEmail: string; brandName: string; brandEmail: string;
  productName: string; quantity: number; lineTotal: number; selectedSize?: string; selectedColor?: string;
}): Promise<void> {
  const variant = [order.selectedSize, order.selectedColor].filter(Boolean).join(" · ");
  const detail = `Order: ${order.orderNumber}\nProduct: ${order.productName}\nQuantity: ${order.quantity}\n${variant ? `Variant: ${variant}\n` : ""}Subtotal: ₹${order.lineTotal.toLocaleString("en-IN")}`;
  const customerText = `Hi ${order.customerName},\n\nThank you for shopping with OFFFEED. Your order has been placed successfully.\n\n${detail}\n\nWe'll email you when its status changes.\n\nOFFFEED`;
  const customerHtml = `<div style="font-family:Helvetica,Arial,sans-serif;line-height:1.7;color:#2b1c18"><h2>Thank you for your order.</h2><p>Hi ${escapeHtml(order.customerName)}, your order has been placed successfully.</p><p style="white-space:pre-line">${escapeHtml(detail)}</p><p>We'll email you when its status changes.</p><p>OFFFEED</p></div>`;
  const brandText = `Hi ${order.brandName},\n\nYou have received a new order on OFFFEED.\n\n${detail}\nCustomer: ${order.customerName}\nCustomer email: ${order.customerEmail}\n\nPlease open your OFFFEED brand dashboard to review and fulfil this order.\n\nOFFFEED`;
  const brandHtml = `<div style="font-family:Helvetica,Arial,sans-serif;line-height:1.7;color:#2b1c18"><h2>You have a new OFFFEED order.</h2><p>Hi ${escapeHtml(order.brandName)}, a customer has placed an order for your brand.</p><p style="white-space:pre-line">${escapeHtml(detail)}</p><p>Customer: ${escapeHtml(order.customerName)}<br>Customer email: ${escapeHtml(order.customerEmail)}</p><p>Please open your OFFFEED brand dashboard to review and fulfil this order.</p><p>OFFFEED</p></div>`;
  const results = await Promise.allSettled([
    sendVerifiedEmail(order.customerEmail, `OFFFEED order confirmed — ${order.orderNumber}`, customerText, customerHtml),
    sendVerifiedEmail(order.brandEmail, `New OFFFEED order — ${order.orderNumber}`, brandText, brandHtml),
  ]);
  const failures = results.filter((result) => result.status === "rejected");
  if (failures.length) throw new Error(`${failures.length} order notification email(s) failed to send.`);
}

export async function sendOrderStatusEmail(order: {
  orderNumber: string; customerName: string; customerEmail: string; productName: string; status: string;
  trackingProvider?: string; trackingNumber?: string; trackingUrl?: string;
  estimatedDeliveryStart?: string | null; estimatedDeliveryEnd?: string | null;
}): Promise<void> {
  const statusLabel = order.status.replaceAll("_", " ");
  const tracking = [order.trackingProvider, order.trackingNumber].filter(Boolean).join(" · ");
  const delivery = [order.estimatedDeliveryStart, order.estimatedDeliveryEnd].filter(Boolean).join(" to ");
  const lines = [`Order: ${order.orderNumber}`, `Product: ${order.productName}`, `New status: ${statusLabel}`, tracking ? `Tracking: ${tracking}` : "", delivery ? `Estimated delivery: ${delivery}` : "", order.trackingUrl ? `Track your parcel: ${order.trackingUrl}` : ""].filter(Boolean).join("\n");
  const text = `Hi ${order.customerName},\n\nThere's an update on your OFFFEED order.\n\n${lines}\n\nOFFFEED`;
  const html = `<div style="font-family:Helvetica,Arial,sans-serif;line-height:1.7;color:#2b1c18"><h2>Your order status has been updated.</h2><p>Hi ${escapeHtml(order.customerName)}, there's an update on your OFFFEED order.</p><p style="white-space:pre-line">${escapeHtml(lines)}</p>${order.trackingUrl ? `<p><a href="${escapeHtml(order.trackingUrl)}">Track your parcel</a></p>` : ""}<p>OFFFEED</p></div>`;
  await sendVerifiedEmail(order.customerEmail, `OFFFEED order update — ${order.orderNumber}`, text, html);
}
