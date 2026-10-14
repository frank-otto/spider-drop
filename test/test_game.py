"""Spider Drop headless test (Chrome + SwiftShader WebGL)."""
import asyncio, os, re, struct, sys, glob
from playwright.async_api import async_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
import threading, http.server, functools, socketserver
class _Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
_srv = socketserver.ThreadingTCPServer(('127.0.0.1', 0), functools.partial(_Q, directory=ROOT)); _srv.daemon_threads = True
threading.Thread(target=_srv.serve_forever, daemon=True).start()
URL = 'http://127.0.0.1:%d/index.html' % _srv.server_address[1]
OUT = ROOT + '/test/shots/'; os.makedirs(OUT, exist_ok=True)
ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required']
R = []
def check(n, ok, info=''): R.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + n + (f' — {info}' if info != '' else ''), flush=True)

async def page(b, q='mid', **kw):
    ctx = await b.new_context(accept_downloads=True, **kw)
    await ctx.add_init_script(f"window.__sdSeed = 4242; window.__sdNoAutoQ = true; try{{if(!sessionStorage.getItem('sdInit')){{sessionStorage.setItem('sdInit','1'); localStorage.clear(); localStorage.setItem('sd-q','{q}')}}}}catch(e){{}}")
    pg = await ctx.new_page(); pg.set_default_timeout(240000); logs = []
    pg.on('console', lambda m: logs.append(f'{m.type}: {m.text}') if m.type in ('error', 'warning') else None)
    pg.on('pageerror', lambda e: logs.append(f'PAGEERROR {e}'))
    await pg.goto(URL); await pg.wait_for_function('document.body.classList.contains("ready")', timeout=60000)
    await pg.evaluate('window.__sdManual = true; __sd.step(1/30, 3)')
    return ctx, pg, logs

