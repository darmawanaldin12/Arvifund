import { cn } from "../../lib/utils-cn"

function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-[var(--surface2)]", className)}
      {...props}
    />
  )
}

export { Skeleton }
