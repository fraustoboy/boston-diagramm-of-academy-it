import * as React from "react";

export function Table(props: React.TableHTMLAttributes<HTMLTableElement>) {
  return <table {...props} className={`w-full border-collapse ${props.className || ""}`} />;
}
export function TableHeader(props: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead {...props} />;
}
export function TableBody(props: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody {...props} />;
}
export function TableRow(props: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr {...props} style={{ borderBottom: "1px solid #e5e7eb" }} />;
}
export function TableHead(props: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return <th {...props} style={{ textAlign: "left", padding: "8px" }} />;
}
export function TableCell(props: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td {...props} style={{ padding: "8px", verticalAlign: "middle" }} />;
}
