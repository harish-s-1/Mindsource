import { cn } from "@/lib/cn";

export interface Column<T> {
  key: string;
  header: string;
  align?: "left" | "right" | "center";
  numeric?: boolean; // apply tabular figures
  width?: string;
  render: (row: T) => React.ReactNode;
}

export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  onRowClick,
  emptyLabel = "No records",
  dense = true,
}: {
  columns: Column<T>[];
  rows: T[];
  getRowKey: (row: T, index: number) => string;
  onRowClick?: (row: T) => void;
  emptyLabel?: string;
  dense?: boolean;
}) {
  const alignClass = (align?: "left" | "right" | "center") =>
    align === "right"
      ? "text-right"
      : align === "center"
        ? "text-center"
        : "text-left";

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                style={col.width ? { width: col.width } : undefined}
                className={cn(
                  "bg-surface-2 px-3 py-2 text-2xs font-semibold uppercase tracking-wide text-text-muted whitespace-nowrap",
                  alignClass(col.align),
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-3 py-8 text-center text-sm text-text-muted"
              >
                {emptyLabel}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr
                key={getRowKey(row, i)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={
                  onRowClick
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onRowClick(row);
                        }
                      }
                    : undefined
                }
                className={cn(
                  "border-b border-border/70 last:border-b-0",
                  onRowClick &&
                    "cursor-pointer hover:bg-surface-2 focus:bg-surface-2 focus:outline-none",
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      dense ? "px-3 py-2" : "px-3 py-2.5",
                      "text-text-primary align-middle whitespace-nowrap",
                      alignClass(col.align),
                      col.numeric && "tabular",
                    )}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
