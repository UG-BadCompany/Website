import { createContext, ReactNode, useContext, useEffect, useMemo, useState, type AnchorHTMLAttributes } from 'react';

type RouterState = { path: string; push: (path: string) => void };
const RouterContext = createContext<RouterState>({ path: '/', push: () => undefined });

export function RouterProvider({ children }: { children: ReactNode }) {
  const currentPath = () => `${window.location.pathname}${window.location.search}`;
  const [path, setPath] = useState(currentPath());
  useEffect(() => {
    const onPop = () => setPath(currentPath());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const value = useMemo(() => ({ path, push: (next: string) => { history.pushState(null, '', next); setPath(next); window.scrollTo(0,0); } }), [path]);
  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}
export function useRouter() { return useContext(RouterContext); }
export function Link({ href, children, className, ...props }: { href: string; children: ReactNode; className?: string } & AnchorHTMLAttributes<HTMLAnchorElement>) {
  const router = useRouter();
  return <a href={href} className={className} {...props} onClick={(e) => { props.onClick?.(e); if (e.defaultPrevented) return; e.preventDefault(); router.push(href); }}>{children}</a>;
}
export function NavLink({ href, children }: { href: string; children: ReactNode }) {
  const { path, push } = useRouter();
  return <a href={href} className={path === href ? 'active' : ''} onClick={(e) => { e.preventDefault(); push(href); }}>{children}</a>;
}
