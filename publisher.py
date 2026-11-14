"""Aptitude Mind Plus: checked practice questions and official Meta publishing.

Live publication requires BOTH: approved template in config/brand.json and
GitHub variable PUBLISH_ENABLED=true. This never asks for or prints tokens.
"""
from __future__ import annotations
import argparse, hashlib, json, os, subprocess, sys, time
from datetime import datetime
from fractions import Fraction
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlparse
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent
CONFIG = ROOT / 'config' / 'brand.json'
QUEUE = ROOT / 'data' / 'queue.json'
STATE = ROOT / 'data' / 'state.json'
IST = ZoneInfo('Asia/Kolkata')
HOURS = range(8, 23)  # 8 AM through 10 PM, inclusive


def slot_for(now=None):
    now = (now or datetime.now(IST)).astimezone(IST)
    if now.hour not in HOURS:
        raise ValueError('Outside 08:00-22:00 IST publishing hours')
    return now.strftime('%Y-%m-%dT%H')


def sample_number(slot, label, low, high):
    digest = hashlib.sha256(f'{slot}:{label}'.encode()).digest()
    return low + int.from_bytes(digest[:8], 'big') % (high - low + 1)


def create_record(slot):
    if len(slot) not in (13, 16) or (len(slot) == 16 and (slot[13] != '-' or not slot[14:].isdigit())):
        raise ValueError('Invalid publishing slot identifier')
    dt = datetime.strptime(slot[:13], '%Y-%m-%dT%H').replace(tzinfo=IST)
    if dt.hour not in HOURS:
        raise ValueError('Invalid publishing hour')
    kind = (dt.date().toordinal() + dt.hour + (int(slot[-2:]) if len(slot) == 16 else 0)) % 7
    if kind == 0:
        n = 100 * sample_number(slot, 'n', 4, 65)
        pct = [10, 15, 20, 25, 40][sample_number(slot, 'pct', 0, 4)]
        answer = n * pct // 100
        assert Fraction(n * pct, 100) == answer
        question = f'What is {pct}% of {n}?'
        solution = f'{pct}% of {n} = ({pct} / 100) x {n} = {answer}.'
        topic = 'Percentages'
    elif kind == 1:
        cp = sample_number(slot, 'cp', 3, 90) * 100
        pct = [10, 20, 25][sample_number(slot, 'pct', 0, 2)]
        answer = cp * (100 + pct) // 100
        assert Fraction(cp * (100 + pct), 100) == answer
        question = f'An item costs Rs {cp}. What is its selling price at {pct}% profit?'
        solution = f'Profit = {pct}% of {cp} = {cp*pct//100}. Selling price = {cp} + {cp*pct//100} = Rs {answer}.'
        topic = 'Profit and Loss'
    elif kind == 2:
        avg = sample_number(slot, 'avg', 7, 38)
        count = sample_number(slot, 'count', 3, 12)
        answer = avg * count
        assert Fraction(answer, count) == avg
        question = f'The average of {count} numbers is {avg}. What is their sum?'
        solution = f'Sum = average x count = {avg} x {count} = {answer}.'
        topic = 'Averages'
    elif kind == 3:
        p = 1000 * sample_number(slot, 'principal', 2, 20)
        rate = sample_number(slot, 'rate', 3, 12)
        years = sample_number(slot, 'years', 2, 6)
        answer = p * rate * years // 100
        assert Fraction(p * rate * years, 100) == answer
        question = f'Find the simple interest on Rs {p} at {rate}% per year for {years} years.'
        solution = f'SI = P x R x T / 100 = {p} x {rate} x {years} / 100 = Rs {answer}.'
        topic = 'Simple Interest'
    elif kind == 4:
        a = sample_number(slot, 'a', 2, 8)
        b = sample_number(slot, 'b', 3, 9)
        unit = sample_number(slot, 'unit', 5, 25)
        total = (a + b) * unit
        answer = a * unit
        assert Fraction(total * a, a + b) == answer
        question = f'A sum of Rs {total} is split in the ratio {a}:{b}. What is the first share?'
        solution = f'Total parts = {a+b}; one part = {total}/{a+b} = {unit}. First share = {a} x {unit} = Rs {answer}.'
        topic = 'Ratios'
    elif kind == 5:
        speed = sample_number(slot, 'speed', 3, 18) * 5
        hours = sample_number(slot, 'hours', 2, 7)
        answer = speed * hours
        assert Fraction(answer, hours) == speed
        question = f'A vehicle travels at {speed} km/h for {hours} hours. How far does it travel?'
        solution = f'Distance = speed x time = {speed} x {hours} = {answer} km.'
        topic = 'Speed and Distance'
    else:
        first = sample_number(slot, 'first', 2, 13)
        step = sample_number(slot, 'step', 2, 11)
        answer = first + 4 * step
        assert first + 3 * step + step == answer
        question = f'Find the next term: {first}, {first+step}, {first+2*step}, {first+3*step}, ?'
        solution = f'Common difference = {step}. Next = {first+3*step} + {step} = {answer}.'
        topic = 'Number Series'
    caption = (f'Aptitude Mind Plus | {topic}\n\nQUESTION: {question}\n\n'
               f'ANSWER: {answer}\n\nSOLUTION: {solution}\n\n'
               'Original, arithmetic-checked practice question; NOT an official PYQ. '
               'Save for revision.\n\n#Aptitude #Maths #Reasoning')
    if len(caption) > 2200:
        raise ValueError('Caption is too long for Instagram')
    stem = slot.replace('-', '').replace('T', '-')
    return {'id':f'amp-{stem}', 'slot_ist':slot, 'source_type':'original_practice',
            'verified':True, 'topic':topic, 'question':question, 'answer':str(answer),
            'solution':solution, 'caption':caption,
            'feed_image':f'docs/cards/{stem}-feed.jpg',
            'story_image':f'docs/cards/{stem}-story.jpg'}


