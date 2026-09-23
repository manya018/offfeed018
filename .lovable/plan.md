# OFFFEED for Brands

## Goal
Create a premium brand-partnership experience where fashion and lifestyle brands can apply, manage products, and appear naturally throughout OFFFEED.

## What will be built

### Public brand experience
- Add **For Brands** to the main navigation and a brand CTA on the home page.
- Create a polished `/for-brands` landing page with editorial imagery, benefit cards, and strong application calls to action.
- Create public brand profiles with story, links, follow controls, collections, and editorial product grids.
- Add **Brands we're obsessed with ♡** to Discover as a horizontal brand showcase.
- Add **Shop the Look** product recommendations to outfit detail pages.

### Brand onboarding
- Add email/password and Google sign-in for brand representatives.
- Build a four-step registration flow for details, identity, business information, and verification.
- Support logo, cover image, and optional proof uploads with clear previews and validation.
- Show a dedicated under-review confirmation after submission; applications will not be auto-verified.

### Brand workspace
- Create a protected brand dashboard with application status, profile views, saves, likes, followers, and product counts.
- Add product management with create/edit forms covering image, details, category, price, link, sizes, colors, and tags.
- Add profile editing, collections, and analytics sections.
- Newly published products will appear in OFFFEED discovery and on the brand’s public profile.

## Data and safety
- Store brand profiles separately from account identities, with secure access rules so representatives manage only their own brand.
- Store account roles in a separate protected roles table.
- Store applications, products, collections, follows, saves, likes, and analytics events in Lovable Cloud.
- Validate form data both before submission and on the server.
- Restrict public discovery to approved brands and published products; pending applications remain private to their owners.

## Visual direction
- Preserve OFFFEED’s blush, cream, rose, and chocolate palette with editorial typography and generous whitespace.
- Use the existing fashion imagery for a cohesive first version, with refined step transitions and compact, premium controls.
- Ensure the complete flow works cleanly on mobile and desktop.

## Verification
- Test the landing page, registration steps, pending confirmation, dashboard, product publishing, public profile, discovery brand carousel, and Shop the Look integration.
- Verify protected brand data is inaccessible to other accounts and that only approved brands/products appear publicly.
