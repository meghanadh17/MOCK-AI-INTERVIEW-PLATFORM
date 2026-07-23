import { useToast } from "./toast"

export function Toaster() {
  const { toasts, dismiss } = useToast()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm pointer-events-none select-none">
      {toasts.map(({ id, title, description, type }) => {
        let borderColor = 'border-border-def';
        let icon = '🔔';
        if (type === 'success') {
          borderColor = 'border-emerald-500/30';
          icon = '🟢';
        } else if (type === 'error') {
          borderColor = 'border-rose-500/30';
          icon = '🔴';
        } else if (type === 'warning') {
          borderColor = 'border-amber-500/30';
          icon = '🟡';
        } else if (type === 'info') {
          borderColor = 'border-sky-500/30';
          icon = '🔵';
        }

        return (
          <div
            key={id}
            className={`p-4 bg-bg-surface/90 backdrop-blur-md border ${borderColor} rounded-xl shadow-lg pointer-events-auto flex items-start justify-between gap-3 animate-slide-in-right relative overflow-hidden`}
          >
            <span className="text-sm shrink-0">{icon}</span>
            <div className="flex-1 min-w-0 text-left">
              {title && <h5 className="text-xs font-semibold text-text-prim leading-normal">{title}</h5>}
              {description && <p className="text-[11px] text-text-sec leading-relaxed mt-0.5">{description}</p>}
            </div>
            <button
              onClick={() => dismiss(id)}
              className="text-text-muted hover:text-text-prim p-1 transition-colors leading-none text-base shrink-0"
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  )
}
