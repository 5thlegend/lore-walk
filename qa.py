import asyncio,sys
from playwright.async_api import async_playwright
URL=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8765/'
async def run(p,w,h,tag):
    b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':w,'height':h})
    pg.on('pageerror',lambda e: print('ERR',e))
    await pg.goto(URL); await pg.wait_for_timeout(1500)
    await pg.screenshot(path=f'qa/{tag}-home.png')
    await pg.evaluate("visionSel.value='none';clipSel.value='none';textSel.value='template'")
    await pg.click('#startBtn'); await pg.wait_for_timeout(1000)
    await pg.screenshot(path=f'qa/{tag}-walk.png')
    for i in range(2):
        await pg.set_input_files('#photo','test.jpg'); await pg.wait_for_selector(f'text=SHARD 0{i+1}'); 
    await pg.wait_for_timeout(2500)
    await pg.evaluate("document.querySelector('#lastShard').scrollIntoView()")
    await pg.screenshot(path=f'qa/{tag}-shard.png')
    await pg.click('#endBtn'); await pg.wait_for_timeout(2500)
    await pg.screenshot(path=f'qa/{tag}-codex.png',full_page=True)
    sw=await pg.evaluate("document.documentElement.scrollWidth"); print(tag,'scrollWidth',sw)
    await b.close()
async def main():
    async with async_playwright() as p:
        for w,h,t in [(390,844,'m'),(1280,800,'d'),(320,640,'s')]: await run(p,w,h,t)
asyncio.run(main())
