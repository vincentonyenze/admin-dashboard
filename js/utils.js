// Small helpers that don't depend on the page or the data

// Wait until calls stop for `delayMs`, then run `fn` once with the latest
// arguments. Typing "okafor" quickly = 1 search, not 6.
// (The same helper as in the Notes App, the Movie app and the catalog.)
export function debounce(fn, delayMs) {
  let timeoutId = null;
  let lastArgs = [];

  function run() {
    timeoutId = null;
    fn(...lastArgs);
  }

  function debounced(...args) {
    lastArgs = args;
    clearTimeout(timeoutId);
    timeoutId = setTimeout(run, delayMs);
  }

  debounced.flush = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      run();
    }
  };

  return debounced;
}
