"use client";

import { useState, useEffect, useCallback } from "react";

export const OTP_RESEND_COOLDOWN_SECONDS = 90;
const MAX_RESENDS = 3;
const LOCKOUT_MS = 60 * 60 * 1000; // 1 hour

export function useOtpResend(resendFn: () => Promise<number | false>) {
  const [resendCount, setResendCount] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  const [locked, setLocked] = useState(false);
  const [resending, setResending] = useState(false);

  // Countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const canResend = cooldown === 0 && !locked && resendCount < MAX_RESENDS && !resending;

  const activate = useCallback((seconds = OTP_RESEND_COOLDOWN_SECONDS) => {
    setCooldown(Math.max(0, Math.ceil(seconds)));
  }, []);

  const resend = useCallback(async () => {
    if (!canResend) return;
    setResending(true);
    const nextCooldown = await resendFn();
    setResending(false);
    if (nextCooldown === false) return;

    const newCount = resendCount + 1;
    setResendCount(newCount);
    activate(nextCooldown);

    if (newCount >= MAX_RESENDS) {
      setLocked(true);
      setTimeout(() => {
        setLocked(false);
        setResendCount(0);
      }, LOCKOUT_MS);
    }
  }, [activate, canResend, resendCount, resendFn]);

  let label: string;
  if (resending) label = "Resending...";
  else if (locked || resendCount >= MAX_RESENDS) label = "Too many resends. Try again in 1 hour.";
  else if (cooldown > 0) label = `Resend code in ${cooldown}s`;
  else label = "Resend code";

  return { canResend, resend, label, resending, activate };
}
