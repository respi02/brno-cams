/* Wall-display polish: on a screen left running fullscreen, a parked mouse
   pointer and the page switcher are the only things that move. Fade both out
   once the mouse has been still for a few seconds, and bring them straight
   back on any movement. */
(function () {
  const IDLE_MS = 3000;
  let timer;

  const wake = () => {
    document.body.classList.remove("idle");
    clearTimeout(timer);
    timer = setTimeout(() => document.body.classList.add("idle"), IDLE_MS);
  };

  ["mousemove", "mousedown", "touchstart", "keydown"].forEach((ev) =>
    document.addEventListener(ev, wake, { passive: true })
  );
  wake();
})();
