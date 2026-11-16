# Contributing to Aptitude Mind Plus Daily

This repository generates verified original-practice social media assets and contains a Meta publishing adapter. It is **separate** from the educational website at [aptitude-mind-plus](https://github.com/VenkataKrishnaYalagala/aptitude-mind-plus).

## Safe development loop

1. Make changes on a branch and open a pull request.
2. Install the Python requirement in a virtual environment.
3. Run `python -m unittest discover -s tests -v` and `python -m py_compile publisher.py batch_publisher.py`.
4. Preview generated cards and captions, inspect arithmetic, spelling, mobile readability and image rights.
5. Keep live posting disabled unless the owner explicitly authorizes a controlled publication run.

The `Publisher validation (no publishing)` workflow uses **no** Meta credentials and has read-only GitHub permissions. It exists to test changes on pull requests and pushes even when the scheduled publisher is disabled.

## Publication guardrails

- Keep `config/brand.json` `template_approved` and `publishing_policy.live_enabled` false during development.
- Keep the GitHub variable `PUBLISH_ENABLED` disabled unless intentional activation is authorized.
- Never hard-code an Instagram quota or bypass rate-limit checks.
- Do not publish unverified past examination questions as PYQs.
- Do not add copy-protected text, copyrighted artwork, unlicensed music or private student data.
- Use GitHub Actions Secrets for Meta credentials, not source files, issues, logs or pull request comments.
- Generated media and queue/state files must be reviewed for personal or confidential information before commits.

See [SECURITY.md](SECURITY.md) for vulnerability reporting guidance.
