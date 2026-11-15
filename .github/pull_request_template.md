## Purpose

Summarize changes to content generation, social templates, scheduling or publishing.

## Safety checks

- [ ] Ran `python -m unittest discover -s tests -v`
- [ ] Validated previews before considering publication
- [ ] Confirmed every claimed PYQ is verified against an official paper and key
- [ ] Confirmed no API keys, account IDs, tokens or private student information are committed
- [ ] Did not enable `PUBLISH_ENABLED`, `template_approved` or `live_enabled` without explicit owner approval
- [ ] Did not introduce live posting in tests or change the quota safety logic without review
- [ ] Checked image, font and source rights for commercial/social use

## Operational impact

Explain any changes to GitHub Actions triggers, Meta API permissions, rate limits, media storage or posting frequency.
