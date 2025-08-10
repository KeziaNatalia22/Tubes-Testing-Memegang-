/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { AuthProvider, useAuth } from '../AuthContext';
import { fetchEndpoint } from '../../FetchEndpoint';

jest.mock('../../FetchEndpoint');

function AuthConsumer() {
  const a = useAuth();
  return (
    <div>
      <div data-testid="is-auth">{String(a.isAuthenticated)}</div>
      <div data-testid="token">{a.token ?? ''}</div>
      <div data-testid="username">{a.userData?.username ?? ''}</div>
      <div data-testid="loading">{String(a.isLoading)}</div>
      <button onClick={() => a.login('tkn123')}>doLogin</button>
      <button onClick={() => a.logout()}>doLogout</button>
      <button onClick={() => a.refreshUserData()}>doRefresh</button>
    </div>
  );
}

describe('AuthContext', () => {
  const mockedFetch = fetchEndpoint as jest.MockedFunction<typeof fetchEndpoint>;

  beforeEach(() => {
    jest.clearAllMocks();
  // Reset localStorage mocks
  (window.localStorage.getItem as jest.Mock).mockReset();
  (window.localStorage.setItem as jest.Mock).mockReset();
  (window.localStorage.removeItem as jest.Mock).mockReset();
  (window.localStorage.clear as jest.Mock).mockReset();
  });

  it('resolves loading false and remains unauthenticated when no token', async () => {
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('is-auth')).toHaveTextContent('false');
  });

  it('login stores token and fetches user, then logout clears it', async () => {
    mockedFetch.mockResolvedValueOnce({ username: 'alice', id: '1', email: 'a@a.com' } as any);

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

  // Perform login
  await userEvent.click(screen.getByRole('button', { name: 'doLogin' }));

    // Token persisted and user fetched
    await waitFor(() => expect(screen.getByTestId('token')).toHaveTextContent('tkn123'));
    await waitFor(() => expect(screen.getByTestId('username')).toHaveTextContent('alice'));
  expect((window.localStorage.setItem as jest.Mock)).toHaveBeenCalledWith('token', 'tkn123');

    // Refresh user
    mockedFetch.mockResolvedValueOnce({ username: 'bob', id: '1', email: 'b@b.com' } as any);
  await userEvent.click(screen.getByRole('button', { name: 'doRefresh' }));
    await waitFor(() => expect(screen.getByTestId('username')).toHaveTextContent('bob'));

    // Logout clears
  await userEvent.click(screen.getByRole('button', { name: 'doLogout' }));
    expect(screen.getByTestId('is-auth')).toHaveTextContent('false');
    expect(screen.getByTestId('token')).toHaveTextContent('');
    expect(screen.getByTestId('username')).toHaveTextContent('');
    expect((window.localStorage.removeItem as jest.Mock)).toHaveBeenCalledWith('token');
  });

  it('uses stored token on mount and fetches user data', async () => {
  (window.localStorage.getItem as jest.Mock).mockReturnValue('persist');
    mockedFetch.mockResolvedValueOnce({ username: 'persisted', id: '9', email: 'p@p.com' } as any);

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

  // Loading resolves and user present
  await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('is-auth')).toHaveTextContent('true');
    expect(screen.getByTestId('token')).toHaveTextContent('persist');
    expect(screen.getByTestId('username')).toHaveTextContent('persisted');
  });
});
