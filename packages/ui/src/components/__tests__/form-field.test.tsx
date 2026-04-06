import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormField } from '../form-field';

describe('FormField', () => {
  it('renders label and children', () => {
    render(
      <FormField label="Email">
        <input type="email" placeholder="Enter email" />
      </FormField>,
    );
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter email')).toBeInTheDocument();
  });

  it('renders description text', () => {
    render(
      <FormField label="Name" description="Enter your full name">
        <input />
      </FormField>,
    );
    expect(screen.getByText('Enter your full name')).toBeInTheDocument();
  });

  it('shows error message and hides description when error prop is set', () => {
    render(
      <FormField label="Name" description="Enter your full name" error="Name is required">
        <input />
      </FormField>,
    );
    expect(screen.getByText('Name is required')).toBeInTheDocument();
    expect(screen.queryByText('Enter your full name')).not.toBeInTheDocument();
  });

  it('shows required indicator (asterisk) when required is true', () => {
    render(
      <FormField label="Name" required>
        <input />
      </FormField>,
    );
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('does not show asterisk when required is false or omitted', () => {
    render(
      <FormField label="Name">
        <input />
      </FormField>,
    );
    expect(screen.queryByText('*')).not.toBeInTheDocument();
  });

  it('associates label with input via htmlFor', () => {
    render(
      <FormField label="Username" htmlFor="username-input">
        <input id="username-input" />
      </FormField>,
    );
    const label = screen.getByText('Username');
    expect(label).toHaveAttribute('for', 'username-input');
  });
});
