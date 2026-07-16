import * as TooltipPrimitive from '@radix-ui/react-tooltip';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <TooltipPrimitive.Provider delayDuration={0}>
      {children}
    </TooltipPrimitive.Provider>
  );
}
