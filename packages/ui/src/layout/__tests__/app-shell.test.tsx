import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppShell } from '../app-shell';

describe('AppShell', () => {
  it('renders sidebar, topbar, and main content area', () => {
    render(
      <AppShell
        sidebar={<nav data-testid="sidebar">Sidebar</nav>}
        topbar={<header data-testid="topbar">Topbar</header>}
      >
        <div data-testid="content">Page Content</div>
      </AppShell>,
    );
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('topbar')).toBeInTheDocument();
    expect(screen.getByTestId('content')).toBeInTheDocument();
  });

  it('renders children in the main area', () => {
    render(
      <AppShell
        sidebar={<nav>Sidebar</nav>}
        topbar={<header>Topbar</header>}
      >
        <h1>Dashboard Content</h1>
        <p>Welcome back</p>
      </AppShell>,
    );
    expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
    expect(screen.getByText('Welcome back')).toBeInTheDocument();
  });

  it('wraps content in a main element', () => {
    render(
      <AppShell
        sidebar={<nav>Sidebar</nav>}
        topbar={<header>Topbar</header>}
      >
        <div>Content</div>
      </AppShell>,
    );
    const main = screen.getByRole('main');
    expect(main).toBeInTheDocument();
    expect(main).toHaveTextContent('Content');
  });

  it('applies custom className to the main area', () => {
    render(
      <AppShell
        sidebar={<nav>Sidebar</nav>}
        topbar={<header>Topbar</header>}
        className="custom-class"
      >
        <div>Content</div>
      </AppShell>,
    );
    const main = screen.getByRole('main');
    expect(main.className).toContain('custom-class');
  });
});
