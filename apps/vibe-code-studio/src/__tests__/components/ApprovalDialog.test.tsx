import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { FileChange } from '@vibetech/types';

import { ApprovalDialog } from '../../components/ApprovalDialog';

const makeChange = (overrides: Partial<FileChange> = {}): FileChange => ({
  path: 'src/components/Button.tsx',
  originalContent: 'old',
  newContent: 'new',
  changeType: 'modify',
  ...overrides,
});

const baseChanges: FileChange[] = [
  makeChange({ path: 'src/components/Button.tsx', changeType: 'modify', reason: 'Refactor props' }),
  makeChange({ path: 'src/utils/new-helper.ts', changeType: 'create' }),
  makeChange({ path: 'src/legacy/old.ts', changeType: 'delete' }),
];

const renderDialog = (props: Partial<Parameters<typeof ApprovalDialog>[0]> = {}) => {
  const onApprove = vi.fn();
  const onReject = vi.fn();
  const onReviewChanges = vi.fn();
  const utils = render(
    <ApprovalDialog
      isOpen
      changes={baseChanges}
      estimatedImpact="low"
      taskDescription="Update the button component"
      onApprove={onApprove}
      onReject={onReject}
      onReviewChanges={onReviewChanges}
      {...props}
    />
  );
  return { ...utils, onApprove, onReject, onReviewChanges };
};

describe('ApprovalDialog Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Open vs closed', () => {
    it('renders the dialog content when isOpen is true', () => {
      renderDialog();
      expect(screen.getByText('Review Changes')).toBeInTheDocument();
    });

    it('renders nothing when isOpen is false', () => {
      renderDialog({ isOpen: false });
      expect(screen.queryByText('Review Changes')).not.toBeInTheDocument();
    });
  });

  describe('Content rendering', () => {
    it('displays the task description', () => {
      renderDialog({ taskDescription: 'Migrate to the new API' });
      expect(screen.getByText('Migrate to the new API')).toBeInTheDocument();
    });

    it('renders the estimated impact badge in upper case', () => {
      renderDialog({ estimatedImpact: 'medium' });
      expect(screen.getByText('MEDIUM IMPACT')).toBeInTheDocument();
    });

    it('counts files by change type in the summary', () => {
      // baseChanges: 1 create, 1 modify, 1 delete
      renderDialog();
      const created = screen.getByText('files created').closest('div');
      const modified = screen.getByText('files modified').closest('div');
      const deleted = screen.getByText('files deleted').closest('div');
      expect(created).toHaveTextContent('1');
      expect(modified).toHaveTextContent('1');
      expect(deleted).toHaveTextContent('1');
    });

    it('lists every file path in the change list', () => {
      renderDialog();
      expect(screen.getByText('src/components/Button.tsx')).toBeInTheDocument();
      expect(screen.getByText('src/utils/new-helper.ts')).toBeInTheDocument();
      expect(screen.getByText('src/legacy/old.ts')).toBeInTheDocument();
    });

    it('shows the file count header reflecting the number of changes', () => {
      renderDialog();
      expect(screen.getByText('Files to Change (3)')).toBeInTheDocument();
    });

    it('renders a change-type badge for each file', () => {
      renderDialog();
      expect(screen.getByText('create')).toBeInTheDocument();
      expect(screen.getByText('modify')).toBeInTheDocument();
      expect(screen.getByText('delete')).toBeInTheDocument();
    });

    it('renders the approve button label with the selected file count', () => {
      // All files start selected (Set seeded from changes)
      renderDialog();
      expect(screen.getByText('Apply Changes (3)')).toBeInTheDocument();
    });
  });

  describe('High impact warning', () => {
    it('shows the high-risk warning only for high impact', () => {
      renderDialog({ estimatedImpact: 'high' });
      expect(screen.getByText('High Risk Operation')).toBeInTheDocument();
      expect(
        screen.getByText(/These changes will affect 3 files/)
      ).toBeInTheDocument();
    });

    it('omits the high-risk warning for low impact', () => {
      renderDialog({ estimatedImpact: 'low' });
      expect(screen.queryByText('High Risk Operation')).not.toBeInTheDocument();
    });
  });

  describe('Callbacks', () => {
    it('calls onApprove when Apply Changes is clicked (files selected)', () => {
      const { onApprove } = renderDialog();
      fireEvent.click(screen.getByText(/Apply Changes/));
      expect(onApprove).toHaveBeenCalledTimes(1);
    });

    it('calls onReject when Cancel is clicked', () => {
      const { onReject } = renderDialog();
      fireEvent.click(screen.getByText('Cancel'));
      expect(onReject).toHaveBeenCalledTimes(1);
    });

    it('calls onReject when the backdrop is clicked', () => {
      const { container, onReject } = renderDialog();
      // Backdrop renders first (before the Dialog) inside the fragment and is the
      // only fixed-position element with no text content / its own onClick handler.
      const backdrop = container.firstElementChild as HTMLElement;
      expect(backdrop).toBeTruthy();
      // Sanity: the backdrop is not the dialog (which contains the title text)
      expect(backdrop).not.toHaveTextContent('Review Changes');
      fireEvent.click(backdrop);
      expect(onReject).toHaveBeenCalledTimes(1);
    });

    it('calls onReviewChanges when Preview Diffs is clicked', () => {
      const { onReviewChanges } = renderDialog();
      fireEvent.click(screen.getByText('Preview Diffs'));
      expect(onReviewChanges).toHaveBeenCalledTimes(1);
    });
  });

  describe('File selection', () => {
    it('does not call onApprove and alerts when no files are selected', () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      const { onApprove } = renderDialog();

      // Deselect all three checkboxes
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(3);
      checkboxes.forEach((cb) => fireEvent.click(cb));

      fireEvent.click(screen.getByText(/Apply Changes/));

      expect(alertSpy).toHaveBeenCalledWith(
        'Please select at least one file to apply changes'
      );
      expect(onApprove).not.toHaveBeenCalled();
    });

    it('updates the approve button count as files are deselected', () => {
      renderDialog();
      expect(screen.getByText('Apply Changes (3)')).toBeInTheDocument();

      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);

      expect(screen.getByText('Apply Changes (2)')).toBeInTheDocument();
      expect(screen.queryByText('Apply Changes (3)')).not.toBeInTheDocument();
    });

    it('exposes an accessible label on each file checkbox', () => {
      renderDialog();
      // aria-label is `Select file <basename>`
      expect(
        screen.getByLabelText('Select file Button.tsx')
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText('Select file new-helper.ts')
      ).toBeInTheDocument();
      expect(screen.getByLabelText('Select file old.ts')).toBeInTheDocument();
    });
  });

  describe('Detail toggle', () => {
    it('reveals the change reason only after Show Details is clicked', () => {
      renderDialog();
      // reason on the first change is "Refactor props"; hidden until expanded
      expect(screen.queryByText('Refactor props')).not.toBeInTheDocument();

      fireEvent.click(screen.getByText('Show Details'));
      expect(screen.getByText('Refactor props')).toBeInTheDocument();

      // Toggle back hides it again
      fireEvent.click(screen.getByText('Hide Details'));
      expect(screen.queryByText('Refactor props')).not.toBeInTheDocument();
    });
  });

  describe('Safety checklist', () => {
    it('always renders the static safety features', () => {
      renderDialog();
      expect(screen.getByText('Safety Features')).toBeInTheDocument();
      expect(
        screen.getByText('Automatic backup created before changes')
      ).toBeInTheDocument();
      expect(
        screen.getByText('Atomic operation with automatic rollback')
      ).toBeInTheDocument();
    });
  });
});
