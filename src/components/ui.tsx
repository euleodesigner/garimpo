import { type ComponentProps, type ReactNode } from "react";

export function Label({ children }: { children: ReactNode }) {
  return <label className="mt-4 mb-1.5 block text-sm font-bold text-ink">{children}</label>;
}

export function Input(props: ComponentProps<"input">) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-sub/70 focus:outline-none focus:ring-2 focus:ring-clay/40 ${props.className ?? ""}`}
    />
  );
}

export function Textarea(props: ComponentProps<"textarea">) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-sub/70 focus:outline-none focus:ring-2 focus:ring-clay/40 ${props.className ?? ""}`}
    />
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-line bg-card p-6 ${className}`}>{children}</div>
  );
}

export function Chip({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "jade" | "gold" | "danger";
}) {
  const tones: Record<string, string> = {
    default: "bg-card text-ink",
    jade: "bg-jade/10 text-jade",
    gold: "bg-gold/10 text-gold",
    danger: "bg-danger/10 text-danger",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function ButtonPrimary(props: ComponentProps<"button">) {
  return (
    <button
      {...props}
      className={`cursor-pointer rounded-lg bg-clay px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${props.className ?? ""}`}
    />
  );
}

export function ButtonGhost(props: ComponentProps<"button">) {
  return (
    <button
      {...props}
      className={`cursor-pointer rounded-lg px-4 py-2.5 text-sm font-semibold text-sub transition hover:bg-bg ${props.className ?? ""}`}
    />
  );
}

export function ButtonOutline(props: ComponentProps<"button">) {
  return (
    <button
      {...props}
      className={`cursor-pointer rounded-lg border border-line px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-bg disabled:cursor-not-allowed disabled:opacity-50 ${props.className ?? ""}`}
    />
  );
}

export function FieldError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <p className="mt-1.5 text-sm font-medium text-danger">{children}</p>;
}
