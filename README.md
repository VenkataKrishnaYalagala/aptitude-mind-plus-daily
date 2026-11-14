# Aptitude Mind Plus — Hourly Instagram & Facebook Publisher

**Status: CODE DEPLOYED, LIVE POSTING DISABLED.** This public GitHub repository contains an hourly scheduler, a deterministic question generator, image templates, and a Meta publishing adapter. No Meta account has been authorized here yet; nothing has been published to Instagram or Facebook.

## What it does

- Each day at **08:00, 09:00, ... 22:00 IST** (15 slots), GitHub Actions runs the publisher. A **:20 fallback run** checks the SAME slot; it is not a second post.
- Creates a **1080 × 1350 feed question image** and a **1080 × 1920 Instagram Story image**.
- Prepares a caption with the answer and worked solution.
- When enabled and authorized, publishes an **Instagram feed photo**, an **Instagram Story**, and a **Facebook Page photo post**.
- Records per-platform publication states so a delayed or failed run does not blindly republish an item.
- Queries the account's **live Instagram content-publishing quota** before posting, rather than assuming a 50- or 100-item limit.
- Uses only original, arithmetic-checked practice questions initially. **No example is represented as a genuine PYQ.** Authentic exam PYQs need a separately verified official paper, year, answer key, and a content approval before entering the publishing queue.

## Setup — do in order

1. **Review the template:** Run GitHub [Actions](../../actions) → **AMP Hourly Instagram and Facebook** → **Run workflow**. Leave **live unchecked**. If the current IST time is outside 08:00–22:00, set \`preview_slot\` to a valid sample such as \`2026-11-15T08\`. The action creates public images in [docs/cards](docs/cards), but does not post to Meta. Examine feed and Story screenshots and caption.

2. **Set up Meta Professional accounts:** Use an Instagram **Business account** for the full feed-and-Story workflow, linked to a Facebook Page you manage with content-creation access. Check the association in [Meta Business Suite](https://business.facebook.com/). A personal account is not eligible for this programmatic setup.

3. **Create a Meta developer app:** Visit [Meta for Developers](https://developers.facebook.com/apps/). Use **Facebook Login for Business** and Instagram Graph API (Facebook Login path), because this implementation publishes to Instagram via \`graph.facebook.com\` and also to a Facebook Page. Grant the required permissions to your app user as applicable: \`instagram_basic\`, \`instagram_content_publish\`, \`pages_show_list\`, \`pages_read_engagement\`, and \`pages_manage_posts\`. Meta may require additional review or access levels depending on app mode and account roles. Follow the current official dashboard prompts.

4. **Discover IDs/tokens using Meta's official tools (do not paste them into ChatGPT):** Use the Meta Graph API Explorer with your app and approved permissions. A user token with Page permissions can query \`GET /me/accounts\` to identify the Page and obtain its Page token. Use \`GET /{PAGE_ID}?fields=instagram_business_account\` to identify the linked Instagram Business account ID. The Instagram publishing user token and Facebook Page posting token may differ. Check actual token permission scopes and expiration in Meta's token tools.

5. **Enter secrets on GitHub:** Open [Repository Settings — Actions secrets](../../settings/secrets/actions). Add **repository secrets** (not variables, never commits or chat messages):
   - \`IG_USER_ID\` — the linked Instagram Business account ID.
   - \`IG_ACCESS_TOKEN\` — a Facebook Login token with authorized Instagram publishing rights.
   - \`FB_PAGE_ID\` — your Facebook Page ID.
   - \`FB_PAGE_ACCESS_TOKEN\` — a Page token allowed to create Page photo posts.

6. **Test with the approval gates OFF:** Run the workflow manually with **live unchecked** and inspect the generated cards, captions, logs, and the test results. The default action path does not contact Meta to publish.

7. **Approve the reusable template once:** When you are satisfied with the feed graphic, Story graphic, wording, and automated original-practice policy, change \`config/brand.json\` → \`template_approved: true\`. This is a persistent design authorization, not a per-post prompt. Leave the repository variable disabled until you have checked the Meta scopes.

8. **Enable real publishing deliberately:** In [Repository Settings — Actions variables](../../settings/variables/actions), set the *repository variable* \`PUBLISH_ENABLED\` to \`true\`. It defaults to disabled if missing. Run **one** manual workflow with **live checked** *within 08:00–22:00 IST* and **no preview_slot**. This is a real publication to the connected accounts if credentials/permissions are valid. Confirm all three results on Meta before leaving the scheduler running.

9. **Monitor and stop:** Use [Actions](../../actions) to inspect failures. To stop all live posts immediately, set \`PUBLISH_ENABLED=false\`. To pause the entire schedule, disable the workflow in Actions. The generator and its twice-hourly runs need no paid LLM or always-on Mac.

## Security and practical limitations

- **Never** paste Meta access tokens, app secrets, passwords, student data, or copyrighted textbook pages into this public repository, a GitHub issue, or a chat. Store Meta tokens only in encrypted GitHub Actions secrets.
- An approved template alone **never** enables live posting. Both the config approval and \`PUBLISH_ENABLED=true\` are required.
- A successfully published Instagram container is persisted as completed; ambiguous network failures stay \`pending\` until manually inspected. This prevents automatic duplicate-post attempts.
- Instagram/Meta may refuse an operation due to account type, expiring tokens, app review, quotas, permissions, or media rules. Some Story elements (stickers, music, interactive polls) cannot be created by this minimal API script.
- Meta tokens may expire or be revoked. **Automatic OAuth renewal is not implemented**; refresh via the official Meta tools when necessary.
- GitHub Actions scheduled jobs can be delayed or dropped; the :20 fallback is a best-effort backup, not a guaranteed delivery time.
- **Only Instagram Story is included**, not Facebook Story. Facebook receives the same educational photo as a Facebook Page feed post.
- Changes to the art, question formats, or inclusion of authentic PYQs should be reviewed before broad publication. For factual/PYQ content that cannot be fully verified, do not auto-publish.

## Developers: no external publishing package required

\`\`\`bash
pip install -r requirements.txt
python -m unittest discover -s tests -v
python publisher.py prepare --slot 2026-11-15T08
python publisher.py publish --slot 2026-11-15T08
\`\`\`

These last two commands are **preview-only**. Real publishing requires \`python publisher.py publish --live\` with the user's current IST time, valid Meta credentials, a public JPEG URL, and both approval gates.

API documentation: [Instagram Graph API](https://developers.facebook.com/docs/instagram-platform/), [Meta Page photo endpoint](https://developers.facebook.com/docs/graph-api/reference/photo/), [GitHub Actions schedules](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows).
