/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import ForgotPasswordModal from '../ForgotPasswordModal';
import { fetchEndpoint } from '../../FetchEndpoint';

jest.mock('../../FetchEndpoint');

// Stub FAIcon to reduce noise
jest.mock('../../Components/FAIcon', () => ({
  __esModule: true,
  default: ({ icon }: any) => <span data-testid="faicon">{icon}</span>,
}));

const closeMock = jest.fn();
const toLoginMock = jest.fn();
const toResetMock = jest.fn();

jest.mock('../../contexts/ModalContext', () => ({
  useModal: () => ({
    isForgotPasswordModalOpen: true,
    closeForgotPasswordModal: closeMock,
    switchToLogin: toLoginMock,
    switchToResetPassword: toResetMock,
  }),
}));

describe('ForgotPasswordModal', () => {
  const mockedFetch = fetchEndpoint as jest.MockedFunction<typeof fetchEndpoint>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('submits successfully and shows success message, then allows switching to reset', async () => {
    mockedFetch.mockResolvedValueOnce({ ok: true } as any);

    render(<ForgotPasswordModal />);

    await userEvent.type(screen.getByLabelText(/Email/i), 'user@example.com');
    await userEvent.click(screen.getByRole('button', { name: /Send Reset Link/i }));

    expect(await screen.findByText(/Password reset instructions have been sent/i)).toBeInTheDocument();

    // Switch to reset flow
    await userEvent.click(screen.getByRole('button', { name: /Enter Reset Code/i }));
    expect(toResetMock).toHaveBeenCalled();
  });

  it('shows error when request fails and can navigate to login', async () => {
    mockedFetch.mockRejectedValueOnce(new Error('No account'));

    render(<ForgotPasswordModal />);

    await userEvent.type(screen.getByLabelText(/Email/i), 'nope@example.com');
    await userEvent.click(screen.getByRole('button', { name: /Send Reset Link/i }));

    expect(await screen.findByText(/No account/i)).toBeInTheDocument();

    // Bottom login link
    await userEvent.click(screen.getByRole('button', { name: /Log in/i }));
    expect(toLoginMock).toHaveBeenCalled();
  });

  it('closes via the X icon', async () => {
    render(<ForgotPasswordModal />);
    const closeBtn = screen.getAllByRole('button')[0];
    await userEvent.click(closeBtn);
    expect(closeMock).toHaveBeenCalled();
  });
});
