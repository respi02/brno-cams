# brno-cams

Two fullscreen camera walls for Brno, served at `bkom.psedlak.cz`.

| Page | Cameras | Source |
|---|---|---|
| `/doprava/` | 9 traffic intersections | Brněnské komunikace (BKOM), HLS |
| `/panorama/` | 4 horizon cameras | Hvězdárna a planetárium Brno, YouTube |

`/` redirects to `/doprava/`.

## Why there is a reverse proxy

The BKOM streams live on `stream.tikiti.cz` and the origin returns **403 unless the
request carries `Referer: https://www.bkom.cz/`**. A browser cannot forge that header —
it sends the page's own origin and gets refused. Tested:

| Request | Result |
|---|---|
| no headers | 403 |
| `Origin:` only | 403 |
| `Referer: https://bkom.psedlak.cz/` (what a browser sends) | 403 |
| `Referer: https://www.bkom.cz/` | 200 |

So Apache proxies `/hls/` to the CDN and injects the header (`deploy/010-bkom.conf`).
Playlist segments are relative (`s43073.ts`), so one path-preserving rule covers all
nine cameras.

The observatory cameras are YouTube live streams and cannot use that proxy; they are
embedded as iframes.

## Aspect ratios matter here

Cells are sized to each stream's true aspect ratio instead of being stretched to fill
the viewport, so no frame is ever cropped or letterboxed:

- **BKOM: 1024x640 = 8:5** (not 16:9 — confirmed by parsing the H.264 SPS from a
  segment of each of the nine streams). A 3x3 of 8:5 cells is itself 8:5.
- **Observatory: 16:9.** A 2x2 of 16:9 cells is itself 16:9.

The maths lives once in `site/assets/theme.css`; each page sets only `--cols`,
`--rows`, `--ar-w`, `--ar-h`. At 1920x1080 the panorama wall fills the screen almost
exactly (1901px of 1920); the traffic wall fills the height and leaves ~105px each
side, which is inherent — a 1.6 wall cannot fill a 1.778 screen without cropping.

## Layout

```
site/
  assets/     theme.css, hls-grid.js, kiosk.js, hls.min.js (vendored), Rubik woff2
  doprava/    traffic wall
  panorama/   observatory wall
deploy/
  010-bkom.conf   Apache vhost: the /hls/ proxy and the / -> /doprava/ redirect
docs/
  bkom-streams-handoff.md   how the stream URLs were originally extracted
```

Nothing is loaded from a CDN at runtime: hls.js and the Rubik subsets (latin +
latin-ext, the latter carrying the Czech diacritics) are vendored in `site/assets/`.

The theme follows [base48.cz](https://base48.cz) — `#121212`, `#cb0000`, Rubik.

## Deploying

```sh
rsync -a --delete site/ /var/www/html/
cp deploy/010-bkom.conf /etc/apache2/sites-available/
a2enmod headers proxy proxy_http ssl
a2ensite 010-bkom.conf
apache2ctl configtest && systemctl reload apache2
```

`site/` mirrors the web root exactly. Note the repo is kept **outside** the web root
on purpose: a `.git` directory under `/var/www/html` would be served publicly.

## Known caveats

- The CDN path segments (`m2TXiSQ…`, `tLHry2BbKz`, `Gdvu1tX6Eq…`) look like rotating
  tokens. If they change, every traffic tile dies at once; re-scrape the BKOM detail
  pages and update `deploy/010-bkom.conf` and `site/doprava/index.html`.
- BKOM publishes exactly 9 streams. `Eq0`, `Eq10`+ return HTTP 200 with the body
  `File Not Found`, so status codes alone are misleading when probing.
- The observatory tiles keep YouTube's own controls: an iframe swallows clicks, so a
  tile-level click-to-fullscreen cannot reach it.
