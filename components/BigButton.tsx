import type { ButtonHTMLAttributes } from 'react';

export const BigButton = ({
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button className={`btn btn-details ${className}`} {...props}>
    <span className="btn-details__text">{children}</span>
    <span className="btn-details__shadow"></span>
  </button>
);
