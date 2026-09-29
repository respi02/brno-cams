/* Builds a grid of live HLS tiles from a global CAMERAS array:
     [{ sid: "<upstream stream id>", name: "<label>" }, ...]

   Playlists are served from /hls/ on this host, an Apache reverse proxy that
   injects the Referer the upstream CDN demands. The path is absolute so this
   works from any subfolder. */
(function () {
  const srcFor = (cam) => `/hls/${cam.sid}/s.m3u8`;
  const grid = document.getElementById("grid");

  function mount(cam) {
    const tile = document.createElement("div");
    tile.className = "cam";
    tile.dataset.state = "loading";

    const video = document.createElement("video");
    video.muted = true;          // required for autoplay
    video.setAttribute("muted", "");
    video.autoplay = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "");

    const status = document.createElement("div");
    status.className = "status";
    status.textContent = "připojuji…";

    const label = document.createElement("div");
    label.className = "label";
    const name = document.createElement("span");
    name.textContent = cam.name;
    label.appendChild(name);

    tile.append(video, status, label);
    // Click anywhere on the tile for fullscreen.
    tile.addEventListener("click", () => {
      if (document.fullscreenElement) document.exitFullscreen();
      else tile.requestFullscreen?.();
    });
    grid.appendChild(tile);

    video.addEventListener("playing", () => { tile.dataset.state = "playing"; });
    const nudge = () => video.play().catch(() => {});

    attach(cam, video, tile, status, nudge);
  }

  function attach(cam, video, tile, status, nudge) {
    const url = srcFor(cam);

    // Safari / iOS play HLS natively; everyone else needs hls.js.
    if (!window.Hls || !Hls.isSupported()) {
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = url;
        nudge();
      } else {
        tile.dataset.state = "error";
        status.textContent = "HLS není podporováno";
      }
      return;
    }

    let retries = 0;
    const hls = new Hls({
      liveSyncDurationCount: 2,   // stay close to the live edge
      maxBufferLength: 8,
      manifestLoadingMaxRetry: 6,
      levelLoadingMaxRetry: 6,
      fragLoadingMaxRetry: 6,
    });

    hls.on(Hls.Events.MANIFEST_PARSED, nudge);

    hls.on(Hls.Events.ERROR, (_e, data) => {
      if (!data.fatal) return;
      switch (data.type) {
        case Hls.ErrorTypes.MEDIA_ERROR:
          hls.recoverMediaError();
          break;
        case Hls.ErrorTypes.NETWORK_ERROR:
          hls.startLoad();
          break;
        default:
          hls.destroy();
          break;
      }
      // Hard reload with backoff if errors keep coming.
      if (++retries > 4) {
        retries = 0;
        tile.dataset.state = "error";
        status.textContent = "stream nedostupný — obnovuji…";
        try { hls.destroy(); } catch (_) {}
        setTimeout(() => attach(cam, video, tile, status, nudge), 10000);
      }
    });

    hls.loadSource(url);
    hls.attachMedia(video);

    // Watchdog: a live camera whose clock stops for 20s is stuck, so restart it.
    let last = -1, stalled = 0;
    const timer = setInterval(() => {
      if (video.currentTime === last && !video.paused) {
        if (++stalled >= 4) {
          clearInterval(timer);
          tile.dataset.state = "loading";
          status.textContent = "obnovuji…";
          try { hls.destroy(); } catch (_) {}
          attach(cam, video, tile, status, nudge);
          return;
        }
      } else {
        stalled = 0;
      }
      last = video.currentTime;
    }, 5000);
  }

  CAMERAS.forEach(mount);

  // Browsers pause hidden video; resume when the tab comes back.
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      document.querySelectorAll("video").forEach(v => v.play().catch(() => {}));
    }
  });
})();
