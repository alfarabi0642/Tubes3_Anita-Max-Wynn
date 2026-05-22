export function createDebouncedRescan(callback: () => void, delayMs: number): () => void {
  let timerId: number | undefined;

  return () => {
    if (timerId !== undefined) {
      window.clearTimeout(timerId);
    }

    timerId = window.setTimeout(() => {
      timerId = undefined;
      callback();
    }, delayMs);
  };
}
