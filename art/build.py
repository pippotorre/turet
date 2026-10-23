import asyncio, re
from playwright.async_api import async_playwright
svg=open('/home/claude/turet/art/toret.svg').read()
BG='#f3ead6'
def fig(h): 
    w=h*400/480
    return svg.replace('<svg ',f'<svg width="{w:.1f}" height="{h:.1f}" style="display:block" ')
def tile(size, h, radius=0, bg=BG):
    return f'<style>html,body{{margin:0;background:transparent}}.t{{width:{size}px;height:{size}px;background:{bg};border-radius:{radius}px;display:grid;place-items:center}}</style><div class="t">{fig(h)}</div>'
async def shot(b, html, w, h, out, transparent=True):
    pg=await b.new_page(viewport={'width':w,'height':h}); await pg.set_content(html); await pg.screenshot(path=out, omit_background=transparent); await pg.close()
async def main():
    I='/home/claude/turet/img/'; S='/home/claude/turet/store/'
    async with async_playwright() as p:
        b=await p.chromium.launch()
        await shot(b,tile(512,410,112),512,512,I+'icon-512.png')
        await shot(b,tile(192,154,42),192,192,I+'icon-192.png')
        await shot(b,tile(48,39,11),48,48,I+'icon-48.png')
        await shot(b,tile(512,300,0),512,512,I+'icon-maskable-512.png',False)
        await shot(b,tile(180,146,0),180,180,I+'apple-touch-icon.png',False)
        await shot(b,tile(512,410,0),512,512,S+'play-icon-512.png',False)
        feat=f'''<style>html,body{{margin:0}}.f{{width:1024px;height:500px;background:linear-gradient(120deg,#f3ead6 0%,#dcebe3 55%,#b9dcc9 100%);display:flex;align-items:center;gap:56px;padding:0 90px;box-sizing:border-box;font-family:Georgia,'Times New Roman',serif;color:#1f4d3b}}
        h1{{font-size:112px;margin:0;letter-spacing:-2px;line-height:1}}p{{font-size:34px;margin:14px 0 0;color:#2f6f55;font-family:system-ui,sans-serif;line-height:1.25}}</style>
        <div class="f">{fig(420)}<div><h1>Turet</h1><p>Trova la fontanella<br>di Torino più vicina</p></div></div>'''
        await shot(b,feat,1024,500,S+'feature-graphic-1024x500.png',False)
        await b.close()
asyncio.run(main())
