import asyncio, sys
from playwright.async_api import async_playwright
import os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL='file://'+ROOT+'/index.html'
async def m():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True, args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        for (w,h,name) in [(1280,800,'desk'),(540,675,'v45')]:
            pg = await b.new_page(viewport={'width':w,'height':h}, device_scale_factor=2 if w<600 else 1); errs=[]
            pg.on('console', lambda x: errs.append(x.text) if x.type in('error','warning') else None); pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.add_init_script("window.__sdSeed=7; window.__sdNoAutoQ=true; localStorage.setItem('sd-q', '%s')" % (sys.argv[1] if len(sys.argv)>1 else 'high'))
            await pg.goto(URL); await pg.wait_for_function('document.body.classList.contains("ready")', timeout=60000)
            await pg.evaluate('window.__sdManual=true; __bs.step(1/30, 60)'.replace('__bs','__sd'))
            await pg.screenshot(path=ROOT+f'/test/shots/dev-{name}-menu.png')
            await pg.evaluate("""__sd.start(); for(let i=0;i<150;i++){ const p=__sd.pos(); if(!p.att && p.vy<0 && p.y<5.5) __sd.press(); else if(p.att && p.x>p.att.x+.6 && p.vy>0) __sd.release(); __sd.step(1/30);} """)
            await pg.screenshot(path=ROOT+f'/test/shots/dev-{name}-play.png')
            print(name, errs[:5], await pg.evaluate('[__sd.S.score, __sd.S.lives, __sd.S.flies, __sd.pos()]'))
        await b.close()
asyncio.run(m())
