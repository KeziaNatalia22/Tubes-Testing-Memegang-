
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import AdminRoute  from '../AdminRoute';
import { MemoryRouter } from 'react-router-dom';



const navigateMock = jest.fn();
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,

    Navigate: ({ to }: { to: string }) => {
      navigateMock(to);
      return null;
    },
  };
});


let mockAuthState = {
  isAuthenticated: false,
  token: null as string | null,
  isLoading: false,
  userData: { id: 'user-1', name: 'User', role:'admin' },
};


jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockAuthState,
}));

describe('AdminRoute', () => {
    const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
    navigateMock.mockClear();
  });

  it('renders children when user is authenticated and is admin', () => {
    mockAuthState.isAuthenticated = true;
    mockAuthState.userData.role = 'admin';

    render(
        <MemoryRouter>
            <AdminRoute>
                <div>Admin Content</div>
            </AdminRoute>
        </MemoryRouter>
    )

    expect(screen.getByText('Admin Content')).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('redirects to login when user is not authenticated', async () => {
    mockAuthState.isAuthenticated = false;

    render(
        <MemoryRouter>
            <AdminRoute>
                <div>Admin Content</div>
            </AdminRoute>
        </MemoryRouter>
    );

    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
    const btn = await screen.findByRole('button', { name: /Home/i });
    await user.click(btn);
    expect(navigateMock).toHaveBeenCalledWith('/');
  });

  it('redirects to home when user is authenticated but not an admin', async () => {
    mockAuthState.isAuthenticated = true;
    mockAuthState.userData.role = 'user';
    
    render(
        <MemoryRouter>
            <AdminRoute>
                <div>Admin Content</div>
            </AdminRoute>
        </MemoryRouter>
    );

    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
    const btn = await screen.findByRole('button', { name: /Home/i });
    await user.click(btn);
    expect(navigateMock).toHaveBeenCalledWith('/');
    });
});