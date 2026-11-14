# Aptitude Mind Plus — Premium Website (version 2)

Modern, accessible, framework-free educational website, with a free-tier Cloudflare Pages + D1 moderation backend.

**Status:** Source and tested local preview are ready. Public hosting, the real D1 binding, and private admin credentials must still be configured by the owner. This is not a live website yet. No user uploads or enquiries will be accepted until the backend is configured, and the interface says so clearly.

## Contents

- Home: streamlined hero, rotating and manually controlled announcement strip, exam-colour cards, featured lesson and class enrolment CTA.
- Concepts: searchable topic roadmap with clearly marked ready/planned lessons.
- Practice: an original Units Digit lesson and an interactive eight-question quiz with explanations.
- PYQ Library: fetches **approved** questions only. An independent official verification checkbox distinguishes actual verified PYQs from community practice.
- Courses: UPSC CSAT, GATE General Aptitude, SSC, Banking, APPSC/TGPSC, Railways; **₹3,000 per standard course** (not per session or per month). Scope and duration must be confirmed before payment.
- Tutoring: application form and course enquiry capture. No money is taken on-site.
- Submit a Question: text and/or photo upload (JPEG compression), optional exam year/source/answer/contact; all initially private and pending. Content is NOT auto-published.
- Admin: private password-based review dashboard with Approve & Publish / Reject, source verification, and private enquiries.
- Privacy: starter disclosures and operator checks still needed before public launch.

> **Logo:** The supplied package retains the `brand.svg` mark from the first website. No separately verifiable owner-supplied logo image was located in the connected Aptitude Mind Plus folder, so it must be replaced with the approved logo asset before final branding sign-off. Put it in `public/assets/brand.svg` and maintain its aspect ratio.

## Completely free infrastructure, within usage limits

- **Cloudflare Pages:** free `*.pages.dev` subdomain, HTTPS, static file hosting, and Pages Functions.
- **Cloudflare D1:** database free tier, sufficient for a small pilot. Limits include 500 MB per D1 database and maximum 2 MB row size, hence we compress images in-browser. D1 also has daily read/write caps and is NOT limitless.
- **GitHub:** source control and automatic Cloudflare Git integration (make a separate website repo when possible).
- No paid npm dependencies, external fonts, tracking libraries or subscription infrastructure.
- A custom `.com` is normally **not free**. `aptitudemindplus.pages.dev` is a suggested slug only, not verified or registered.
- Personal Google Drive storage is **not** used as a public question-image origin: D1 stores compressed images with access controls; Drive can hold working teaching PDFs separately.

## Deploy the **full site** correctly (important)

**Do not use Cloudflare Dashboard drag-and-drop Direct Upload** for the full package. It does not compile the `/functions` directory, so question submissions and admin approval would not work. Use Git integration or the Wrangler CLI; they support Pages Functions.

1. The website has its own `website/` folder inside the existing `aptitude-mind-plus-daily` repository, isolated from the Python social publishing workflow. Merge the website pull request first. The folder contains `public/`, `functions/`, and `schema/`.
2. In Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git. Select `VenkataKrishnaYalagala/aptitude-mind-plus-daily`, production branch `main`, set the **root directory to `website`**, framework **None**, build command `exit 0`, output directory `public` (the `functions/` folder is discovered relative to the website root).
3. Choose an available project slug, ideally `aptitudemindplus`, and deploy. Cloudflare provides the actual `https://<project>.pages.dev` address.
4. In Cloudflare → Storage & Databases → D1, create a database named `aptitudemindplus-db`.
5. Initialise the database using Cloudflare D1 SQL console, or with the official Wrangler CLI after authenticating:

   ```bash
   npx wrangler d1 execute aptitudemindplus-db --remote --file=./schema/schema.sql
   ```

   `npx wrangler` fetches Cloudflare's official Wrangler package. Optionally install it for local development, but the deployed site requires no build dependencies.
