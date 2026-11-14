from playwright.sync_api import sync_playwright
from pathlib import Path
base='file:///mnt/data/aptitude-mind-plus-premium/public/'
root=Path('/mnt/data/aptitude-mind-plus-premium')
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-proxy-server','--allow-file-access-from-files'])
 for size,name in [((1440,900),'desktop'),((390,844),'mobile')]:
  page=browser.new_page(viewport={'width':size[0],'height':size[1]},device_scale_factor=1)
  page.goto(base+'index.html',wait_until='networkidle')
  assert page.title().startswith('Understand Aptitude')
  assert page.locator('h1').inner_text().startswith('Aptitude.')
  assert page.evaluate('document.body.scrollWidth<=window.innerWidth'),f'Horizontal scroll on {name}'
  page.screenshot(path=str(root/('home-'+name+'.png')),full_page=True)
  page.goto(base+'courses.html',wait_until='networkidle')
  assert page.locator('article.course-card').count()==6
  assert page.locator('.course-card').first.inner_text().count('₹3,000')==1
  page.screenshot(path=str(root/('courses-'+name+'.png')),full_page=True)
  page.goto(base+'submit.html',wait_until='networkidle')
  assert page.locator('input[type=file]').count()==1
  assert 'requires setup' in page.locator('[data-backend-status]').inner_text()
  page.screenshot(path=str(root/('submit-'+name+'.png')),full_page=True)
  page.goto(base+'practice.html',wait_until='networkidle')
  assert page.locator('.quiz-card').count()==8
  page.locator('.quiz-card').first.locator('input').nth(3).check()
  page.locator('[data-quiz-submit]').click()
  assert page.locator('[data-quiz-result]').is_visible()
  page.screenshot(path=str(root/('practice-'+name+'.png')),full_page=True)
  if name=='mobile':
   page.goto(base+'index.html',wait_until='networkidle')
   page.locator('[data-menu-trigger]').click()
   assert page.locator('[data-mobile-nav]').is_visible()
   assert page.evaluate('document.body.scrollWidth<=window.innerWidth')
  page.close()
 browser.close()
print('PASS: Desktop/mobile, 6 courses, responsive layout, submission status, 8-question quiz, menu')