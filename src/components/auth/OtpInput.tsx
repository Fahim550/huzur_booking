'use client';

import { useRef, useEffect, KeyboardEvent, ClipboardEvent } from 'react';

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

export default function OtpInput({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled = false,
  autoFocus = true,
}: OtpInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Split current string value into array of single chars
  const digits = Array.from({ length }, (_, i) => value[i] || '');

  useEffect(() => {
    if (autoFocus && inputRefs.current[0] && !disabled) {
      inputRefs.current[0]?.focus();
    }
  }, [autoFocus, disabled]);

  const handleChange = (index: number, char: string) => {
    if (disabled) return;

    // Only allow numeric digits
    const cleaned = char.replace(/\D/g, '');
    if (!cleaned) {
      // If user typed non-digit or cleared
      const newDigits = [...digits];
      newDigits[index] = '';
      const newVal = newDigits.join('');
      onChange(newVal);
      return;
    }

    // Take the last entered character if multiple were entered
    const digit = cleaned.slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    const newVal = newDigits.join('');
    onChange(newVal);

    // Auto-advance to next input
    if (index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Trigger complete callback if all filled
    if (newVal.length === length && onComplete) {
      onComplete(newVal);
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        // Current box is empty, jump to previous and clear it
        inputRefs.current[index - 1]?.focus();
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        onChange(newDigits.join(''));
      } else {
        const newDigits = [...digits];
        newDigits[index] = '';
        onChange(newDigits.join(''));
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (disabled) return;

    const pasted = e.clipboardData.getData('text/plain').replace(/\D/g, '');
    if (!pasted) return;

    const truncated = pasted.slice(0, length);
    onChange(truncated);

    // Focus on the next empty box or the last box
    const focusIndex = Math.min(truncated.length, length - 1);
    inputRefs.current[focusIndex]?.focus();

    if (truncated.length === length && onComplete) {
      onComplete(truncated);
    }
  };

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3" role="group" aria-label="OTP verification digits">
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={digits[index]}
          disabled={disabled}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          aria-label={`Digit ${index + 1} of ${length}`}
          className="w-11 h-13 sm:w-13 sm:h-15 text-center text-xl sm:text-2xl font-bold rounded-xl border-2 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700 focus:border-emerald-600 dark:focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 outline-none transition-all shadow-xs disabled:opacity-50 disabled:bg-zinc-100 dark:disabled:bg-zinc-800"
        />
      ))}
    </div>
  );
}
