/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import RegisterModal from '../RegisterModal';
import { fetchEndpoint } from '../../FetchEndpoint';

jest.mock('../../FetchEndpoint');

// Stub FAIcon to reduce noise
jest.mock('../../Components/FAIcon', () => ({
  __esModule: true,
  default: ({ icon }: any) => <span data-testid="faicon">{icon}</span>,
}));

const closeMock = jest.fn();
const toLoginMock = jest.fn();

jest.mock('../../contexts/ModalContext', () => ({
  useModal: () => ({
    isRegisterModalOpen: true,
    closeRegisterModal: closeMock,
    switchToLogin: toLoginMock,
  }),
}));

describe('RegisterModal', () => {
  const mockedFetch = fetchEndpoint as jest.MockedFunction<typeof fetchEndpoint>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('validates fields and prevents submission on invalid input', async () => {
    render(<RegisterModal />);

  await userEvent.click(screen.getByRole('button', { name: /Register/i }));

  // Fill with invalid/short values
  const username = screen.getByLabelText(/Username/i);
  const email = screen.getByLabelText(/Email/i, { selector: 'input' });
  const pwd = screen.getByLabelText(/^Password/i, { selector: 'input' });
  const confirm = screen.getByLabelText(/Confirm Password/i, { selector: 'input' });
  await userEvent.type(username, 'ab');
  // Use a valid email so native validation doesn't block form submit
  await userEvent.type(email, 'user@example.com');
  await userEvent.type(pwd, 'short');
  await userEvent.type(confirm, 'mismatch');
  // Trigger helper text rendering
  await userEvent.tab();

    await userEvent.click(screen.getByRole('button', { name: /Register/i }));

  expect(await screen.findByText((t) => /Username must be at least 3 characters/i.test(t))).toBeInTheDocument();
  expect(await screen.findByText((t) => /Password must be at least 8 characters/i.test(t))).toBeInTheDocument();
  expect(await screen.findByText((t) => /Passwords do not match/i.test(t))).toBeInTheDocument();
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it('submits successfully and closes then switches to login', async () => {
    mockedFetch.mockResolvedValueOnce({ ok: true } as any);

    render(<RegisterModal />);

    await userEvent.type(screen.getByLabelText(/Username/i), 'alice');
  await userEvent.type(screen.getByLabelText(/Email/i, { selector: 'input' }), 'alice@example.com');
  await userEvent.type(screen.getByLabelText(/^Password/i, { selector: 'input' }), 'password123');
  await userEvent.type(screen.getByLabelText(/Confirm Password/i, { selector: 'input' }), 'password123');

  await userEvent.click(screen.getByRole('button', { name: /Register/i }));

    expect(await screen.findByText(/Registration successful/i)).toBeInTheDocument();

    await waitFor(() => expect(closeMock).toHaveBeenCalled(), { timeout: 2000 });
    expect(toLoginMock).toHaveBeenCalled();
  });

  it('shows API error on failure', async () => {
    mockedFetch.mockRejectedValueOnce(new Error('email taken'));

    render(<RegisterModal />);

    await userEvent.type(screen.getByLabelText(/Username/i), 'alice');
  await userEvent.type(screen.getByLabelText(/Email/i, { selector: 'input' }), 'alice@example.com');
  await userEvent.type(screen.getByLabelText(/^Password/i, { selector: 'input' }), 'password123');
  await userEvent.type(screen.getByLabelText(/Confirm Password/i, { selector: 'input' }), 'password123');

  await userEvent.click(screen.getByRole('button', { name: /Register/i }));

    expect(await screen.findByText(/Registration failed: email taken/i)).toBeInTheDocument();
  });
});
