/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AdminPage from '../AdminPage';
import { fetchEndpoint } from '../FetchEndpoint';
import userEvent from '@testing-library/user-event';

jest.mock('../FetchEndpoint');

// Mock FAIcon to avoid font-awesome specifics
jest.mock('../Components/FAIcon', () => {
  return function MockFAIcon({ icon, style }: { icon: string; style?: React.CSSProperties }) {
    return <span data-testid="fa-icon" data-icon={icon} style={style}>{icon}</span>;
  };
});

// Mock PostCard to a tiny component we can assert on
jest.mock('../Components/PostCard', () => {
  return function MockPostCard(props: any) {
    const { postId, title } = props;
    return (
      <div data-testid={`postcard-${postId}`}>
        <span>{title}</span>
      </div>
    );
  };
});

// Mock useAuth to provide a token
jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ token: 'test-token' }),
}));

// Mock useNavigate so component can render without a Router
const navigateMock = jest.fn();
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

const mockedFetch = fetchEndpoint as jest.MockedFunction<typeof fetchEndpoint>;

describe('AdminPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    navigateMock.mockClear();
    // Ensure alert exists and is spy-able
    (window as any).alert = jest.fn();
  });

  it('shows loading then All Clear when no reports', async () => {
    mockedFetch.mockResolvedValueOnce([]);

    render(<AdminPage />);

    // Loading state
    expect(screen.getByText(/Loading reported posts.../i)).toBeInTheDocument();

    // After fetch resolves, shows the empty state
    expect(await screen.findByText('All Clear!')).toBeInTheDocument();
    expect(screen.getByText('No reported posts found. The community is behaving well.')).toBeInTheDocument();

    // Ensure it called the reports API with token
    expect(mockedFetch).toHaveBeenCalledWith('/admin/reports', 'GET', 'test-token');
  });

  it('renders a reported post card when data exists', async () => {
    const report = {
      id: 'r1',
      post_id: 'p1',
      user_id: 'uReporter',
      reason: 'spam',
      comment: 'Looks suspicious',
      status: 'pending',
      created_at: new Date().toISOString(),
      post: {
        id: 'p1',
        title: 'Reported Post Title',
        image_url: '/img.jpg',
        user_id: 'u1',
        name: 'Poster',
        profilePicture: '',
        createdAt: new Date().toISOString(),
        commentsCount: 0,
        upvotes: 0,
        downvotes: 0,
        tags: [],
      },
      reporter: {
        id: 'uReporter',
        name: 'Alice',
        email: 'alice@example.com',
      },
    };

    mockedFetch.mockResolvedValueOnce([report]);

    render(<AdminPage />);

    // Wait for the mocked PostCard to appear
    expect(await screen.findByTestId('postcard-p1')).toBeInTheDocument();

    // Basic UI bits
    expect(screen.getByText(/Admin Panel/i)).toBeInTheDocument();
    expect(screen.getByText(/Reported by: Alice/i)).toBeInTheDocument();
    expect(screen.getByText(/Reported Post Title/i)).toBeInTheDocument();

    // Action buttons exist
    expect(screen.getByRole('button', { name: /Approve Report \(Remove Post\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reject Report \(Keep Post\)/i })).toBeInTheDocument();
  });

  it('approves a report and removes it from the list', async () => {
    const report = {
      id: 'r1',
      post_id: 'p1',
      user_id: 'uReporter',
      reason: 'spam',
      comment: 'Looks suspicious',
      status: 'pending',
      created_at: new Date().toISOString(),
      post: {
        id: 'p1',
        title: 'Reported Post Title',
        image_url: '/img.jpg',
        user_id: 'u1',
        name: 'Poster',
        profilePicture: '',
        createdAt: new Date().toISOString(),
        commentsCount: 0,
        upvotes: 0,
        downvotes: 0,
        tags: [],
      },
      reporter: { id: 'uReporter', name: 'Alice', email: 'alice@example.com' },
    };

    mockedFetch
      .mockResolvedValueOnce([report]) // initial GET /admin/reports
      .mockResolvedValueOnce({ success: true }); // PUT approve

    render(<AdminPage />);

    // Wait for report to render
    expect(await screen.findByTestId('postcard-p1')).toBeInTheDocument();

    // Click Approve
    const approveBtn = screen.getByRole('button', { name: /Approve Report \(Remove Post\)/i });
    await userEvent.click(approveBtn);

    // Ensure API called with approve action
    expect(mockedFetch).toHaveBeenLastCalledWith('/admin/reports/r1', 'PUT', 'test-token', { action: 'approve' });

    // Alert shown and item removed
    await waitFor(() => expect(screen.queryByTestId('postcard-p1')).not.toBeInTheDocument());
    expect(window.alert).toHaveBeenCalledWith(expect.stringMatching(/approved/i));
  });

  it('rejects a report and removes it from the list', async () => {
    const report = {
      id: 'r2',
      post_id: 'p2',
      user_id: 'uReporter',
      reason: 'abusive_language',
      comment: '',
      status: 'pending',
      created_at: new Date().toISOString(),
      post: {
        id: 'p2',
        title: 'Another Reported Post',
        image_url: '/img2.jpg',
        user_id: 'u2',
        name: 'Poster2',
        profilePicture: '',
        createdAt: new Date().toISOString(),
        commentsCount: 0,
        upvotes: 0,
        downvotes: 0,
        tags: [],
      },
      reporter: { id: 'uReporter', name: 'Bob', email: 'bob@example.com' },
    };

    mockedFetch
      .mockResolvedValueOnce([report]) // initial GET /admin/reports
      .mockResolvedValueOnce({ success: true }); // PUT reject

    render(<AdminPage />);

    // Wait for report to render
    expect(await screen.findByTestId('postcard-p2')).toBeInTheDocument();

    // Click Reject
    const rejectBtn = screen.getByRole('button', { name: /Reject Report \(Keep Post\)/i });
    await userEvent.click(rejectBtn);

    // Ensure API called with reject action
    expect(mockedFetch).toHaveBeenLastCalledWith('/admin/reports/r2', 'PUT', 'test-token', { action: 'reject' });

    // Alert shown and item removed
    await waitFor(() => expect(screen.queryByTestId('postcard-p2')).not.toBeInTheDocument());
    expect(window.alert).toHaveBeenCalledWith(expect.stringMatching(/rejected/i));
  });
});
