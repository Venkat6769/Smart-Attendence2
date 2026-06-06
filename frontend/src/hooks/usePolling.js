/**
 * src/hooks/usePolling.js
 * Reusable hook that calls a function on a set interval (polling).
 * Stops polling when the component unmounts or when `active` is false.
 *
 * @param {function} fn       - async function to call on each tick
 * @param {number}   interval - milliseconds between calls (default 10000 = 10s)
 * @param {boolean}  active   - set to false to pause polling (e.g. no active session)
 */
import { useEffect, useRef } from 'react';

export default function usePolling(fn, interval = 10000, active = true) {
  // Keep a stable ref to the latest fn so we don't need it as a dependency
  const fnRef = useRef(fn);
  useEffect(() => { fnRef.current = fn; }, [fn]);

  useEffect(() => {
    if (!active) return;

    // Run immediately on mount, then on each interval tick
    fnRef.current();
    const timer = setInterval(() => fnRef.current(), interval);

    return () => clearInterval(timer);
  }, [interval, active]);
}
