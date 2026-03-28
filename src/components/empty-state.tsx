import Link from "next/link";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";

type EmptyStateAction = {
  href?: string;
  label: string;
  onClick?: () => void;
};

type EmptyStateProps = {
  icon: PhosphorIcon;
  title: string;
  description: string;
  action?: EmptyStateAction;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="empty-state section-enter">
      <span className="rounded-full bg-[var(--color-signal-dim)] p-5">
        <Icon color="var(--color-signal)" size={40} weight="duotone" />
      </span>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-description">{description}</p>
      {action ? (
        action.href ? (
          <Link className="btn btn-primary mt-6" href={action.href}>
            {action.label}
          </Link>
        ) : (
          <button className="btn btn-primary mt-6" onClick={action.onClick} type="button">
            {action.label}
          </button>
        )
      ) : null}
    </div>
  );
}
