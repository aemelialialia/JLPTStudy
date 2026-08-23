import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { App } from './App'

describe('App shell', () => {
  it('renders the dashboard and primary navigation without crashing', async () => {
    render(<App />)

    expect(await screen.findByRole('heading', { name: /JLPT Study — Dashboard/i })).toBeInTheDocument()

    const nav = screen.getByRole('navigation', { name: /primary/i })
    for (const label of ['Dashboard', 'N5', 'N4', 'N3', 'N2', 'Mistake Book', 'Settings']) {
      expect(within(nav).getByText(label)).toBeInTheDocument()
    }
  })
})
