# Aptitude Mind Plus Daily Publisher

This repository will host an approval-controlled content queue and scheduled publishing workflows for Aptitude Mind Plus on Instagram and a Facebook Page, using Meta's official APIs.

**Publishing is not yet enabled.** Live posting requires confirmed Instagram Business and Facebook Page authorization, verified question content, configured GitHub Actions secrets, and a successful dry run.

## Planned schedule

- One feed post and one Story per hour, subject to Meta's live account publishing quota.
- A matching Facebook Page post for the hourly educational card.
- Publish original practice questions separately from official, source-verified previous-year questions (PYQs).
- No duplicate posting. No credentials, tokens, or personal data in this public repository.

## Security

Store API secrets in GitHub Actions Secrets, never in tracked files or chats. Start disabled, test without publishing, then grant one-time authorization for approved content batches.
