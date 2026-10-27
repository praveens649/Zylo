import React, { forwardRef } from "react";
import { Link as RouterLink } from "react-router-dom";

export interface NextLinkProps
  extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  href: string | { pathname?: string; query?: Record<string, string> };
  replace?: boolean;
  scroll?: boolean;
  prefetch?: boolean;
  children?: React.ReactNode;
}

const Link = forwardRef<HTMLAnchorElement, NextLinkProps>(
  ({ href, replace, children, scroll: _scroll, prefetch: _prefetch, ...props }, ref) => {
    let to = "/";
    if (typeof href === "string") {
      to = href;
    } else if (href && typeof href === "object") {
      to = href.pathname || "/";
      if (href.query) {
        const qs = new URLSearchParams(href.query).toString();
        if (qs) to += `?${qs}`;
      }
    }

    return (
      <RouterLink ref={ref} to={to} replace={replace} {...props}>
        {children}
      </RouterLink>
    );
  }
);

Link.displayName = "Link";

export default Link;
export { Link };
