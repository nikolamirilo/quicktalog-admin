import React from "react"

import { cx } from "@/lib/utils/cx"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cx(
      "relative w-full rounded-xl border p-6 shadow-sm",
      "border-gray-200 bg-white text-gray-900",
      "dark:border-gray-800 dark:bg-gray-900 dark:text-gray-50",
      className,
    )}
    {...props}
  />
))
Card.displayName = "Card"

export { Card }
