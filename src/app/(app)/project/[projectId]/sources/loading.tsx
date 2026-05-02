function LoadingBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-md bg-muted/55 ${className}`} />;
}

export default function SourcesLoading() {
  return (
    <div className="-m-4 grid h-svh min-h-0 grid-rows-[20rem_minmax(0,1fr)] overflow-hidden bg-background lg:grid-cols-[21rem_minmax(0,1fr)] lg:grid-rows-1">
      <div className="flex min-h-0 flex-col border-b border-border/70 bg-card/40 p-2 lg:border-b-0 lg:border-r">
        <div className="shrink-0 border-b border-border/60 bg-card/95 px-1 pb-3 pt-1">
          <div className="mb-3 flex items-center justify-between gap-3">
            <LoadingBlock className="h-6 w-28" />
            <LoadingBlock className="h-8 w-20" />
          </div>
          <LoadingBlock className="h-9 w-full" />
          <div className="mt-2 flex gap-1.5">
            <LoadingBlock className="h-6 w-24 rounded-full" />
            <LoadingBlock className="h-6 w-28 rounded-full" />
            <LoadingBlock className="h-6 w-20 rounded-full" />
          </div>
        </div>
        <div className="min-h-0 flex-1 space-y-0 overflow-hidden">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="border-b border-border/60 px-4 py-3">
              <div className="flex items-center gap-2">
                <LoadingBlock className="size-7" />
                <LoadingBlock className="h-5 flex-1" />
              </div>
              <LoadingBlock className="mt-3 h-4 w-[92%]" />
              <LoadingBlock className="mt-2 h-4 w-[68%]" />
            </div>
          ))}
        </div>
      </div>
      <div className="min-h-0 overflow-hidden p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-3">
            <LoadingBlock className="h-5 w-32 rounded-full" />
            <LoadingBlock className="h-8 w-80 max-w-full" />
            <LoadingBlock className="h-4 w-72 max-w-full" />
          </div>
          <div className="flex gap-2">
            <LoadingBlock className="h-8 w-24" />
            <LoadingBlock className="h-8 w-20" />
          </div>
        </div>
        <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_min(100%,14rem)]">
          <div className="space-y-8">
            <div className="space-y-3">
              <LoadingBlock className="h-4 w-24" />
              <LoadingBlock className="h-5 w-[88%]" />
              <LoadingBlock className="h-5 w-[80%]" />
              <LoadingBlock className="h-5 w-[72%]" />
            </div>
            <LoadingBlock className="h-72 w-full" />
          </div>
          <div className="space-y-3">
            <LoadingBlock className="h-64 w-full" />
            <LoadingBlock className="h-64 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
