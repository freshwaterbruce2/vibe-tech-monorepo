/**
 * Dialog — shadcn/ui-standard naming alias for Modal.
 *
 * Both `Dialog*` and `Modal*` names are exported so consumers
 * can pick whichever convention they prefer. Under the hood they
 * are the exact same Radix-Dialog-backed components.
 */
export {
    Modal as Dialog, ModalClose as DialogClose,
    ModalContent as DialogContent, ModalDescription as DialogDescription, ModalFooter as DialogFooter, ModalHeader as DialogHeader, ModalOverlay as DialogOverlay, ModalPortal as DialogPortal, ModalTitle as DialogTitle, ModalTrigger as DialogTrigger
} from './modal';
