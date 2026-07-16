import { Compass, Ghost, Home, RefreshCw } from 'lucide-react';
import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom';

export function RouteErrorPage() {
  const error = useRouteError();
  const is404 = isRouteErrorResponse(error) && error.status === 404;

  if (import.meta.env.DEV && error) {
    console.error(error);
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-5 px-6">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-[rgba(55,53,47,0.05)] text-[rgba(55,53,47,0.55)]">
        {is404 ? (
          <Compass className="size-7" strokeWidth={1.5} />
        ) : (
          <Ghost className="size-7" strokeWidth={1.5} />
        )}
      </div>
      <p className="text-sm text-[rgba(55,53,47,0.55)]">
        {is404 ? '知识走丢了' : '知识开了个小差'}
      </p>
      <div className="flex items-center gap-5 text-sm text-[rgba(55,53,47,0.75)]">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 hover:text-[rgba(55,53,47,1)]"
          onClick={() => window.location.reload()}
        >
          <RefreshCw className="size-3.5" strokeWidth={1.75} />
          刷新
        </button>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 hover:text-[rgba(55,53,47,1)]"
        >
          <Home className="size-3.5" strokeWidth={1.75} />
          Home
        </Link>
      </div>
    </div>
  );
}
