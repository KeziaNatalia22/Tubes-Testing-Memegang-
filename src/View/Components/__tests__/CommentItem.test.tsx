/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import CommentItem from '../CommentItem';
import { fetchEndpoint } from '../../FetchEndpoint';

jest.mock('../../FetchEndpoint');
const mockedFetch = fetchEndpoint as jest.MockedFunction<typeof fetchEndpoint>;

// Minimal react-router-dom Link mock to avoid Router
jest.mock('react-router-dom', () => ({
  Link: ({ to, children }: any) => <a href={to}>{children}</a>,
}));

describe('CommentItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (window as any).alert = jest.fn();
    (localStorage.getItem as jest.Mock | any) = jest.fn(() => 'token-123');
  });

  const baseComment = {
    id: 'c1',
    user: { username: 'alice', avatar: null, profilePicture: null },
    content: 'Hello @bob from thread',
    createdAt: new Date().toISOString(),
    replies: [] as any[],
  };

  it('renders content with mention link and Replies toggle fetches replies', async () => {
    // First GET for replies
    mockedFetch.mockResolvedValueOnce([
      {
        id: 'r1',
        user: { username: 'bob', profilePicture: '' },
        content: 'a reply content',
        reply_to: 'c1',
        createdAt: new Date().toISOString(),
        replies: [],
      },
    ] as any);

    render(<CommentItem comment={baseComment as any} />);

    // Mention becomes a link
    const mention = screen.getByText('@bob');
    expect(mention).toHaveAttribute('href', '/profile/bob');

    // Click Replies to load
    const repliesBtn = screen.getByRole('button', { name: /Replies/i });
    await userEvent.click(repliesBtn);

    expect(await screen.findByText('a reply content')).toBeInTheDocument();

    // Hide replies
    await userEvent.click(screen.getByRole('button', { name: /Hide Replies/i }));
  });

  it('sends a reply via Reply input', async () => {
    // First: opening Replies triggers a GET; return empty list
    mockedFetch.mockResolvedValueOnce([] as any);
    // Then: POST new reply
    mockedFetch.mockResolvedValueOnce({
      id: 'r2',
      user: { username: 'alice', profilePicture: '' },
      content: '@alice Thanks!',
      reply_to: 'c1',
      createdAt: new Date().toISOString(),
      post_id: 'p1',
    } as any);

    render(<CommentItem comment={baseComment as any} />);

    // Expand replies first so the newly added reply becomes visible
    await userEvent.click(screen.getByRole('button', { name: /Replies/i }));

    // Open reply input
    await userEvent.click(screen.getByRole('button', { name: /Reply/i }));

    // Type and send
    const input = screen.getByPlaceholderText(/Reply ke alice|Reply ke user|Reply ke/i);
    await userEvent.type(input, 'Thanks!');
    await userEvent.click(screen.getByRole('button', { name: /Kirim/i }));

    // New reply content appears (match the trailing text part)
    expect(await screen.findByText(/Thanks!/i)).toBeInTheDocument();
  });

  it('opens menu and deletes the comment', async () => {
    mockedFetch.mockResolvedValueOnce({ success: true } as any); // DELETE

    render(<CommentItem comment={baseComment as any} />);

    // Open kebab menu
    const allButtons = screen.getAllByRole('button');
    const menuBtn = allButtons[0]; // first iconbutton rendered
    await userEvent.click(menuBtn);

    // Click Delete
    await userEvent.click(await screen.findByRole('menuitem', { name: /Delete/i }));

    // Ensure delete called
    expect(mockedFetch).toHaveBeenCalledWith('/comments/c1', 'DELETE', 'token-123');

    // Component fades out and unmounts
    await waitFor(() => {
      expect(screen.queryByText(/Hello @bob from thread/)).not.toBeInTheDocument();
    });
  });

  it('edits a comment and shows (edited) timestamp', async () => {
    const nowIso = new Date().toISOString();
    mockedFetch.mockResolvedValueOnce({ success: true } as any); // PUT

    render(<CommentItem comment={baseComment as any} />);

    // Open menu
    const allButtons = screen.getAllByRole('button');
    const menuBtn = allButtons[0];
    await userEvent.click(menuBtn);

    // Choose Edit
    await userEvent.click(await screen.findByRole('menuitem', { name: /Edit/i }));

    const textbox = await screen.findByRole('textbox');
    await userEvent.clear(textbox);
    await userEvent.type(textbox, 'Edited content');

    // Click Simpan
    await userEvent.click(screen.getByRole('button', { name: /Simpan/i }));

    // PUT called
    expect(mockedFetch).toHaveBeenCalledWith(
      '/comments/c1',
      'PUT',
      'token-123',
      expect.objectContaining({ content: 'Edited content' })
    );

    // Edited content visible
    expect(await screen.findByText('Edited content')).toBeInTheDocument();
  });
});
