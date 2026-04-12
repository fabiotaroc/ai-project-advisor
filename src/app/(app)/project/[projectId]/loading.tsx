function LoadingBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl bg-muted/70 ${className}`} />;
}

export default function ProjectLoading() {
  return (
    <section className="flex min-h-[38rem] flex-col">
      <div className="flex min-h-0 flex-col rounded-[1.75rem] border border-border/70 bg-card/95 shadow-[0_24px_80px_-36px_rgba(15,23,42,0.35)]">
        <div className="flex items-center justify-between border-b border-border/70 px-6 py-5">
          <LoadingBlock className="h-5 w-32" />
          <div className="flex items-center gap-2">
            <LoadingBlock className="h-9 w-24 rounded-full" />
            <LoadingBlock className="h-9 w-28 rounded-full" />
          </div>
        </div>
        <div className="flex-1 space-y-6 overflow-hidden px-6 py-6">
          <div className="grid gap-4 md:grid-cols-3">
            <LoadingBlock className="h-28" />
            <LoadingBlock className="h-28" />
            <LoadingBlock className="h-28" />
          </div>
          <div className="space-y-3">
            <LoadingBlock className="h-5 w-40" />
            <LoadingBlock className="h-14 w-full" />
            <LoadingBlock className="h-14 w-full" />
            <LoadingBlock className="h-14 w-[82%]" />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <LoadingBlock className="h-48" />
            <LoadingBlock className="h-48" />
          </div>
        </div>
      </div>
    </section>
  );
}
