import * as React from "react";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "secondary" | "destructive" | "default";
  size?: "icon" | "default";
};

export function Button({ variant = "default", size = "default", className = "", ...props }: Props) {
  const variantCls =
    variant === "secondary" ? "bg-slate-100 hover:bg-slate-200" :
    variant === "destructive" ? "bg-red-600 text-white hover:bg-red-700" :
    "bg-blue-600 text-white hover:bg-blue-700";
  const sizeCls = size === "icon" ? "p-2" : "px-3 py-2";
  return <button className={`${variantCls} ${sizeCls} rounded-lg ${className}`} {...props} />;
}
