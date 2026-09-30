import type { HTMLAttributes } from "react";

export function Card(props: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={`rounded-card border border-line bg-paper-raised p-5 shadow-sm ${props.className ?? ""}`}
    />
  );
}
