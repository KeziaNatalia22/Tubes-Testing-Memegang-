/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import Home from '../Home';
import { fetchEndpoint } from '../FetchEndpoint';

jest.mock('../FetchEndpoint');

// Mock PostCard to a simple clickable component that exposes key behaviors
jest.mock('../Components/PostCard', () => {
  return function MockPostCard(props: any) {
    const { postId, title, isSaved, onSaveClick, onEdit, onDelete, onCommentClick } = props;
    return (
      <div data-testid={`post-${postId}`}>
        <span data-testid={`title-${postId}`}>{title}</span>
        <span data-testid={`saved-${postId}`}>{String(!!isSaved)}</span>
        <button onClick={onSaveClick} aria-label={`save-${postId}`}>Save</button>
        <button onClick={() => onEdit({ id: postId, title: title + ' (edited)' })} aria-label={`edit-${postId}`}>Edit</button>
        <button onClick={() => onDelete(postId)} aria-label={`delete-${postId}`}>Delete</button>
        <button onClick={onCommentClick} aria-label={`comment-${postId}`}>Comment</button>
      </div>
    );
  };
});

// Mock Auth and Modal contexts
let mockAuthState = {
  isAuthenticated: false,
  token: null as string | null,
  isLoading: false,
  userData: { id: 'user-1', name: 'User' },
};

let openLoginModal = jest.fn();

jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockAuthState,
}));

jest.mock('../contexts/ModalContext', () => ({
  useModal: () => ({ openLoginModal }),
}));

// Mock react-router-dom's useNavigate
const navigateMock = jest.fn();
jest.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as object),
  useNavigate: () => navigateMock,
}));

const mockedFetch = fetchEndpoint as jest.MockedFunction<typeof fetchEndpoint>;

const samplePosts = [
  {
    id: '1',
    title: 'First Post',
    image_url: '/img1.jpg',
    user_id: 'u1',
    name: 'Alice',
    createdAt: '2025-08-01',
    commentsCount: 2,
    upvotes: 10,
    downvotes: 1,
    tags: ['funny'],
  },
  {
    id: '2',
    title: 'Second Post',
    image_url: '/img2.jpg',
    user_id: 'u2',
    name: 'Bob',
    createdAt: '2025-08-02',
    commentsCount: 0,
    upvotes: 5,
    downvotes: 0,
    tags: ['meme'],
  },
];

describe('Home', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // default unauthenticated, not loading
    mockAuthState = { isAuthenticated: false, token: null, isLoading: false, userData: { id: 'user-1', name: 'User' } };
    openLoginModal = jest.fn();
  });


  it('loads and renders posts', async () => {
    mockedFetch.mockResolvedValueOnce(samplePosts);

    render(<Home />);

    // Wait for posts to render
    await waitFor(() => expect(screen.getByTestId('post-1')).toBeInTheDocument());
    expect(screen.getByTestId('title-1')).toHaveTextContent('First Post');
    expect(screen.getByTestId('title-2')).toHaveTextContent('Second Post');

    // Should not fetch saved posts when not authenticated
    expect(mockedFetch).toHaveBeenCalledWith('/post?type=fresh', 'GET', undefined);
    expect(mockedFetch).toHaveBeenCalledTimes(1);
  });

  it('shows "No memes found" when API returns empty list', async () => {
    mockedFetch.mockResolvedValueOnce([]);
    render(<Home />);

    await waitFor(() => expect(screen.getByText('No memes found')).toBeInTheDocument());
    expect(screen.getByText('Be the first to share a meme!')).toBeInTheDocument();
  });

  it('renders search not found UI when searchResults is empty and query provided', async () => {
    render(<Home searchResults={[]} searchQuery="cats" />);
    expect(await screen.findByText('No memes found for "cats"')).toBeInTheDocument();
  });

  it('renders search results when provided (success)', async () => {
    const searchResults = [
      {
        id: '10',
        title: 'Searched Post',
        image_url: '/img10.jpg',
        user_id: 'u10',
        name: 'Fallback Name',
        createdAt: '2025-08-03',
        commentsCount: 3,
        upvotes: 7,
        downvotes: 0,
        tags: ['search'],
        user: { id: 'u10', name: 'User From Result', profilePicture: '/avatar.png' },
      },
    ];

    render(<Home searchResults={searchResults} searchQuery="searched" />);

    // Should render the searched post without calling the API
    await waitFor(() => expect(screen.getByTestId('post-10')).toBeInTheDocument());
    expect(screen.getByTestId('title-10')).toHaveTextContent('Searched Post');
    expect(mockedFetch).not.toHaveBeenCalled();

    // Should not show the search-not-found UI
    expect(screen.queryByText(/No memes found for/)).not.toBeInTheDocument();
  });


  it('edits and deletes a post via callbacks', async () => {
    mockedFetch.mockResolvedValueOnce(samplePosts);
    render(<Home />);

    await waitFor(() => expect(screen.getByTestId('post-1')).toBeInTheDocument());

    // Edit
    await userEvent.click(screen.getByRole('button', { name: 'edit-1' }));
    expect(await screen.findByTestId('title-1')).toHaveTextContent('First Post (edited)');

    // Delete removes post 2
    await userEvent.click(screen.getByRole('button', { name: 'delete-2' }));
    await waitFor(() => expect(screen.queryByTestId('post-2')).not.toBeInTheDocument());
  });

  it('navigates to post detail when comment clicked', async () => {
    mockedFetch.mockResolvedValueOnce(samplePosts);
    render(<Home />);

    await waitFor(() => expect(screen.getByTestId('post-1')).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: 'comment-1' }));
    expect(navigateMock).toHaveBeenCalledWith('/post/1');
  });

  it('shows error when fetch fails', async () => {
    mockedFetch.mockRejectedValueOnce(new Error('network'));
    render(<Home />);

    expect(await screen.findByText('Failed to load posts. Please try again later.')).toBeInTheDocument();
  });
});
