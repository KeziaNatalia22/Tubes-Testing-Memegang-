/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import ResetPasswordModal from '../ResetPasswordModal';
import { fetchEndpoint } from '../../FetchEndpoint';

jest.mock('../../FetchEndpoint');

// Stub FAIcon to reduce noise
jest.mock('../../Components/FAIcon', () => ({
  __esModule: true,
  default: ({ icon }: any) => <span data-testid="faicon">{icon}</span>,
}));

const closeMock = jest.fn();
const toLoginMock = jest.fn();
const toForgotMock = jest.fn();

jest.mock('../../contexts/ModalContext', () => ({
  useModal: () => ({
    isResetPasswordModalOpen: true,
    closeResetPasswordModal: closeMock,
    switchToLogin: toLoginMock,
    switchToForgotPassword: toForgotMock,
  }),
}));

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ login: jest.fn() }),
}));

describe('ResetPasswordModal', () => {
  const mockedFetch = fetchEndpoint as jest.MockedFunction<typeof fetchEndpoint>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows error when passwords don't match", async () => {
    render(<ResetPasswordModal />);

  await userEvent.type(screen.getByLabelText(/Email/i, { selector: 'input' }), 'user@example.com');
  await userEvent.type(screen.getByLabelText(/Reset Code/i, { selector: 'input' }), 'CODE123');
  const newPwdInput = screen.getByLabelText((content) => /New Password/i.test(content) && !/Confirm/i.test(content), { selector: 'input' });
  const confirmPwdInput = screen.getByLabelText((content) => /Confirm New Password/i.test(content), { selector: 'input' });
  await userEvent.type(newPwdInput, 'secret');
  await userEvent.type(confirmPwdInput, 'different');

    await userEvent.click(screen.getByRole('button', { name: /Reset Password/i }));
    expect(await screen.findByText(/Passwords don't match/i)).toBeInTheDocument();
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it('submits successfully and shows success view, then go to login', async () => {
    mockedFetch.mockResolvedValueOnce({ ok: true } as any);

    render(<ResetPasswordModal />);

  await userEvent.type(screen.getByLabelText(/Email/i, { selector: 'input' }), 'user@example.com');
  await userEvent.type(screen.getByLabelText(/Reset Code/i, { selector: 'input' }), 'CODE123');
  const newPwdInput2 = screen.getByLabelText((content) => /New Password/i.test(content) && !/Confirm/i.test(content), { selector: 'input' });
  const confirmPwdInput2 = screen.getByLabelText((content) => /Confirm New Password/i.test(content), { selector: 'input' });
  await userEvent.type(newPwdInput2, 'secret123');
  await userEvent.type(confirmPwdInput2, 'secret123');

    await userEvent.click(screen.getByRole('button', { name: /Reset Password/i }));

  const successEls = await screen.findAllByText(/Your password has been reset successfully/i);
  expect(successEls.length).toBeGreaterThan(0);

    await userEvent.click(screen.getByRole('button', { name: /Go to Login/i }));
    expect(toLoginMock).toHaveBeenCalled();
  });

  it('handles API error path and can request again', async () => {
    mockedFetch.mockRejectedValueOnce(new Error('invalid code'));

    render(<ResetPasswordModal />);

  await userEvent.type(screen.getByLabelText(/Email/i, { selector: 'input' }), 'user@example.com');
  await userEvent.type(screen.getByLabelText(/Reset Code/i, { selector: 'input' }), 'CODE123');
  const newPwdInput3 = screen.getByLabelText((content) => /New Password/i.test(content) && !/Confirm/i.test(content), { selector: 'input' });
  const confirmPwdInput3 = screen.getByLabelText((content) => /Confirm New Password/i.test(content), { selector: 'input' });
  await userEvent.type(newPwdInput3, 'secret123');
  await userEvent.type(confirmPwdInput3, 'secret123');

    await userEvent.click(screen.getByRole('button', { name: /Reset Password/i }));

    expect(await screen.findByText(/invalid code/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Request again/i }));
    expect(toForgotMock).toHaveBeenCalled();
  });
});
