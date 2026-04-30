import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './app';

describe('App', () => {
  it('renders the booking landing content', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByText(/clean-break booking mvp/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /search hotels/i })).toBeTruthy();
  });
});