def font(size, bold=False):
    from PIL import ImageFont
    names = ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf' if bold
             else '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
             '/System/Library/Fonts/Supplemental/Arial Bold.ttf' if bold
             else '/System/Library/Fonts/Supplemental/Arial.ttf']
    for name in names:
        if Path(name).exists():
            return ImageFont.truetype(name, size)
    return ImageFont.load_default()


def wrap(draw, text, face, max_width):
    lines, line = [], ''
    for part in text.split():
        candidate = (line + ' ' + part).strip()
        if draw.textbbox((0, 0), candidate, font=face)[2] <= max_width:
            line = candidate
        else:
            if line: lines.append(line)
            line = part
    if line: lines.append(line)
    return lines


def render(record, path, story=False):
    from PIL import Image, ImageDraw
    w, h = 1080, 1920 if story else 1350
    image = Image.new('RGB', (w,h), (245,250,253))
    d = ImageDraw.Draw(image)
    d.rounded_rectangle((45,45,w-45,h-45), radius=32, fill='white')
    d.rounded_rectangle((45,45,w-45,250), radius=32, fill=(18,51,82))
    d.rectangle((45,210,w-45,250), fill=(18,51,82))
    d.text((90,90), 'APTITUDE MIND PLUS', font=font(45,True), fill='white')
    d.text((90,164), 'ORIGINAL PRACTICE  |  STUDENT CHALLENGE',
           font=font(22,True), fill=(207,239,236))
    d.text((90,330), record['topic'].upper(), font=font(34,True), fill=(0,118,128))
    face = font(57,True)
    lines = wrap(d, record['question'], face, 875)
    if len(lines) > 7:
        face = font(48,True)
        lines = wrap(d, record['question'], face, 875)
    y = 620 if story else 460
    for line in lines:
        d.text((90,y),line,font=face,fill=(18,51,82))
        y += 87
    if story:
        if y >= 1450: raise ValueError('Story text overflows')
        d.rounded_rectangle((90,1535,990,1695),radius=24,fill=(221,247,243))
        d.text((120,1582),'Answer in the latest feed post',
               font=font(32,True),fill=(18,51,82))
        d.text((100,1765),'Think first. Then check the steps.',
               font=font(28),fill=(70,94,115))
    else:
        if y >= 1090: raise ValueError('Feed text overflows')
        d.rounded_rectangle((90,1110,990,1248),radius=24,fill=(221,247,243))
        d.text((120,1150),'ANSWER + STEPS IN CAPTION',
               font=font(31,True),fill=(18,51,82))
        d.text((100,1260),'Save for your next revision',
               font=font(23),fill=(70,94,115))
    path.parent.mkdir(parents=True,exist_ok=True)
    image.save(path,'JPEG',quality=90,optimize=True)


