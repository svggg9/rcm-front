import type { ComponentPropsWithRef } from "react";

/** Native table semantics; callers keep their scrolling region and column structure. */
export function DataTable({ className = "", ...props }: ComponentPropsWithRef<"table">) {
  return <table {...props} className={`dataTable ${className}`.trim()} data-ui="data-table" />;
}
