"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, type ComponentProps } from "react";

type HoverLinkProps = ComponentProps<typeof Link>;

export function HoverLink(props: HoverLinkProps) {
  const router = useRouter();
  const onMouseEnter = useCallback(() => {
    if (typeof props.href === "string") router.prefetch(props.href);
  }, [router, props.href]);

  return <Link {...props} prefetch={false} onMouseEnter={onMouseEnter} />;
}
