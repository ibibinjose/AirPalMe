import type { ComponentType, ReactNode } from "react";

export type ProviderComponent = ComponentType<{ children: ReactNode }>;

/** Right-to-left compose: composeProviders([A, B])(children) === <A><B>{children}</B></A>. */
export function composeProviders(providers: ProviderComponent[]) {
  return function Composed({ children }: { children: ReactNode }) {
    return providers.reduceRight<ReactNode>((acc, Provider) => <Provider>{acc}</Provider>, children);
  };
}
