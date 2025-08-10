/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import CommentDetailPage from '../ViewComments';

// Mock useParams to provide an id
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ id: 'cmt1' }),
}));

describe('ViewComments (CommentDetailPage)', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    // Token for Authorization header
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

  afterEach(() => {
    global.fetch = originalFetch as any;
  });

  it('shows loading then empty message when comment not found', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => null,
    } as any);

    render(<CommentDetailPage />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(await screen.findByText(/Komentar tidak ditemukan/i)).toBeInTheDocument();

    // initial GET called with token header
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/comments/cmt1/replies',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer token-123' }),
      })
    );
  });

  it('submits a main reply and refreshes list', async () => {
    const commentPayload = {
      id: 'cmt1',
      user: { name: 'alice', avatar: null },
      text: 'Main comment',
      createdAt: new Date().toISOString(),
      replies: [],
    };

    // Sequence: initial GET, POST reply, GET refresh
    (global.fetch as any) = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => commentPayload })
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: true, json: async () => commentPayload });

    render(<CommentDetailPage />);

    // Wait for main comment
    expect(await screen.findByText('Main comment')).toBeInTheDocument();

    // Open Balas form
    await userEvent.click(screen.getByRole('button', { name: /Balas/i }));

    // Type and Kirim
    const input = screen.getByPlaceholderText(/Tulis balasanmu/i);
    await userEvent.type(input, 'Nice one');
    await userEvent.click(screen.getByRole('button', { name: /Kirim/i }));

    // Ensure POST called with correct endpoint and headers
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/comments/cmt1/replies',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-123',
        }),
        body: JSON.stringify({ content: 'Nice one' }),
      })
    );

    // Refetch after posting
    await waitFor(() => {
      expect((global.fetch as jest.Mock).mock.calls.filter((c: any[]) => c[0].includes('/comments/cmt1/replies')).length).toBeGreaterThanOrEqual(2);
    });
  });

  it('submits a reply to a reply and refreshes', async () => {
    const commentWithReply = {
      id: 'cmt1',
      user: { name: 'alice', avatar: null },
      text: 'Main comment',
      createdAt: new Date().toISOString(),
      replies: [
        {
          id: 'r1',
          user: { name: 'bob', avatar: null },
          text: 'first reply',
          createdAt: new Date().toISOString(),
        },
      ],
    } as any;

    // Sequence: initial GET, POST reply-to-reply, GET refresh
    (global.fetch as any) = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => commentWithReply })
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: true, json: async () => commentWithReply });

    render(<CommentDetailPage />);

    // Wait for reply shown
    expect(await screen.findByText('first reply')).toBeInTheDocument();

    // Open reply form for that reply (its Balas button)
    const replyButtons = screen.getAllByRole('button', { name: /Balas/i });
    // The first Balas is for main comment; second for the reply
    await userEvent.click(replyButtons[1]);

    const replyInput = screen.getAllByPlaceholderText(/Tulis balasanmu/i)[0];
    await userEvent.type(replyInput, 'reply to reply');
    const kirimButtons = screen.getAllByRole('button', { name: /Kirim/i });
    await userEvent.click(kirimButtons[kirimButtons.length - 1]);

    // Ensure POST to /comments/r1/replies
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/comments/r1/replies',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-123',
        }),
        body: JSON.stringify({ content: 'reply to reply' }),
      })
    );

    // Refetch after posting
    await waitFor(() => {
      expect((global.fetch as jest.Mock).mock.calls.filter((c: any[]) => c[0].includes('/comments/cmt1/replies')).length).toBeGreaterThanOrEqual(2);
    });
  });
});
