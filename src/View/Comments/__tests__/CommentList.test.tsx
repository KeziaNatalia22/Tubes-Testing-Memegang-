/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import CommentList from '../CommentList';
import { fetchEndpoint } from '../../FetchEndpoint';

jest.mock('../../FetchEndpoint');

const mockedFetch = fetchEndpoint as jest.MockedFunction<typeof fetchEndpoint>;

describe('CommentList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (window as any).alert = jest.fn();
    (localStorage.getItem as jest.Mock).mockReturnValue('token-123');
    // Mock global fetch used by handleReplySend
    (global as any).fetch = jest.fn(() => Promise.resolve({ ok: true })) as any;
  });

  it('shows loading then empty state when no comments', async () => {
    mockedFetch.mockResolvedValueOnce([]); // GET /post/:postId/comments

    render(<CommentList postId="p1" />);

    // Loading spinner appears first
    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    // Then shows empty state text
    expect(await screen.findByText(/Belum ada komentar\./i)).toBeInTheDocument();

    expect(mockedFetch).toHaveBeenCalledWith('/post/p1/comments', 'GET', 'token-123');
  });

  it('renders a comment and toggles replies to show nested reply', async () => {
    const baseComment = {
      id: 'c1',
      user: { username: 'alice', avatar: null },
      content: 'Hello world',
      createdAt: new Date().toISOString(),
      replies: [
        {
          id: 'r1',
          user: { username: 'bob', avatar: null, profilePicture: '' },
          content: 'a reply',
          reply_to: 'c1',
          createdAt: new Date().toISOString(),
          replies: [],
        },
      ],
    };

    mockedFetch.mockResolvedValueOnce([baseComment]); // initial comments

    render(<CommentList postId="p1" />);

    // Wait for main comment
    expect(await screen.findByText('Hello world')).toBeInTheDocument();

    // Click the first "Replies" button next to this comment's content specifically
    const repliesBtn = screen.getAllByRole('button', { name: 'Replies' })[0];
    await userEvent.click(repliesBtn);

    // The nested reply should appear
    expect(await screen.findByText('a reply')).toBeInTheDocument();

    const hideBtn = screen.getAllByRole('button', { name: 'Hide Replies' })[0];
    await userEvent.click(hideBtn);
  });

  it('sends a reply via input and calls fetch under the hood', async () => {
    const baseComment = {
      id: 'c2',
      user: { username: 'carol', avatar: null },
      content: 'Question',
      createdAt: new Date().toISOString(),
      replies: [],
    };

  mockedFetch.mockResolvedValueOnce([baseComment]); // initial
  // After posting a reply, the component calls fetchComments() again
  mockedFetch.mockResolvedValueOnce([baseComment]);

    render(<CommentList postId="p1" />);

    // Wait for comment
    expect(await screen.findByText('Question')).toBeInTheDocument();

  // Click Reply under the correct comment
  const replyBtn = screen.getAllByRole('button', { name: 'Reply' })[0];
    await userEvent.click(replyBtn);

    // Type and send
    const textarea = screen.getByPlaceholderText(/Tulis balasan|Balas/i);
    await userEvent.type(textarea, 'This is my reply');
    await userEvent.click(screen.getByRole('button', { name: 'Kirim' }));

    // Ensure fetch to POST replies happened
    expect((global as any).fetch).toHaveBeenCalledWith(
      expect.stringMatching(/comments\/c2\/replies$/),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('deletes a comment from menu and updates list', async () => {
    const baseComment = {
      id: 'c3',
      user: { username: 'dave', avatar: null },
      content: 'Delete me',
      createdAt: new Date().toISOString(),
      replies: [],
    };

    mockedFetch
      .mockResolvedValueOnce([baseComment]) // initial
      .mockResolvedValueOnce({ success: true }); // DELETE

    render(<CommentList postId="p1" />);

    // Wait for comment
    expect(await screen.findByText('Delete me')).toBeInTheDocument();

  // Open the menu specific to this comment by scoping within its container
  const moreIcon = screen.getByTestId('MoreVertIcon');
  const kebabBtn = moreIcon.closest('button') as HTMLButtonElement;
  await userEvent.click(kebabBtn);

    const deleteItem = await screen.findByRole('menuitem', { name: /Delete/i });
    await userEvent.click(deleteItem);

    // Ensure DELETE endpoint was called
    await waitFor(() => {
      expect(mockedFetch).toHaveBeenLastCalledWith('/post/p1/comments/c3', 'DELETE', 'token-123');
    });
  });
});
