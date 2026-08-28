/**
 * ArtifactCommentThread — non-blocking comment thread on an artifact
 * (spec 09 Phase 2). Submitting never pauses the agent: while the task runs,
 * the comment is injected at its next step boundary and the delivery badge
 * tracks queued → delivered; on a finished task it is recorded as feedback.
 * Spec: FEATURE_SPECS/competitive-gaps/09-VERIFIABLE-ARTIFACTS.md
 */
import { MessageSquare, Send } from 'lucide-react';
import { useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { ArtifactComment, CommentDelivery } from '../../services/artifacts/types';
import * as S from './styled';

const DELIVERY_LABEL: Record<CommentDelivery, string> = {
  queued: 'sending to agent…',
  delivered: 'delivered to agent',
  feedback: 'feedback',
};

export interface ArtifactCommentThreadProps {
  comments: ArtifactComment[];
  onSubmit: (body: string) => void;
}

export const ArtifactCommentThread = ({ comments, onSubmit }: ArtifactCommentThreadProps) => {
  const [draft, setDraft] = useState('');

  const submit = () => {
    if (!draft.trim()) return;
    onSubmit(draft);
    setDraft('');
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <S.CommentThread data-testid="artifact-comment-thread">
      <S.CommentHeading>
        <MessageSquare size={13} />
        Comments ({comments.length})
      </S.CommentHeading>
      {comments.map(comment => (
        <S.CommentItem key={comment.id} data-testid={`artifact-comment-${comment.id}`}>
          <S.CommentBody>{comment.body}</S.CommentBody>
          <S.CommentMeta>
            <span>{new Date(comment.createdAt).toLocaleString()}</span>
            <S.DeliveryBadge $delivery={comment.delivery}>
              {DELIVERY_LABEL[comment.delivery]}
            </S.DeliveryBadge>
          </S.CommentMeta>
        </S.CommentItem>
      ))}
      <S.CommentInputRow>
        <S.CommentInput
          value={draft}
          onChange={event => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Comment — a running agent picks this up at its next step"
          aria-label="Add a comment"
        />
        <S.IconButton onClick={submit} title="Send comment" aria-label="Send comment">
          <Send size={14} />
        </S.IconButton>
      </S.CommentInputRow>
    </S.CommentThread>
  );
};
