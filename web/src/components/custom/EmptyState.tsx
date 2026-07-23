export function EmptyState({ message }: { message: string }) {
  return <div className="text-center p-8 border border-dashed border-border-strong rounded-xl text-text-muted text-xs">{message}</div>;
}