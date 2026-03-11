import { motion as Motion } from 'framer-motion';
import { cn } from '../../lib/cn';

const transition = { duration: 0.25, ease: [0.16, 1, 0.3, 1] };

/**
 * @param {{
 *   title?: import('react').ReactNode;
 *   children?: import('react').ReactNode;
 *   muted?: boolean;
 *   className?: string;
 *   contentClassName?: string;
 * }} props
 */
export function Section({ title, children, muted = false, className, contentClassName }) {
  return (
    <Motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0, transition }}
      exit={{ opacity: 0, y: -12, transition }}
      className={cn(
        'rounded-2xl border border-border/60 bg-card shadow-brand p-6 md:p-8 mb-6 md:mb-8',
        muted && 'bg-card2',
        className
      )}
    >
      {title ? (
        <header className="space-y-2 mb-4">
          <h2 className="text-4xl md:text-5xl font-semibold leading-tight tracking-tight text-fg">
            {title}
          </h2>
          <div className="border-t border-border/60" />
        </header>
      ) : null}
      <div className={cn('space-y-4 text-lg leading-8 text-fg max-w-measure', contentClassName)}>
        {children}
      </div>
    </Motion.section>
  );
}

/**
 * @param {React.ComponentProps<typeof Section>} props
 */
export function SectionMuted(props) {
  return <Section {...props} muted />;
}
