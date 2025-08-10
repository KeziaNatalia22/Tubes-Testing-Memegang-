/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import LoginModal from '../LoginModal';
import { fetchEndpoint } from '../../FetchEndpoint';

jest.mock('../../FetchEndpoint');

// Mock contexts used by LoginModal
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ login: jest.fn() }),
}));

const modalState = { open: true } as any;
jest.mock('../../contexts/ModalContext', () => ({
  useModal: () => ({
    isLoginModalOpen: modalState.open,
    closeLoginModal: jest.fn(() => { modalState.open = false; }),
    switchToRegister: jest.fn(),
    openForgotPasswordModal: jest.fn(),
  }),
}));

// Stub FAIcon to reduce noise
jest.mock('../../Components/FAIcon', () => ({
  __esModule: true,
  default: ({ icon }: any) => <span data-testid="faicon">{icon}</span>,
}));

describe('LoginModal', () => {
  const mockedFetch = fetchEndpoint as jest.MockedFunction<typeof fetchEndpoint>;

  beforeEach(() => {
    jest.clearAllMocks();
    modalState.open = true;
  });

  it('shows and hides via close, and shows error on failed login', async () => {
    mockedFetch.mockRejectedValueOnce(new Error('Invalid login credentials'));

    render(<LoginModal />);

  // Fill form
  await userEvent.type(screen.getByLabelText(/Email/i), 'user@example.com');
  const passwordInput = screen.getAllByLabelText(/Password/i).find(el => el.tagName.toLowerCase() === 'input') as HTMLInputElement;
  await userEvent.type(passwordInput, 'secret');

    // Submit
    await userEvent.click(screen.getByRole('button', { name: /Log in/i }));

    // Error appears
    expect(await screen.findByText(/Invalid login credentials/i)).toBeInTheDocument();

    // Close dialog
    const closeButtons = screen.getAllByRole('button');
    await userEvent.click(closeButtons[0]);
  });

  it('logs in successfully and closes modal', async () => {
    mockedFetch.mockResolvedValueOnce({ token: 'abc123' } as any);

    render(<LoginModal />);

  await userEvent.type(screen.getByLabelText(/Email/i), 'user@example.com');
  const passwordInput = screen.getAllByLabelText(/Password/i).find(el => el.tagName.toLowerCase() === 'input') as HTMLInputElement;
  await userEvent.type(passwordInput, 'secret');
    await userEvent.click(screen.getByRole('button', { name: /Log in/i }));

    await waitFor(() => {
      // Close handler was called (state toggled)
      expect(modalState.open).toBe(false);
    });
  });
});
