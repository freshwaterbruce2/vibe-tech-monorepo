import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import clsx from 'clsx';

export type CategoryType = 'chore' | 'learning' | 'physical' | 'social' | 'creative';

export interface CategoryIconProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof categoryIconVariants> {
  category: CategoryType;
  showLabel?: boolean;
}

const categoryIcons: Record<CategoryType, string> = {
  chore: '🧹',
  learning: '📚',
  physical: '💪',
  social: '🤝',
  creative: '🎨',
};

const categoryLabels: Record<CategoryType, string> = {
  chore: 'Chore',
  learning: 'Learning',
  physical: 'Physical',
  social: 'Social',
  creative: 'Creative',
};

const categoryColors: Record<CategoryType, { bg: string; text: string; border: string }> = {
  chore: { bg: 'bg-blue-primary/20', text: 'text-blue-light', border: 'border-blue-primary/30' },
  learning: { bg: 'bg-purple/20', text: 'text-purple', border: 'border-purple/30' },
  physical: { bg: 'bg-green-primary/20', text: 'text-green-light', border: 'border-green-primary/30' },
  social: { bg: 'bg-orange/20', text: 'text-orange', border: 'border-orange/30' },
  creative: { bg: 'bg-gold/20', text: 'text-gold', border: 'border-gold/30' },
};

const categoryIconVariants = cva(
  'flex items-center justify-center rounded-lg transition-all',
  {
    variants: {
      size: {
        sm: 'w-8 h-8 text-lg',
        md: 'w-10 h-10 text-xl',
        lg: 'w-12 h-12 text-2xl',
        xl: 'w-16 h-16 text-3xl',
      },
      variant: {
        default: '',
        filled: '',
        outline: 'border-2 bg-transparent',
        ghost: 'bg-transparent',
      },
    },
    defaultVariants: {
      size: 'md',
      variant: 'default',
    },
  },
);

export const CategoryIcon = forwardRef<HTMLDivElement, CategoryIconProps>(
  (
    { className, size, variant = 'default', category, showLabel = false, children, ...props },
    ref,
  ) => {
    const colors = categoryColors[category];
    const icon = categoryIcons[category];
    const label = categoryLabels[category];

    const variantClasses = {
      default: clsx(colors.bg, colors.text),
      filled: clsx(colors.bg, colors.text),
      outline: clsx(colors.border, colors.text),
      ghost: colors.text,
    };

    return (
      <div className="inline-flex items-center gap-2">
        <div
          ref={ref}
          className={clsx(
            categoryIconVariants({ size, variant }),
            variantClasses[variant || 'default'],
            className,
          )}
          title={label}
          {...props}
        >
          {icon}
          {children}
        </div>
        {showLabel && (
          <span className={clsx('font-medium', colors.text)}>{label}</span>
        )}
      </div>
    );
  },
);

CategoryIcon.displayName = 'CategoryIcon';

// Category filter tabs
export const CategoryFilter = ({
  categories,
  selected,
  onSelect,
  className,
}: {
  categories: CategoryType[];
  selected: CategoryType | 'all';
  onSelect: (category: CategoryType | 'all') => void;
  className?: string;
}) => {
  const allCategories: (CategoryType | 'all')[] = ['all', ...categories];

  return (
    <div className={clsx('flex flex-wrap gap-2', className)}>
      {allCategories.map((category) => (
        <button
          key={category}
          onClick={() => onSelect(category)}
          className={clsx(
            'flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-all',
            selected === category
              ? 'bg-bg-elevated text-text-primary shadow-sm'
              : 'text-text-muted hover:text-text-secondary',
          )}
        >
          {category !== 'all' && (
            <CategoryIcon
              category={category}
              size="sm"
              variant="ghost"
              className="!w-6 !h-6 !text-base"
            />
          )}
          {category === 'all' ? 'All' : categoryLabels[category]}
        </button>
      ))}
    </div>
  );
};

// Category stats display
export const CategoryStats = ({
  stats,
  className,
}: {
  stats: Record<CategoryType, number>;
  className?: string;
}) => {
  const total = Object.values(stats).reduce((a, b) => a + b, 0);

  return (
    <div className={clsx('grid grid-cols-5 gap-2', className)}>
      {(Object.keys(stats) as CategoryType[]).map((category) => {
        const count = stats[category];
        const percentage = total > 0 ? (count / total) * 100 : 0;
        const colors = categoryColors[category];

        return (
          <div
            key={category}
            className="flex flex-col items-center gap-1 rounded-lg bg-bg-card p-2"
          >
            <CategoryIcon category={category} size="md" />
            <span className="text-lg font-bold text-text-primary">{count}</span>
            <div className={clsx('h-1 w-full rounded-full bg-bg-elevated')}>
              <div
                className={clsx('h-full rounded-full transition-all', colors.bg.replace('/20', ''))}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Category distribution chart (simple bar chart)
export const CategoryDistribution = ({
  data,
  className,
}: {
  data: Record<CategoryType, number>;
  className?: string;
}) => {
  const max = Math.max(...Object.values(data));

  return (
    <div className={clsx('space-y-2', className)}>
      {(Object.keys(data) as CategoryType[]).map((category) => {
        const value = data[category];
        const percentage = max > 0 ? (value / max) * 100 : 0;
        const colors = categoryColors[category];

        return (
          <div key={category} className="flex items-center gap-3">
            <CategoryIcon category={category} size="sm" />
            <div className="flex-1">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-text-secondary">{categoryLabels[category]}</span>
                <span className="font-medium text-text-primary">{value}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-bg-elevated">
                <div
                  className={clsx('h-full rounded-full transition-all', colors.bg.replace('/20', ''))}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
