import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Card } from '../../../components/ui/card';
import * as styles from '../../../components/ui/card.styles';

describe('Card', () => {
  it('renders children and optional header/footer', () => {
    render(
      <Card header={<span>H</span>} footer={<span>F</span>} data-testid="card">
        body
      </Card>
    );
    expect(screen.getByText('body')).toBeInTheDocument();
    expect(screen.getByText('H')).toBeInTheDocument();
    expect(screen.getByText('F')).toBeInTheDocument();
  });

  it('sets button role when clickable', () => {
    render(
      <Card clickable hoverable>
        c
      </Card>
    );
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('exports style primitives used by Card', () => {
    expect(styles.StyledCard).toBeDefined();
    expect(styles.CardHeader).toBeDefined();
    expect(styles.CardContent).toBeDefined();
    expect(styles.CardFooter).toBeDefined();
    expect(styles.CardTitle).toBeDefined();
    expect(styles.CardDescription).toBeDefined();
  });
});
