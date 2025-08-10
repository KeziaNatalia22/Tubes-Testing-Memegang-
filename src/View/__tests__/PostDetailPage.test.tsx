/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import PostDetailPage from '../PostDetailPage';
import { fetchEndpoint } from '../FetchEndpoint';

jest.mock('../FetchEndpoint');

// Mock useParams to provide a postId
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ postId: 'p-1' }),
}));

// Stub subcomponents with minimal renders
jest.mock('../Components/PostCard', () => ({
  __esModule: true,
  default: ({ title }: any) => <div data-testid="post-card">{title}</div>,
}));

jest.mock('../Components/FetchComments', () => ({
  __esModule: true,
  default: ({ postId }: any) => <div data-testid="fetch-comments">for {postId}</div>,
}));

describe('PostDetailPage', () => {
  const mockedFetch = fetchEndpoint as jest.MockedFunction<typeof fetchEndpoint>;

  beforeEach(() => {
    jest.clearAllMocks();
    // token for comment submit
    try {
      (localStorage.getItem as unknown as jest.Mock).mockReturnValue('token-123');
    } catch {
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: jest.fn().mockReturnValue('token-123'),
          setItem: jest.fn(),
          removeItem: jest.fn(),
          clear: jest.fn(),
        },
        configurable: true,
        writable: true,
      });
    }
  });

  it('shows loading then not found on fetch error', async () => {
    mockedFetch.mockRejectedValueOnce(new Error('boom'));

    render(<PostDetailPage />);

    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
    expect(await screen.findByText(/Post not found/i)).toBeInTheDocument();
  });

  it('renders post card and comments', async () => {
    mockedFetch.mockResolvedValueOnce({
      id: 'p-1',
      title: 'Post Title',
      name: 'john',
      image_url: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      upvotes: 1,
      downvotes: 0,
      commentsCount: 0,
      isSaved: false,
      tags: [],
    } as any);

    render(<PostDetailPage />);

    // Displays PostCard title
    expect(await screen.findByTestId('post-card')).toHaveTextContent('Post Title');
    expect(screen.getByTestId('fetch-comments')).toHaveTextContent('for p-1');
  });

  it('allows comment submit', async () => {
    mockedFetch
      .mockResolvedValueOnce({
        id: 'p-1',
        title: 'Post Title',
        name: 'john',
        image_url: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        upvotes: 1,
        downvotes: 0,
        commentsCount: 0,
        isSaved: false,
        tags: [],
      } as any)
      .mockResolvedValueOnce({ success: true } as any);

    render(<PostDetailPage />);

    // Type and submit a comment
    const input = await screen.findByPlaceholderText(/Leave a comment/i);
    await userEvent.type(input, 'Nice post');
    const btn = screen.getByRole('button', { name: /Post/i });
    await userEvent.click(btn);

    // Ensure POST called (may not be the last due to refresh fetch)
    await waitFor(() => {
      expect(mockedFetch).toHaveBeenCalledWith(
        '/post/p-1/comments',
        'POST',
        'token-123',
        expect.objectContaining({ content: 'Nice post' })
      );
    });
  });
});
