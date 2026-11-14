import os
import unittest
from datetime import datetime
from unittest.mock import patch
from zoneinfo import ZoneInfo

import batch_publisher as b

IST = ZoneInfo('Asia/Kolkata')


class QuotaSchedulingTests(unittest.TestCase):
    def test_maximum_quota_distribution(self):
        for quota, pairs in [(50, 25), (100, 50)]:
            nums = [b.hourly_pairs(quota, h) for h in range(8, 23)]
            self.assertEqual(sum(nums), pairs)
            self.assertGreaterEqual(min(nums), 1)
            self.assertLessEqual(max(nums), 4)

    def test_spread_and_reuse(self):
        now = datetime(2026, 11, 17, 8, 7, tzinfo=IST)
        self.assertEqual(len(b.due_pairs(100, now)), 0)
        self.assertEqual(len(b.due_pairs(50, now)), 0)
        now = now.replace(minute=52)
        self.assertEqual(len(b.due_pairs(100, now)), 3)
        self.assertEqual(len(b.due_pairs(50, now)), 1)
        self.assertTrue(all(x.startswith('2026-11-17T08-') for x in b.due_pairs(100, now)))

    def test_final_slot_releases_remaining_quota_at_2200(self):
        last = datetime(2026, 11, 17, 22, 0, tzinfo=IST)
        self.assertEqual(len(b.due_pairs(100, last)), b.hourly_pairs(100, 22))

    def test_each_pair_distinct_and_mathematically_checked(self):
        ids = []
        for h in range(8, 23):
            now = datetime(2026, 11, 17, h, 59, tzinfo=IST)
            for sid in b.due_pairs(100, now):
                rec = b.publisher.create_record(sid)
                ids.append(rec['id'])
                self.assertTrue(rec['verified'])
                self.assertEqual('original_practice', rec['source_type'])
        self.assertEqual(len(ids), 50)
        self.assertEqual(len(ids), len(set(ids)))

    def test_account_limit_response(self):
        good = {'data': [{'quota_usage': 18, 'config': {'quota_total': 50, 'quota_duration': 86400}}]}
        with patch.dict(os.environ, {'IG_USER_ID': 'test', 'IG_ACCESS_TOKEN': 'fake'}), \
             patch.object(b.publisher, 'meta', return_value=good):
            self.assertEqual((50, 18), b.account_quota())
        bad = {'data': [{'quota_usage': 3, 'config': {'quota_total': '100'}}]}
        with patch.dict(os.environ, {'IG_USER_ID': 'test', 'IG_ACCESS_TOKEN': 'fake'}), \
             patch.object(b.publisher, 'meta', return_value=bad):
            with self.assertRaises(RuntimeError):
                b.account_quota()

    def test_no_live_post_without_approval(self):
        with patch.object(b, 'live_is_enabled', return_value=False), \
             patch.object(b, 'account_quota') as quota:
            self.assertEqual('disabled', b.process('publish'))
            quota.assert_not_called()

    def test_preview_never_calls_meta(self):
        with patch.object(b.publisher, 'prepare') as prepare, \
             patch.object(b.publisher, 'meta') as meta:
            self.assertEqual(3, b.process('prepare', preview=True, slot='2026-11-17T08', preview_quota=100))
            self.assertEqual(3, prepare.call_count)
            meta.assert_not_called()

    def test_live_does_not_exceed_remaining_quota(self):
        fixed = datetime(2026, 11, 17, 9, 52, tzinfo=IST)
        fake_dt = type('D', (), {'now': staticmethod(lambda tz: fixed)})
        with patch.object(b, 'datetime', fake_dt), \
             patch.object(b, 'live_is_enabled', return_value=True), \
             patch.object(b, 'account_quota', return_value=(100, 98)), \
             patch.object(b.publisher, 'load_json', return_value={}), \
             patch.object(b.publisher, 'publish') as publication:
            self.assertEqual(1, b.process('publish'))
            publication.assert_called_once()


if __name__ == '__main__':
    unittest.main()
