"use client";

import { useState } from "react";

export function FooterSubscribeForm() {
  const [email, setEmail] = useState("");

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) {
      return;
    }
    window.location.href = `mailto:hello@trustloop.dev?subject=Subscribe&body=${encodeURIComponent(email.trim())}`;
  }

  return (
    <form className="mt-4 flex gap-2" onSubmit={onSubmit}>
      <input
        aria-label="Email address"
        className="input"
        onChange={(event) => setEmail(event.target.value)}
        placeholder="Work email"
        type="email"
        value={email}
      />
      <button className="btn btn-primary btn-sm" type="submit">
        Subscribe
      </button>
    </form>
  );
}
