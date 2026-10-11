import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page()
        pg.on('console',lambda m: print(m.text[:200],flush=True)); pg.on('pageerror',lambda e: print('ERR',e,flush=True))
        await pg.goto('http://localhost:8765/t.html'); await asyncio.sleep(240); await b.close()
asyncio.run(main())
