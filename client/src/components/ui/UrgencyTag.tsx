export type UrgencyType = 'overdue' | 'urgent' | 'soon' | 'upcoming';

export interface UrgencyTagProps {
  urgency: UrgencyType;
  label?: string;
  className?: string;
}

const config = {
  overdue: {
    bg: 'bg-rose-50 dark:bg-[#5C2828]',
    text: 'text-rose-800 dark:text-[#FFD2D2]',
    dot: 'bg-rose-600 dark:bg-[#F87171]',
    border: 'border-rose-200 dark:border-rose-700/60',
    defaultLabel: 'Overdue',
  },
  urgent: {
    bg: 'bg-orange-50 dark:bg-[#5A2C14]',
    text: 'text-orange-800 dark:text-[#FFDEC7]',
    dot: 'bg-orange-600 dark:bg-[#FB923C]',
    border: 'border-orange-200 dark:border-orange-700/60',
    defaultLabel: 'Urgent',
  },
  soon: {
    bg: 'bg-amber-50 dark:bg-[#54390E]',
    text: 'text-amber-800 dark:text-[#FFE8AD]',
    dot: 'bg-amber-600 dark:bg-[#FBBF24]',
    border: 'border-amber-200 dark:border-amber-700/60',
    defaultLabel: 'Due Soon',
  },
  upcoming: {
    bg: 'bg-teal-50 dark:bg-surface-800',
    text: 'text-teal-800 dark:text-primary-200',
    dot: 'bg-teal-600 dark:bg-primary-300',
    border: 'border-teal-200 dark:border-surface-700',
    defaultLabel: 'Upcoming',
  },
};

export function UrgencyTag({ urgency, label, className = '' }: UrgencyTagProps) {
  const current = config[urgency] || config.upcoming;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${current.bg} ${current.text} ${current.border} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${current.dot} flex-shrink-0 animate-pulse`} />
      {label || current.defaultLabel}
    </span>
  );
}

export default UrgencyTag;

