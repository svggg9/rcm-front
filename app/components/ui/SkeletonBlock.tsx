type Props = {
  as?: "div" | "span";
  className?: string;
};

export function SkeletonBlock({ as = "div", className = "" }: Props) {
  const classes = `skeleton ${className}`.trim();

  if (as === "span") {
    return <span className={classes} aria-hidden="true" />;
  }

  return <div className={classes} aria-hidden="true" />;
}
