import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { App } from './App'

describe('App shell', () => {
  it('renders the dashboard and primary navigation without crashing', async () => {
    render(<App />)

    expect(await screen.findByRole('heading', { name: /ready to study/i })).toBeInTheDocument()

    // Two <nav aria-label="Primary"> elements exist (mobile bottom dock +
    // desktop top row, toggled by CSS media query, not by React) — assert
    // against the first one, which is enough to prove the shell rendered.
    const navs = screen.getAllByRole('navigation', { name: /primary/i })
    expect(navs.length).toBeGreaterThan(0)
    for (const label of ['Vocabulary', 'Dashboard', 'Grammar']) {
      expect(within(navs[0]).getByText(label)).toBeInTheDocument()
    }
  })
})
