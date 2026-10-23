import asyncio, sys, os
from playwright.async_api import async_playwright
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
svg=open(ROOT+'/art/toret.svg').read()
async def shot(b, html, w, h, out, transparent=True):
    pg=await b.new_page(viewport={'width':w,'height':h}); await pg.set_content(html); await pg.screenshot(path=out, omit_background=transparent); await pg.close()
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        html=lambda inner,bg='transparent': f'<style>html,body{{margin:0;background:{bg}}}svg{{display:block}}</style>{inner}'
        await shot(b, html(svg.replace('<svg ','<svg width="800" height="960" ')),800,960,'/tmp/toret_big.png')
        await b.close()
asyncio.run(main())
