import asyncio,sys,time
from playwright.async_api import async_playwright
TEXT=sys.argv[1] if len(sys.argv)>1 else 'HuggingFaceTB/SmolLM2-360M-Instruct'
CLIP=sys.argv[2] if len(sys.argv)>2 else 'Xenova/clip-vit-base-patch32'
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        ctx=await b.new_context(viewport={'width':390,'height':844})
        pg=await ctx.new_page(); t0=time.time()
        pg.on('console',lambda m: None if '%' in m.text else print(f'{time.time()-t0:.0f}s C:',m.text[:300],flush=True))
        pg.on('pageerror',lambda e: print('ERR',e,flush=True))
        ctx.on('requestfinished',lambda r: print(f'{time.time()-t0:.0f}s REQ',r.url[-100:],flush=True) if 'localhost' not in r.url else None)
        ctx.on('requestfailed',lambda r: print('FAIL',r.url[-100:],r.failure,flush=True))
        await pg.goto('https://lore-walk-nextrealm.dankpenta.workers.dev/')
        await pg.screenshot(path='live-shot-home.png',full_page=True)
        await pg.evaluate('([t,c])=>{textSel.value=t;clipSel.value=c}',[TEXT,CLIP])
        await pg.click('#startBtn')
        await pg.set_input_files('#photo','test.jpg')
        await pg.wait_for_selector('#lastShard .shard',timeout=840000)
        print('RESULT:',await pg.inner_text('#lastShard'),flush=True)
        await pg.screenshot(path='live-shot-walk.png',full_page=True)
        await pg.click('#endBtn'); await pg.screenshot(path='live-shot-codex.png',full_page=True)
        await b.close()
asyncio.run(main())