# simple timing bot: shoot silk while falling, let go on the upswing past the anchor
BOT = '''(n) => { for (let i = 0; i < n; i++) { const p = __sd.pos(); if (!p.att && p.vy < 0 && p.y < 5.5) __sd.press(); else if (p.att && p.x > p.att.x + .6 && p.vy > 0) __sd.release(); __sd.step(1/30); } }'''
LOG = '__sd.log.map(e => e.n)'

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True, args=ARGS)
        ctx, pg, logs = await page(b, viewport={'width': 1280, 'height': 800})
        check('menu visible, EN default, title', await pg.is_visible('#menu.show') and (await pg.text_content('#btnPlay')) == 'Swing!' and (await pg.text_content('h1')) == 'Spider Drop')
        x0 = (await pg.evaluate('__sd.pos()'))['x']; await pg.evaluate('__sd.step(1/30, 60)'); x1 = (await pg.evaluate('__sd.pos()'))['x']
        check('menu: the spider swings by itself as a live demo', x1 > x0 + 5, (x0, x1))
        await pg.screenshot(path=OUT + 'shot-menu.png')
        await pg.click('#btnLang'); de = await pg.text_content('#btnPlay'); await pg.screenshot(path=OUT + 'shot-menu-de.png')
        check('DE toggle', de == 'Schwingen!' and 'Fliegenklatsche' in await pg.text_content('#menu'), de)
        lsl = await pg.evaluate("localStorage.getItem('sd-lang')")
        await pg.wait_for_timeout(800); await pg.reload(wait_until='load'); await pg.wait_for_function('document.body.classList.contains("ready") && window.__sd'); await pg.evaluate('window.__sdManual = true')
        await pg.wait_for_timeout(500)
        check('language remembered after reload', lsl == 'de' and (await pg.text_content('#btnPlay')) == 'Schwingen!', await pg.evaluate("[__sd.S.lang, document.getElementById('btnPlay').textContent, localStorage.getItem('sd-lang'), document.documentElement.lang]")); await pg.click('#btnLang')
        check('difficulty default Medium', await pg.evaluate('__sd.diff()') == 'medium' and 'on' in (await pg.get_attribute('#diff [data-d=medium]', 'class') or ''))
        await pg.click('#btnPlay'); await pg.evaluate('__sd.step(1/30, 2)')
        st0 = await pg.evaluate('({l: __sd.S.lives, p: __sd.pos()})')
        check('round starts mid-swing (motion from frame 1), 3 lives on Medium', st0['l'] == 3 and st0['p']['att'] is not None and st0['p']['vx'] > 3 and await pg.is_visible('#hud'), st0)
        check('hold/let-go hint shown at the start', await pg.is_visible('#hint.show'))
        await pg.evaluate(BOT, 150)
        st = await pg.evaluate('({f: __sd.S.flies, s: __sd.S.score, d: __sd.S.dist, sw: __sd.S.swings, l: __sd.S.lives})')
        check('within 5 s: several swings, flies caught, score rising', st['f'] >= 5 and st['sw'] >= 2 and st['s'] > 100 and st['d'] > 25, st)
        await pg.screenshot(path=OUT + 'shot-play.png')
        lg = await pg.evaluate(LOG)
        check('real samples fire for start / silk / let go / catches', all(k in lg for k in ['stinger', 'swish_a', 'whoosh', 'candy_a', 'chime_a']) or all(k in lg for k in ['stinger', 'swish_b', 'whoosh', 'candy_a', 'chime_a']), sorted(set(lg)))
        # mouse hold = silk, release = fly
        await pg.evaluate('__sd.clear(); __sd.release(); __sd.place(__sd.pos().x, 6, 5, 0); __sd.step(1/30, 4)')
        await pg.mouse.move(640, 400); await pg.mouse.down(); await pg.evaluate('__sd.step(1/30, 2)'); a1 = await pg.evaluate('__sd.pos()')
        await pg.mouse.up(); await pg.evaluate('__sd.step(1/30, 2)'); a2 = await pg.evaluate('__sd.pos()')
        check('mouse: hold shoots silk to the ceiling ahead, release lets go', a1['att'] and a1['att']['y'] == 9 and a1['att']['x'] > a1['x'] and a2['att'] is None, (a1, a2))
        await pg.keyboard.down('Space'); await pg.evaluate('__sd.step(1/30, 2)'); k1 = await pg.evaluate('__sd.pos()'); await pg.keyboard.up('Space'); await pg.evaluate('__sd.step(1/30, 1)'); k2 = await pg.evaluate('__sd.pos()')
        check('keyboard: Space holds the silk, release lets go', k1['att'] is not None and k2['att'] is None)
        # swinging physics: rope keeps the spider at <= rope length, pendulum carries it forward
        await pg.evaluate('__sd.place(__sd.pos().x, 5, 4, 0); __sd.press(); __sd.step(1/30, 20)'); s1 = await pg.evaluate('__sd.pos()')
        d = ((s1['x'] - s1['att']['x']) ** 2 + (s1['y'] - 9) ** 2) ** .5
        check('pendulum: spider swings under the anchor and on (rope constraint holds)', d < 9 and s1['x'] > s1['att']['x'] - 1, (s1, d))
        await pg.evaluate('__sd.release(); __sd.step(1/30, 30)')
        # candle flame
        await pg.evaluate('__sd.S.inv = 0; __sd.place(__sd.pos().x, 4, 0, 0)'); l0 = await pg.evaluate('__sd.S.lives')
        await pg.evaluate('__sd.spawn("candle", __sd.pos().x, 0, 2.2); __sd.step(1/30, 25)'); l1 = await pg.evaluate('__sd.S.lives')
        await pg.screenshot(path=OUT + 'shot-burn.png')
        check('falling into a candle flame costs a life + fwoosh', l1 == l0 - 1 and 'fwoosh' in await pg.evaluate(LOG), (l0, l1))
        await pg.evaluate('__sd.release(); __sd.clear(); __sd.place(__sd.pos().x, 5, 0, 0); __sd.S.lives = 3; __sd.S.inv = 0; __sd.S.endT = -1')
        # bat
        await pg.evaluate('__sd.place(__sd.pos().x, 5, 0, 0); __sd.press(); __sd.step(1/30, 1); __sd.spawn("bat", __sd.pos().x + .6, __sd.pos().y, 0); __sd.step(1/30, 6)'); l2 = await pg.evaluate('__sd.S.lives')
        check('bat hit costs a life + knocks you off the silk', l2 == 2 and await pg.evaluate('__sd.pos().att') is None, l2)
        await pg.evaluate('__sd.release(); __sd.clear(); __sd.place(__sd.pos().x, 5, 0, 0); __sd.S.lives = 3; __sd.S.inv = 0; __sd.S.endT = -1')
        # swatter
        await pg.evaluate('__sd.clear(); const p = __sd.pos(); __sd.spawn("swatter", p.x + 1, 0, 0); __sd.place(p.x + 1, 4.2, 0, 0); __sd.step(1/30, 6)'); l3 = await pg.evaluate('__sd.S.lives')
        await pg.screenshot(path=OUT + 'shot-swat.png')
        check('giant swatter swats (−1 life, wood thud)', l3 == 2 and 'thud_a' in await pg.evaluate(LOG), l3)
        await pg.evaluate('__sd.release(); __sd.clear(); __sd.place(__sd.pos().x, 5, 0, 0); __sd.S.lives = 3; __sd.S.inv = 0; __sd.S.endT = -1')
        # floor
        await pg.evaluate('__sd.release(); __sd.place(__sd.pos().x, 2, 2, -5); __sd.step(1/30, 12)'); l4 = await pg.evaluate('__sd.S.lives'); v = await pg.evaluate('__sd.pos()')
        check('touching the floor costs a life and bounces the spider up', l4 == 2 and v['vy'] > 0 or l4 == 2 and v['y'] > 1.5, (l4, v))
        # candy corn heals
        await pg.evaluate('__sd.release(); __sd.clear(); __sd.place(__sd.pos().x, 5, 0, 0); __sd.S.lives = 3; __sd.S.inv = 0; __sd.S.endT = -1; __sd.S.lives = 2; const p = __sd.pos(); __sd.place(p.x, 5, 3, 0); __sd.spawn("gold", p.x + .6, 5); __sd.step(1/30, 6)')
        check('golden candy corn: +200 and a life back', await pg.evaluate('__sd.S.lives') == 3 and await pg.evaluate('__sd.S.golds') == 1, await pg.evaluate('[__sd.S.state, __sd.S.lives, __sd.S.golds, __sd.S.endT, __sd.S.gt]'))
        # game over
        await pg.evaluate('for (let i = 0; i < 6 && __sd.S.state === "play"; i++) { __sd.S.inv = 0; __sd.release(); __sd.place(__sd.pos().x, 1.5, 2, -6); __sd.step(1/30, 50); }'); await pg.evaluate('__sd.step(1/30, 45)')
        check('losing all lives ends the round → end screen', await pg.evaluate('__sd.S.state') == 'end' and await pg.is_visible('#end.show') and (await pg.text_content('#eTitle')) == 'The spider needs a nap!', await pg.evaluate('[__sd.S.state, __sd.S.lives, __sd.S.endT, __sd.S.gt]'))
        sc = await pg.evaluate('__sd.S.score'); best = await pg.evaluate("localStorage.getItem('sd-best-medium')")
        check('highscore saved per difficulty', best is not None and int(best) == sc, (sc, best))
        es = await pg.text_content('#eStats'); check('end stats: flies / candies / best streak / distance', all(w in es for w in ['flies', 'candies', 'best streak', 'm swung']), es)
        await pg.screenshot(path=OUT + 'shot-end.png')
        async with pg.expect_download() as dl: await pg.click('#btnCard')
        d = await dl.value; path = await d.path(); data = open(path, 'rb').read(); w, h = struct.unpack('>II', data[16:24])
        check('highscore card PNG 1080x1350', data[:8] == b'\x89PNG\r\n\x1a\n' and (w, h) == (1080, 1350) and d.suggested_filename == 'spider-drop-highscore.png', (w, h)); open(OUT + 'card.png', 'wb').write(data)
        check('audio: all embedded samples decode', await pg.evaluate('window.__sdAudioReady || 0') == len(glob.glob(ROOT + '/sounds/*.mp3')), await pg.evaluate('window.__sdAudioReady'))
        check('no console errors (desktop)', not logs, logs[:5]); await ctx.close()
        # ---- difficulty ----
        ctx, pg, logs = await page(b, viewport={'width': 1280, 'height': 800})
        await pg.click('#diff [data-d=hard]'); await pg.wait_for_timeout(800); await pg.reload(); await pg.wait_for_function('document.body.classList.contains("ready") && window.__sd'); await pg.evaluate('window.__sdManual = true')
        check('difficulty choice remembered (Hard)', await pg.evaluate('__sd.diff()') == 'hard', await pg.evaluate("[__sd.diff(), localStorage.getItem('sd-diff'), sessionStorage.getItem('sdInit')]"))
        D = await pg.evaluate('__sd.diffs')
        check('Easy < Medium < Hard: gravity, density, swatter speed, bats; lives 5/3/2; ×1.5 on Hard', D['easy']['g'] < D['medium']['g'] < D['hard']['g'] and D['easy']['gap1'] > D['medium']['gap1'] > D['hard']['gap1'] and D['easy']['swat'] < D['hard']['swat'] and [D[k]['lives'] for k in ['easy', 'medium', 'hard']] == [5, 3, 2] and D['hard']['mult'] == 1.5)
        await pg.click('#btnPlay'); await pg.evaluate(BOT, 120)
        check('hard round: 2 lives, ×1.5 bonus shown', await pg.evaluate('__sd.S.lives') <= 2 and (await pg.text_content('#hMult')).startswith('×1.5') or (await pg.text_content('#hMult')) in ('×3', '×4.5', '×6', '×7.5'), await pg.text_content('#hMult'))
        await pg.screenshot(path=OUT + 'shot-hard.png')
        check('no console errors (difficulty)', not logs, logs[:5]); await ctx.close()
        # ---- kids ----
        ctx, pg, logs = await page(b, viewport={'width': 1280, 'height': 800})
        await pg.click('#btnKids'); check('kids mode hides difficulty, explains gentle rules', not await pg.is_visible('#diff') and 'nothing hurts' in await pg.text_content('#h3'))
        await pg.click('#btnPlay'); await pg.evaluate('__sd.step(1/30, 5); __sd.clear(); __sd.release(); __sd.place(__sd.pos().x, 2, 2, -6); __sd.step(1/30, 20)')
        kv = await pg.evaluate('__sd.pos()'); check('kids: the floor is bouncy (no loss)', kv['y'] > 1 and await pg.evaluate('__sd.S.hits') == 0, kv)
        await pg.evaluate('__sd.S.inv = 0; __sd.spawn("candle", __sd.pos().x + .3, 0, 2.5); __sd.spawn("bat", __sd.pos().x + 1, __sd.pos().y); __sd.step(1/30, 60)')
        check('kids: candles and bats only bump, nothing is lost', await pg.evaluate('__sd.S.hits') == 0 and await pg.evaluate('__sd.S.state') == 'play' and await pg.is_visible('#hTimeBox'))
        await pg.screenshot(path=OUT + 'shot-kids-play.png')
        await pg.evaluate('__sd.step(1/30, 1800)')
        check('kids: 60-second swing ends with a friendly end screen', await pg.evaluate('__sd.S.state') == 'end' and (await pg.text_content('#eTitle')) == 'What a swing!')
        check('no console errors (kids)', not logs, logs[:5]); await ctx.close()
        # ---- mobile ----
        ctx, pg, logs = await page(b, viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
        await pg.screenshot(path=OUT + 'shot-mobile-menu.png')
        await pg.tap('#btnPlay'); await pg.evaluate('__sd.step(1/30, 3); __sd.release(); __sd.place(__sd.pos().x, 6, 5, 0); __sd.step(1/30, 2)')
        cdp = await ctx.new_cdp_session(pg)
        await cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': 200, 'y': 500}]}); await pg.evaluate('__sd.step(1/30, 3)'); m1 = await pg.evaluate('__sd.pos()')
        await cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []}); await pg.evaluate('__sd.step(1/30, 2)'); m2 = await pg.evaluate('__sd.pos()')
        check('mobile: touch-hold = silk, lift finger = let go', m1['att'] is not None and m2['att'] is None, (m1['att'], m2['att']))
        await pg.evaluate(BOT, 60); await pg.screenshot(path=OUT + 'shot-mobile-play.png')
        sx = await pg.evaluate('(() => { const p = __sd.pos(); return [__sd.screen(p.x, p.y), __sd.screen(p.x, 0.1), __sd.screen(p.x, 9)]; })()')
        check('mobile portrait: spider, floor and ceiling all on screen', all(0 <= q['y'] <= 844 for q in sx) and 0 < sx[0]['x'] < 390, sx)
        check('no console errors (mobile)', not logs, logs[:5]); await ctx.close()
        for q in ['low', 'mid', 'high', 'ultra']:
            ctx, pg, logs = await page(b, q=q, viewport={'width': 960, 'height': 600})
            await pg.evaluate('__sd.start(); __sd.step(1/30, 30)'); qq = await pg.evaluate('__sd.quality()'); await pg.screenshot(path=OUT + f'shot-quality-{q}.png')
            check(f'quality {q} renders without errors', qq == q and not logs, logs[:3]); await ctx.close()
        await b.close()
    bundle = open(ROOT + '/js/game.bundle.js', encoding='utf8').read()
    check('sounds are recorded samples (no oscillator synth)', 'createOscillator' not in bundle)
    txt = ''.join(open(f, encoding='utf8', errors='ignore').read() for f in glob.glob(ROOT + '/src/*.js') + [ROOT + '/index.html', ROOT + '/css/style.css'] + glob.glob(ROOT + '/*.md') + glob.glob(ROOT + '/LICENSES/SOUNDS.md'))
    check('no email addresses, no forbidden wording in sources/docs', not re.search(r'[\w.+-]+@[\w-]+\.[a-z]{2,}', txt) and not re.search(r'\b' + chr(65) + chr(73) + r'\b', txt))
    print(f'{sum(R)}/{len(R)} passed'); sys.exit(0 if all(R) else 1)
if __name__ == '__main__': asyncio.run(main())
