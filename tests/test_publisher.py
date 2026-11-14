import json, os, tempfile, unittest
from datetime import date, datetime, timedelta
from pathlib import Path
from unittest.mock import patch
from zoneinfo import ZoneInfo
import publisher

class ContentTests(unittest.TestCase):
    def test_fifteen_hour_window(self):
        self.assertEqual(list(range(8,23)),list(publisher.HOURS))
        self.assertEqual('2026-11-15T08',publisher.slot_for(datetime(2026,11,15,8,tzinfo=ZoneInfo('Asia/Kolkata'))))
        with self.assertRaises(ValueError):
            publisher.create_record('2026-11-15T23')

    def test_210_verified_original_questions(self):
        rows=[]
        for day in range(14):
            d=(date(2026,11,15)+timedelta(days=day)).isoformat()
            for h in publisher.HOURS:
                r=publisher.create_record(f'{d}T{h:02}')
                self.assertEqual('original_practice',r['source_type'])
                self.assertTrue(r['verified'])
                self.assertIn('NOT an official PYQ',r['caption'])
                self.assertLessEqual(len(r['caption']),2200)
                rows.append(r)
        self.assertEqual(len({x['id'] for x in rows}),210)
        self.assertGreater(len({x['question'] for x in rows}),190)

    def test_image_dimensions(self):
        from PIL import Image
        r=publisher.create_record('2026-11-15T10')
        with tempfile.TemporaryDirectory() as t:
            for story,size in ((False,(1080,1350)),(True,(1080,1920))):
                path=Path(t)/('story.jpg' if story else 'feed.jpg')
                publisher.render(r,path,story)
                with Image.open(path) as im:
                    self.assertEqual(size,im.size)
                    self.assertEqual('JPEG',im.format)

class SafetyTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.root=Path(self.tmp.name)
        (self.root/'config').mkdir()
        (self.root/'data').mkdir()
        self.slot='2026-11-15T10'
        self.record=publisher.create_record(self.slot)
        (self.root/'config/brand.json').write_text(json.dumps({'template_approved':False}))
        (self.root/'data/queue.json').write_text(json.dumps({self.slot:self.record}))
        (self.root/'data/state.json').write_text('{}')
        self.env={'PUBLISH_ENABLED':'true','PUBLIC_BASE_URL':'https://raw.githubusercontent.com/owner/repo/main',
                  'IG_USER_ID':'id','IG_ACCESS_TOKEN':'fake','FB_PAGE_ID':'page',
                  'FB_PAGE_ACCESS_TOKEN':'fake'}
        self.patchers=[]
        for name,path in [('ROOT',self.root),('CONFIG',self.root/'config/brand.json'),
                          ('QUEUE',self.root/'data/queue.json'),('STATE',self.root/'data/state.json')]:
            p=patch.object(publisher,name,path);p.start();self.patchers.append(p)
    def tearDown(self):
        for p in reversed(self.patchers): p.stop()
        self.tmp.cleanup()
    def save_state(self,state,slot,channel,status,media_id=None):
        state.setdefault(slot,{})[channel]={'status':status,'media_id':media_id}
        (self.root/'data/state.json').write_text(json.dumps(state))
    def approve(self):
        (self.root/'config/brand.json').write_text(json.dumps({'template_approved':True}))

    def test_dry_run_never_calls_meta(self):
        with patch.dict(os.environ,self.env,clear=True),patch.object(publisher,'meta') as request:
            self.assertEqual('dry-run',publisher.publish(self.slot,False))
            self.assertEqual('disabled',publisher.publish(self.slot,True))
            request.assert_not_called()

    def test_variable_gate(self):
        self.approve()
        with patch.dict(os.environ,{**self.env,'PUBLISH_ENABLED':'false'},clear=True):
            self.assertEqual('disabled',publisher.publish(self.slot,True))

    def test_live_three_channels_only_once(self):
        self.approve()
        calls=[]
        def ig(*args,**kwargs):
            calls.append('story' if kwargs.get('story') else 'feed')
            return 'test-ig-id'
        def fb(*args,**kwargs):
            calls.append('facebook');return {'id':'test-fb-id'}
        with patch.dict(os.environ,self.env,clear=True),\
             patch.object(publisher,'public_jpeg'),\
             patch.object(publisher,'quota_check'),\
             patch.object(publisher,'checkpoint',self.save_state),\
             patch.object(publisher,'instagram_publish',ig),\
             patch.object(publisher,'meta',fb):
            self.assertEqual('published',publisher.publish(self.slot,True))
            self.assertEqual('already-published',publisher.publish(self.slot,True))
        self.assertEqual(['feed','story','facebook'],calls)

    def test_ambiguous_result_blocks_retry(self):
        self.approve()
        (self.root/'data/state.json').write_text(json.dumps({self.slot:{'ig_feed':{'status':'pending'}}}))
        with patch.dict(os.environ,self.env,clear=True),patch.object(publisher,'public_jpeg'):
            with self.assertRaisesRegex(RuntimeError,'Unresolved pending'):
                publisher.publish(self.slot,True)

    def test_tampered_answer_blocks_publish(self):
        self.approve()
        bad={**self.record,'answer':'999'}
        (self.root/'data/queue.json').write_text(json.dumps({self.slot:bad}))
        with patch.dict(os.environ,self.env,clear=True):
            with self.assertRaisesRegex(RuntimeError,'missing or altered'):
                publisher.publish(self.slot,True)

if __name__=='__main__':
    unittest.main()
