import * as Dialog from '@radix-ui/react-dialog';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import * as React from 'react';

import { cn } from '../lib/utils';

const Modal = Dialog.Root;
const ModalTrigger = Dialog.Trigger;
const ModalPortal = Dialog.Portal;
const ModalClose = Dialog.Close;

const modalOverlayVariants = cva(
  'fixed inset-0 z-50 data-[state=open]:animate-in data-[state=closed]:animate-out',
  {
    variants: {
      variant: {
        default: 'bg-black/80',
        glass: 'bg-slate-900/70 backdrop-blur-lg',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

const ModalOverlay = React.forwardRef<
  React.ElementRef<typeof Dialog.Overlay>,
  React.ComponentPropsWithoutRef<typeof Dialog.Overlay> &
    VariantProps<typeof modalOverlayVariants>
>(({ className, variant, ...props }, ref) => (
  <Dialog.Overlay ref={ref} className={cn(modalOverlayVariants({ variant }), className)} {...props} />
));
ModalOverlay.displayName = Dialog.Overlay.displayName;

const modalContentVariants = cva(
  'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 shadow-lg',
  {
    variants: {
      variant: {
        default: 'border bg-background p-6 rounded-lg',
        glass: 'glass-card p-6 rounded-2xl border border-white/20',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

interface ModalContentProps
  extends React.ComponentPropsWithoutRef<typeof Dialog.Content>,
    VariantProps<typeof modalContentVariants> {
  showClose?: boolean;
}

const ModalContent = React.forwardRef<React.ElementRef<typeof Dialog.Content>, ModalContentProps>(
  ({ className, variant, showClose = true, children, ...props }, ref) => (
    <ModalPortal>
      <ModalOverlay variant={variant === 'glass' ? 'glass' : 'default'} />
      <Dialog.Content ref={ref} className={cn(modalContentVariants({ variant }), className)} {...props}>
        {children}
        {showClose && (
          <Dialog.Close className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Dialog.Close>
        )}
      </Dialog.Content>
    </ModalPortal>
  )
);
ModalContent.displayName = Dialog.Content.displayName;

const ModalHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)} {...props} />
);

const ModalFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)} {...props} />
);

const ModalTitle = React.forwardRef<
  React.ElementRef<typeof Dialog.Title>,
  React.ComponentPropsWithoutRef<typeof Dialog.Title>
>(({ className, ...props }, ref) => (
  <Dialog.Title ref={ref} className={cn('text-lg font-semibold', className)} {...props} />
));
ModalTitle.displayName = Dialog.Title.displayName;

const ModalDescription = React.forwardRef<
  React.ElementRef<typeof Dialog.Description>,
  React.ComponentPropsWithoutRef<typeof Dialog.Description>
>(({ className, ...props }, ref) => (
  <Dialog.Description ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
));
ModalDescription.displayName = Dialog.Description.displayName;

export {
  Modal,
  ModalPortal,
  ModalOverlay,
  ModalClose,
  ModalTrigger,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalTitle,
  ModalDescription,
};
