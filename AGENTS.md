<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Brand application data flow
- Keep applicant uploads in a private, applicant-scoped Cloud Storage bucket and submit application rows through authenticated server functions with owner-only RLS; pending brand details must never be publicly discoverable.
- Store the fixed 18% marketplace commission and agreement timestamp on each application; Gmail decisions use expiring HMAC-signed review links and privileged server-side status changes so forwarded links remain the only bearer credential.

## Shared style spaces
- Keep the Her/Him preference in one app-wide client provider and persist it locally so the selected editorial collection and semantic color theme stay consistent across routes; this avoids competing per-page settings.

## Public brand storefronts
- Read public storefront data through server functions using the publishable client and narrowly granted approved-brand/product fields; never use the admin client for storefront reads, so pending applications and owner-only data remain private.
- Keep brand logo and cover images in private storage and grant public access only to the exact image objects of approved brands; this preserves private proof uploads while enabling public storefronts.
