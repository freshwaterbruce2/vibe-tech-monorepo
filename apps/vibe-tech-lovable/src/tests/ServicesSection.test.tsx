import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import ServicesSection from '../components/home/ServicesSection';

const serviceNames = [
  'Micro-SaaS Launches',
  'Education Platforms',
  'AI Business Tools',
  'Clinic Operations',
  'Business Automation',
] as const;

const LocationProbe = () => {
  const location = useLocation();

  return <output data-testid="current-location">{location.pathname + location.hash}</output>;
};

const renderServices = () =>
  render(
    <MemoryRouter>
      <ServicesSection />
      <LocationProbe />
    </MemoryRouter>,
  );

describe('ServicesSection', () => {
  it('presents five professional service systems as accessible buttons', () => {
    renderServices();

    serviceNames.forEach((serviceName) => {
      const button = screen.getByRole('button', {
        name: `${serviceName}. Show key features`,
      });

      expect(button).toHaveAttribute('type', 'button');
      expect(button).toHaveAttribute('aria-expanded', 'false');
      expect(button).toHaveAttribute('aria-controls');
    });

    for (let systemNumber = 1; systemNumber <= 5; systemNumber += 1) {
      expect(screen.getByText(`System 0${systemNumber}`)).toBeInTheDocument();
    }
  });

  it('expands the first system to reveal its key features and service link', () => {
    renderServices();

    const serviceCard = screen.getByTestId('service-card-0');
    fireEvent.mouseEnter(serviceCard);
    fireEvent.mouseLeave(serviceCard);

    const serviceButton = screen.getByRole('button', {
      name: 'Micro-SaaS Launches. Show key features',
    });
    serviceButton.focus();

    expect(serviceButton).toHaveFocus();
    fireEvent.click(serviceButton);

    const expandedButton = screen.getByRole('button', {
      name: 'Micro-SaaS Launches. Open service page',
    });
    expect(expandedButton).toHaveAttribute('aria-expanded', 'true');
    expect(expandedButton).toHaveAttribute('aria-controls', 'service-details-0');
    expect(document.getElementById('service-details-0')).toBeInTheDocument();
    expect(screen.getByText('Key Features')).toBeInTheDocument();
    expect(screen.getByText('Generated SaaS foundations')).toBeInTheDocument();
    expect(screen.getByText('Stripe Checkout readiness')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Learn More About Micro-SaaS Launches' }),
    ).toHaveAttribute('href', '/services#micro-saas');

    fireEvent.click(expandedButton);
    expect(screen.getByTestId('current-location')).toHaveTextContent('/services#micro-saas');
  });
});
