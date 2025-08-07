import { useState, useEffect, useRef, useCallback } from 'react';

interface AdvancedDebounceOptions {
  leading?: boolean;
  trailing?: boolean;
  maxWait?: number;
}

export function useAdvancedDebounce<T>(
  value: T,
  delay: number,
  options: AdvancedDebounceOptions = {}
): [T, () => void, boolean] {
  const { leading = false, trailing = true, maxWait } = options;
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const [isPending, setIsPending] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const maxWaitTimeoutRef = useRef<NodeJS.Timeout>();
  const lastCallTimeRef = useRef<number>();
  const lastInvokeTimeRef = useRef<number>(0);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
    if (maxWaitTimeoutRef.current) {
      clearTimeout(maxWaitTimeoutRef.current);
      maxWaitTimeoutRef.current = undefined;
    }
    setIsPending(false);
  }, []);

  const invoke = useCallback(() => {
    setDebouncedValue(value);
    lastInvokeTimeRef.current = Date.now();
    setIsPending(false);
  }, [value]);

  useEffect(() => {
    const currentTime = Date.now();
    lastCallTimeRef.current = currentTime;
    setIsPending(true);

    const shouldInvokeLeading = leading && 
      (lastInvokeTimeRef.current === 0 || 
       currentTime - lastInvokeTimeRef.current >= delay);

    if (shouldInvokeLeading) {
      invoke();
      return;
    }

    // Clear existing timeouts
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (maxWaitTimeoutRef.current) clearTimeout(maxWaitTimeoutRef.current);

    // Set trailing timeout
    if (trailing) {
      timeoutRef.current = setTimeout(() => {
        invoke();
      }, delay);
    }

    // Set maxWait timeout if specified
    if (maxWait && currentTime - lastInvokeTimeRef.current >= maxWait) {
      maxWaitTimeoutRef.current = setTimeout(() => {
        invoke();
      }, maxWait - (currentTime - lastInvokeTimeRef.current));
    }

    return cancel;
  }, [value, delay, leading, trailing, maxWait, invoke, cancel]);

  useEffect(() => {
    return cancel;
  }, [cancel]);

  return [debouncedValue, cancel, isPending];
}

// Enhanced search debounce with request deduplication
export function useSearchDebounce(
  searchTerm: string,
  delay: number = 300
): [string, () => void, boolean] {
  const [debouncedTerm, cancelDebounce, isPending] = useAdvancedDebounce(
    searchTerm,
    delay,
    { 
      leading: false, 
      trailing: true,
      maxWait: 1000 // Force update after 1s regardless
    }
  );

  const lastSearchRef = useRef<string>('');
  const [finalTerm, setFinalTerm] = useState<string>('');

  useEffect(() => {
    // Deduplicate identical searches
    if (debouncedTerm !== lastSearchRef.current) {
      lastSearchRef.current = debouncedTerm;
      setFinalTerm(debouncedTerm);
    }
  }, [debouncedTerm]);

  return [finalTerm, cancelDebounce, isPending];
}