6. In the Pages project → **Settings → Bindings**, add a **D1 database** binding with variable name **`DB`**, targeting `aptitudemindplus-db` (production environment). Redeploy to apply binding.
7. In Pages project → **Settings → Variables and Secrets**, add **secret** `ADMIN_PASSWORD` containing a unique password of **18+ characters**, and **secret** `SESSION_SECRET` containing a different cryptographically random string of **32+ characters**. Do **not** upload or commit these to GitHub. Set them in production (and preview if desired). Redeploy after configuring.
8. Visit `/api/health`: `{"ready":true}` confirms the DB binding and admin credentials are visible to Pages Functions. Visit `/admin.html` and sign in securely. Upload a **small original question** from `/submit.html`; verify it is in your moderation queue and **not** visible on `/pyqs.html`. Approve it, then verify it appears on `/pyqs.html`. Reject a second sample and verify it never appears publicly. Test an actual ₹3,000 course enquiry and check the **Course enquiries** tab.
9. Only then share the website publicly. Change links in `public/assets/config.js` to your verified YouTube / social profiles. Finalise privacy and contact information before collecting real learner data.

For local full-stack testing, Cloudflare offers `wrangler pages dev public --d1=DB` with a local database, but it requires a configured Wrangler environment and local D1 schema. For visual-only preview, run `python3 -m http.server 8000 --directory public` and open `http://localhost:8000`. The forms will correctly indicate that live submission requires server setup.

## How question approval actually works

`POST /api/questions` → D1 `questions.status='pending'` (optional image stored privately in `question_images`) → authenticated `/admin.html` → `POST /api/admin/review` to mark `approved` or `rejected` → `GET /api/questions` returns only `approved` rows. `/api/image/{id}` checks for approval or a valid admin session before returning image bytes. Contributor email is never returned publicly. Images and form data are never inserted into rendered HTML unsanitized; dynamic text uses `textContent`.

**Official PYQ status is extra:** A question only receives the official label if you explicitly tick the official-source verification checkbox when approving it, and it must include a source URL and exam year. **Approval alone never makes a question official.** Check the official exam paper, answer key and reproduction permissions before marking official.

Admin access uses a 12-hour HMAC-signed, HttpOnly, SameSite=Strict session cookie, and the server validates write-request origins. Sign-in is rate limited per hashed IP. Public submissions are rate limited (up to five questions and three course applications daily per hashed IP). Image submissions are browser-compressed into ≤780k-character JPEG data URLs to stay under D1's 2 MB row limit. No contributor is promised instant publication.

These protections are a careful starter design, not a security audit. Before larger-scale launch, add a free Cloudflare Turnstile anti-bot challenge, a clear deletion/retention process, verified contact details, copyright handling and periodic database backups. The site deliberately does **not** collect card numbers, accept payments or authenticate ordinary uploaders; those require separate review.

## Editing

- Page content: `build_site.py` (run `python3 build_site.py`, which replaces generated pages).
- Visual system: `public/assets/style.css`.
- Interactions: `public/assets/app.js`.
- Brand mark: `public/assets/brand.svg` (placeholder until verified).
- Public social URLs: `public/assets/config.js`.
- Server functions: `functions/api/` (never place secrets or write sensitive credentials in `public/`).
- Database schema: `schema/schema.sql`.
- Automated backend tests: `npm test`.

## Security & launch checklist

- [ ] Final approved logo asset installed.
- [ ] Private D1 binding and both admin secrets set.
- [ ] Live submission, visibility, approval, and rejection tested.
- [ ] Verified contact method, retention policy, copyright and privacy notice finalized.
- [ ] Confirm each ₹3,000 course's dates, syllabus, teaching format and refund terms before accepting funds.
- [ ] Configure Cloudflare Turnstile/WAF if opening anonymous uploads widely.
- [ ] Recheck exam-specific content accuracy and official PYQ provenance.
- [ ] Add payment checkout only after reviewing lawful payment methods and fees. No card collection on Cloudflare Free.