def load_json(path, default):
    return json.loads(path.read_text()) if path.exists() else default


def prepare(slot):
    record = create_record(slot)
    records = load_json(QUEUE,{})
    if slot in records and records[slot] != record:
        raise RuntimeError('Queue item changed: manual review required')
    records[slot] = record
    for name,story in [('feed_image',False),('story_image',True)]:
        path = ROOT / record[name]
        if not path.exists(): render(record,path,story)
    QUEUE.parent.mkdir(parents=True,exist_ok=True)
    QUEUE.write_text(json.dumps(records,indent=2,ensure_ascii=False)+'\n')
    print(f'PREPARED {slot}: {record["topic"]}: {record["question"]}')
    return record


def meta(method,path,token,payload=None):
    base=f'https://graph.facebook.com/{os.getenv("META_API_VERSION","v27.0")}/{path}'
    if method=='GET':
        req=Request(base+'?'+urlencode({**(payload or {}),'access_token':token}),method='GET')
    else:
        req=Request(base,data=urlencode({**(payload or {}),'access_token':token}).encode(),
                    headers={'Content-Type':'application/x-www-form-urlencoded'},method='POST')
    try:
        with urlopen(req,timeout=50) as response:
            result=json.loads(response.read())
    except HTTPError as exc:
        try:
            detail=json.loads(exc.read()).get('error',{})
            raise RuntimeError(f'Meta HTTP {exc.code}: code={detail.get("code")}, subcode={detail.get("error_subcode")}') from None
        except (ValueError,UnicodeDecodeError):
            raise RuntimeError(f'Meta HTTP {exc.code}') from None
    except (URLError,TimeoutError,OSError):
        raise RuntimeError('Meta result uncertain; pending checkpoint blocks duplicates') from None
    if not isinstance(result,dict) or 'error' in result:
        raise RuntimeError('Unexpected Meta response')
    return result


def quota_check(ig_id,token,need):
    response=meta('GET',f'{ig_id}/content_publishing_limit',token,
                  {'fields':'quota_usage,config'})
    data=response.get('data',[])
    if not data or not isinstance(data[0].get('config'),dict):
        raise RuntimeError('Live Instagram publishing quota unavailable')
    used=data[0].get('quota_usage')
    total=data[0]['config'].get('quota_total')
    if not isinstance(used,int) or not isinstance(total,int) or total-used < need:
        raise RuntimeError('Insufficient or unknown Instagram publishing quota')
    print(f'Instagram quota: {used}/{total} used')


def public_jpeg(url):
    parsed=urlparse(url)
    if parsed.scheme!='https' or parsed.hostname!='raw.githubusercontent.com':
        raise RuntimeError('Only raw.githubusercontent.com HTTPS media allowed')
    for attempt in range(4):
        try:
            with urlopen(Request(url,headers={'User-Agent':'AMP-Publisher/1.0'}),timeout=20) as resp:
                if resp.status==200 and 'image/jpeg' in resp.headers.get('Content-Type','') \
                        and resp.read(3)==b'\xff\xd8\xff':
                    return
        except (HTTPError,URLError,TimeoutError,OSError):
            pass
        time.sleep(5)
    raise RuntimeError('JPEG not yet publicly accessible; safe to retry later')


def instagram_publish(ig_id,token,url,caption=None,story=False):
    payload={'image_url':url}
    if story: payload['media_type']='STORIES'
    else: payload['caption']=caption
    container=meta('POST',f'{ig_id}/media',token,payload).get('id')
    if not container: raise RuntimeError('No Instagram media container ID')
    for attempt in range(8):
        status=meta('GET',str(container),token,{'fields':'status_code'}).get('status_code')
        if status=='FINISHED': break
        if status in ('ERROR','EXPIRED'): raise RuntimeError('Instagram media processing failed')
        time.sleep(7)
    else: raise RuntimeError('Instagram container processing timed out')
    item=meta('POST',f'{ig_id}/media_publish',token,{'creation_id':container}).get('id')
    if not item: raise RuntimeError('Instagram media publish outcome uncertain')
    return item


