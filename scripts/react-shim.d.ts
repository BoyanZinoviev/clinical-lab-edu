// Лек заместител на типовете на React – САМО за локална проверка в среда без достъп до npm.
// В реалния проект (npm install) се използват @types/react и @types/react-dom; този файл не е част от доставката.
declare module 'react' {
  export type ReactNode = any;
  export type CSSProperties = { [k: string]: any };
  export type Dispatch<A> = (value: A) => void;
  export type SetStateAction<S> = S | ((prev: S) => S);
  export function useState<S>(initial: S | (() => S)): [S, Dispatch<SetStateAction<S>>];
  export function useEffect(effect: () => void | (() => void), deps?: readonly unknown[]): void;
  export function useRef<T>(initial: null): { current: T | null };
  export function useRef<T>(initial: T): { current: T };
  export type KeyboardEvent<T = Element> = any;
  export function useMemo<T>(factory: () => T, deps: readonly unknown[]): T;
  export function useCallback<T extends (...args: any[]) => any>(cb: T, deps: readonly unknown[]): T;
  export function useId(): string;
  export function useSyncExternalStore<T>(subscribe: (cb: () => void) => () => void, getSnapshot: () => T, getServerSnapshot?: () => T): T;
  export const Fragment: any;
  export const StrictMode: any;
}
declare module 'react/jsx-runtime' {
  export const jsx: any;
  export const jsxs: any;
  export const Fragment: any;
}
declare module 'react-dom/client' {
  export function createRoot(el: Element | DocumentFragment): { render(node: any): void };
}
declare namespace JSX {
  interface Element {}
  interface ElementClass {}
  interface IntrinsicAttributes { key?: any }
  interface IntrinsicElements {
    [k: string]: {
      [p: string]: any;
      onClick?: (e: any) => void;
      onChange?: (e: any) => void;
      onKeyDown?: (e: any) => void;
      onInput?: (e: any) => void;
      onFocus?: (e: any) => void;
      onBlur?: (e: any) => void;
      onMouseEnter?: (e: any) => void;
      onMouseLeave?: (e: any) => void;
      onPointerDown?: (e: any) => void;
      onSubmit?: (e: any) => void;
    };
  }
}
declare module '*.css' {}
