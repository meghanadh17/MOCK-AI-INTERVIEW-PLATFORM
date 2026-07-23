export function GradientCard({ children, className = '' }: any) {
  return (
    <div className={`p-6 bg-bg-surface border border-border-def rounded-xl relative overflow-hidden interactive-card ${className}`}>
      {children}
    </div>
  );
}