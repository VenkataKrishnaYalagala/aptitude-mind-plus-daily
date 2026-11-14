"""Quota-aware daily publishing, with no live actions by default.

Instagram's rolling quota includes BOTH feed media and Stories. Each verified
question is one Instagram feed image + one Story + matching Facebook feed post.
"""
from __future__ import annotations
import argparse
import os
import sys
from datetime import datetime

import publisher

SLOTS_PER_DAY = len(publisher.HOURS)
KNOWN_PREVIEW_LIMIT = 100


def hourly_pairs(quota_total: int, hour: int) -> int:
    """Spread the live quota in equal feed/Story pairs across 15 hours."""
    if type(quota_total) is not int or quota_total < 0:
        raise ValueError('Invalid publishing quota')
    if hour not in publisher.HOURS:
        raise ValueError('Outside the 08:00-22:00 IST schedule')
    day_pairs = quota_total // 2
    index = hour - publisher.HOURS.start
    return ((index + 1) * day_pairs) // SLOTS_PER_DAY - (index * day_pairs) // SLOTS_PER_DAY


def due_pairs(quota_total: int, current: datetime, all_hour=False) -> list[str]:
    now = current.astimezone(publisher.IST)
    hour_key = now.strftime('%Y-%m-%dT%H')
    amount = hourly_pairs(quota_total, now.hour)
    due = []
    for i in range(1, amount + 1):
        # Space posts out, rather than publishing all media together at 8 AM.
        due_minute = ((2 * i - 1) * 60) // (2 * amount)
        if all_hour or now.minute >= due_minute:
            due.append(f'{hour_key}-{i:02d}')
    return due


def account_quota() -> tuple[int, int]:
    ig_id = os.environ.get('IG_USER_ID', '')
    token = os.environ.get('IG_ACCESS_TOKEN', '')
    if not ig_id or not token:
        raise RuntimeError('Meta account not authorized; missing GitHub Actions secrets')
    result = publisher.meta('GET', f'{ig_id}/content_publishing_limit', token,
                            {'fields': 'quota_usage,config'})
    record = result['data'][0] if isinstance(result.get('data'), list) and result['data'] else result
    config = record.get('config')
    if not isinstance(config, dict):
        raise RuntimeError('Account quota configuration is not available')
    used, total = record.get('quota_usage'), config.get('quota_total')
    duration = config.get('quota_duration', 86400)
    if type(total) is not int or type(used) is not int or total < 2 or not (0 <= used <= total):
        raise RuntimeError('Invalid live account quota; refusing to assume 50 or 100')
    if duration != 86400:
        raise RuntimeError('Unexpected quota window; manual inspection required')
    return total, used


def live_is_enabled() -> bool:
    conf = publisher.load_json(publisher.CONFIG, {})
    return (os.environ.get('PUBLISH_ENABLED', '').lower() == 'true'
            and conf.get('template_approved') is True)


def process(mode: str, *, preview=False, slot=None, preview_quota=KNOWN_PREVIEW_LIMIT):
    if slot and not preview:
        raise ValueError('Custom slots are permitted for preview only')
    if not preview and not live_is_enabled():
        print('LIVE POSTING DISABLED: both approval gates are required')
        return 'disabled'
    now = datetime.now(publisher.IST)
    if slot:
        now = datetime.strptime(slot, '%Y-%m-%dT%H').replace(tzinfo=publisher.IST)
    if now.hour not in publisher.HOURS:
        raise ValueError('Outside posting hours')
    if preview:
        total, used = preview_quota, 0
        due = due_pairs(total, now, all_hour=True)
    else:
        total, used = account_quota()
        due = due_pairs(total, now)
    print(f'Account quota {total} / 24h; used {used}; hour {now.hour:02}; due pairs {len(due)}; mode={mode}')
    if mode == 'prepare':
        for sid in due:
            publisher.prepare(sid)
        return len(due)
    if mode == 'publish':
        if preview:
            for sid in due:
                publisher.publish(sid, live=False)
            return len(due)
        remaining = total - used
        state = publisher.load_json(publisher.STATE, {})
        attempted = 0
        for sid in due:
            statuses = state.get(sid, {})
            needed = sum(statuses.get(ch, {}).get('status') != 'published'
                         for ch in ('ig_feed', 'ig_story'))
            if needed > remaining:
                print('Quota exhausted; pausing without over-posting')
                break
            publisher.publish(sid, live=True)
            remaining -= needed
            attempted += 1
        return attempted
    raise ValueError('Expected prepare or publish mode')


def main():
    p = argparse.ArgumentParser(description='Publish according to the account-specific Instagram quota')
    p.add_argument('mode', choices=('prepare', 'publish'))
    p.add_argument('--preview', action='store_true', help='No Meta API calls or live publishing')
    p.add_argument('--slot', help='Preview hour YYYY-MM-DDTHH (preview only)')
    p.add_argument('--preview-quota', type=int, choices=(50, 100), default=100)
    args = p.parse_args()
    try:
        process(args.mode, preview=args.preview, slot=args.slot, preview_quota=args.preview_quota)
    except Exception as e:
        print(f'ERROR: {e}', file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
