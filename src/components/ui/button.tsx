import * as React from "react";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "secondary" | "destructive" | "default" | "ghost";
  size?: "icon" | "default";
};

export function Button({ variant = "default", size = "default", className = "", ...props }: Props) {
  const base = "rounded-lg transition";
  const variantCls =
    variant === "secondary" ? " bg-slate-200 hover:bg-slate-300 text-slate-900 " :
    variant === "destructive" ? " bg-red-600 hover:bg-red-700 text-white " :
    variant === "ghost" ? " bg-transparent hover:bg-slate-100 text-slate-900 " :
    " bg-blue-600 hover:bg-blue-700 text-white ";
  const sizeCls = size === "icon" ? " p-2 " : " px-3 py-2 ";
  return <button className={base + variantCls + sizeCls + className} {...props} />;
}