def checkpoint(state,slot,channel,status,media_id=None):
    state.setdefault(slot,{})[channel]={'status':status,'media_id':media_id}
    STATE.parent.mkdir(parents=True,exist_ok=True)
    STATE.write_text(json.dumps(state,indent=2)+'\n')
    for cmd in (['git','add','data/state.json'],
                ['git','commit','-m',f'state: {slot} {channel} {status}'],
                ['git','push','origin','HEAD']):
        p=subprocess.run(cmd,cwd=ROOT,capture_output=True,text=True)
        if p.returncode!=0:
            raise RuntimeError(f'Cannot persist state ({cmd[1]}); publication aborted')


def publish(slot,live=False):
    record=create_record(slot)
    if not live:
        print(f'DRY RUN {slot}: {record["question"]} -> {record["answer"]}; no Meta call')
        return 'dry-run'
    cfg=load_json(CONFIG,{})
    if os.getenv('PUBLISH_ENABLED','').lower()!='true' or cfg.get('template_approved') is not True:
        print('DISABLED: template approval and PUBLISH_ENABLED=true are required')
        return 'disabled'
    if load_json(QUEUE,{}).get(slot)!=record:
        raise RuntimeError('Queue record missing or altered: publication denied')
    keys=['IG_USER_ID','IG_ACCESS_TOKEN','FB_PAGE_ID','FB_PAGE_ACCESS_TOKEN','PUBLIC_BASE_URL']
    if any(not os.getenv(key) for key in keys):
        raise RuntimeError('Meta credentials or media hosting not configured')
    ig_id=os.environ['IG_USER_ID']
    token=os.environ['IG_ACCESS_TOKEN']
    base=os.environ['PUBLIC_BASE_URL'].rstrip('/')
    urls={'ig_feed':base+'/'+record['feed_image'],
          'ig_story':base+'/'+record['story_image'],
          'fb_feed':base+'/'+record['feed_image']}
    public_jpeg(urls['ig_feed'])
    public_jpeg(urls['ig_story'])
    state=load_json(STATE,{})
    pending=[ch for ch in ('ig_feed','ig_story','fb_feed')
             if state.get(slot,{}).get(ch,{}).get('status')!='published']
    if not pending: return 'already-published'
    if any(state.get(slot,{}).get(ch,{}).get('status')=='pending' for ch in pending):
        raise RuntimeError('Unresolved pending status; inspect Meta account before retrying')
    needed=sum(ch.startswith('ig_') for ch in pending)
    if needed: quota_check(ig_id,token,needed)
    for ch in pending:
        checkpoint(state,slot,ch,'pending')
        if ch=='ig_feed':
            media_id=instagram_publish(ig_id,token,urls[ch],record['caption'])
        elif ch=='ig_story':
            media_id=instagram_publish(ig_id,token,urls[ch],story=True)
        else:
            media_id=meta('POST',f'{os.environ["FB_PAGE_ID"]}/photos',
                          os.environ['FB_PAGE_ACCESS_TOKEN'],
                          {'url':urls[ch],'caption':record['caption'],'published':'true'}).get('id')
        if not media_id: raise RuntimeError(f'{ch} uncertain: verify account before retry')
        checkpoint(state,slot,ch,'published',media_id)
        print(f'{ch}: published {slot}')
    return 'published'


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('mode',choices=['prepare','publish'])
    parser.add_argument('--slot',help='YYYY-MM-DDTHH, preview only')
    parser.add_argument('--live',action='store_true')
    args=parser.parse_args()
    if args.live and args.slot:
        parser.error('--slot cannot be used for live posting')
    try:
        slot=args.slot or slot_for()
        if args.mode=='prepare': prepare(slot)
        else: publish(slot,args.live)
    except Exception as exc:
        print(f'ERROR: {exc}',file=sys.stderr)
        sys.exit(1)

if __name__=='__main__':
    main()
