import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react'
import { App } from '../App'
import { settingsRepository } from '../data/repositories/settingsRepository'

/**
 * End-to-end exercise of the first-visit name prompt: a brand-new user
 * (no `userName` in settings yet) is asked their name before anything
 * else, the name is persisted, it's reflected in the nav drawer, and the
 * prompt never reappears on a later visit. Every other test in the suite
 * seeds a `userName` in src/test/setup.ts so it can test steady-state
 * behavior without this overlay in the way — this file is the one place
 * that deliberately starts without one to test the gate itself.
 */
describe('first-visit name prompt', () => {
  it('asks a brand-new user for their name, saves it, shows it in the nav drawer, and never asks again', async () => {
    await settingsRepository.update({ userName: null })

    const first = render(<App />)

    const dialog = await screen.findByRole('dialog', { name: /what should we call you/i })
    expect(within(dialog).getByRole('button', { name: /continue/i })).toBeDisabled()

    fireEvent.change(within(dialog).getByPlaceholderText(/your name/i), { target: { value: 'Selena' } })
    fireEvent.click(within(dialog).getByRole('button', { name: /continue/i }))

    // The prompt is gone and the rest of the app (already mounted
    // underneath it) is fully interactive.
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await screen.findByRole('heading', { name: /ready to study/i })

    fireEvent.click(screen.getByRole('button', { name: /open menu/i }))
    expect(await screen.findByRole('heading', { name: 'Selena' })).toBeInTheDocument()

    first.unmount() // simulate closing the tab / locking the phone / navigating away

    // Simulate reopening the app fresh (a real reload — IndexedDB
    // survives, React state does not) — the name was already given, so
    // the prompt must not show again.
    render(<App />)
    await screen.findByRole('heading', { name: /ready to study/i })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
