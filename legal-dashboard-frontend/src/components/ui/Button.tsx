import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "quiet";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
};

export function Button({ children, variant = "primary", className = "", ...props }: ButtonProps) {
  return (
    <button className={`button button-${variant} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}
