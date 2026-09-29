# Handoff: BKOM Brno traffic camera streams

## Context
Petr wanted the raw live-stream URLs for the public traffic cameras on BKOM (Brněnské komunikace):
- Overview page: https://www.bkom.cz/dopravni-situace
- Detail pages: https://www.bkom.cz/dopravni-situace/detail/{id}

Each detail page has a `<video>` element with an HLS `<source>` on `stream.tikiti.cz`. The player uses hls.js and plays from a `blob:` URL.

## Extracted streams (2026-09-29)
Base: `https://stream.tikiti.cz/m2TXiSQJU6Uj7Si3gnBmp8ahPxWwTj/hls/tLHry2BbKz/`

| Detail ID | Camera | Stream URL |
|---|---|---|
| 51 | Koliště x Milady Horákové | https://stream.tikiti.cz/m2TXiSQJU6Uj7Si3gnBmp8ahPxWwTj/hls/tLHry2BbKz/Gdvu1tX6Eq1/s.m3u8 |
| 52 | Rokytova x Svatoplukova | https://stream.tikiti.cz/m2TXiSQJU6Uj7Si3gnBmp8ahPxWwTj/hls/tLHry2BbKz/Gdvu1tX6Eq2/s.m3u8 |
| 53 | Nové sady x Poříčí | https://stream.tikiti.cz/m2TXiSQJU6Uj7Si3gnBmp8ahPxWwTj/hls/tLHry2BbKz/Gdvu1tX6Eq3/s.m3u8 |
| 54 | MÚK Hlinky | https://stream.tikiti.cz/m2TXiSQJU6Uj7Si3gnBmp8ahPxWwTj/hls/tLHry2BbKz/Gdvu1tX6Eq4/s.m3u8 |
| 55 | Karlova x Provazníkova | https://stream.tikiti.cz/m2TXiSQJU6Uj7Si3gnBmp8ahPxWwTj/hls/tLHry2BbKz/Gdvu1tX6Eq5/s.m3u8 |
| 56 | Tržní x Hladíkova | https://stream.tikiti.cz/m2TXiSQJU6Uj7Si3gnBmp8ahPxWwTj/hls/tLHry2BbKz/Gdvu1tX6Eq6/s.m3u8 |
| 61 | Husova x Joštova | https://stream.tikiti.cz/m2TXiSQJU6Uj7Si3gnBmp8ahPxWwTj/hls/tLHry2BbKz/Gdvu1tX6Eq7/s.m3u8 |
| 60 | Poříčí x Vídeňská | https://stream.tikiti.cz/m2TXiSQJU6Uj7Si3gnBmp8ahPxWwTj/hls/tLHry2BbKz/Gdvu1tX6Eq8/s.m3u8 |
| 65 | Úvoz x Tvrdého | https://stream.tikiti.cz/m2TXiSQJU6Uj7Si3gnBmp8ahPxWwTj/hls/tLHry2BbKz/Gdvu1tX6Eq9/s.m3u8 |

Note: the detail page IDs and the stream numbers don't line up (60→Eq8, 61→Eq7).

## How they were extracted
This ran in the browser on the overview page:
```js
const links=[...new Set([...document.querySelectorAll('a[href*="dopravni-situace/detail"]')].map(a=>a.href))];
for (const h of links) {
  const html = await (await fetch(h)).text();
  const m3u8 = html.match(/https?:\/\/[^"'\s]+\.m3u8/)?.[0];
  const title = html.match(/<title>([^<]*)/)?.[1];
  console.log(h, title, m3u8);
}
```
The same approach works server-side (curl / Python requests plus a regex on each detail page's HTML).

## Caveats / unverified
- **Not tested outside the site.** Nobody has checked yet whether the URLs play directly or whether the server needs a `Referer` header.
- The path segments (`m2TXiSQ...`, `tLHry2BbKz`, `Gdvu1tX6`) look like tokens and may rotate. If they do, re-scrape the detail pages.
- If playback is refused, try these:
  - `mpv --referrer=https://www.bkom.cz/ <url>`
  - `ffplay -headers "Referer: https://www.bkom.cz/\r\n" <url>`

## Possible next steps
1. Check each URL with `curl -sI` or `ffprobe`, with and without the Referer header.
2. If the tokens rotate, write a small script that scrapes the current URLs and outputs an `.m3u` playlist (and optionally JSON).
3. Optional: set up restreaming or recording on Petr's homelab (NasHub, self-hosted), e.g. ffmpeg/go2rtc/Frigate.
