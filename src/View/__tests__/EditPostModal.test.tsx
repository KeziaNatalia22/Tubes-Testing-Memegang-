/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import EditPostModal from '../EditPostModal';
import { fetchEndpoint } from '../FetchEndpoint';

jest.mock('../FetchEndpoint');

// Stub FAIcon to reduce noise
jest.mock('../Components/FAIcon', () => ({
  __esModule: true,
  default: ({ icon }: any) => <span data-testid="faicon">{icon}</span>,
}));

// Modal context mock
const closeMock = jest.fn();
const baseEditData = {
  postId: 'p1',
  titleEdit: 'Old title',
  imageUrlEdit: 'http://img',
  tagsEdit: ['tag1'],
};

jest.mock('../contexts/ModalContext', () => ({
  useModal: () => ({
    isEditPostModalOpen: true,
    closeEditPostModal: closeMock,
    openEditPostModal: jest.fn(),
    editPostData: baseEditData,
  }),
}));

describe('EditPostModal', () => {
  const mockedFetch = fetchEndpoint as jest.MockedFunction<typeof fetchEndpoint>;

  beforeEach(() => {
    jest.clearAllMocks();
    // token
    try {
      (localStorage.getItem as unknown as jest.Mock).mockReturnValue('tok');
    } catch {
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: jest.fn().mockReturnValue('tok'),
          setItem: jest.fn(),
          removeItem: jest.fn(),
          clear: jest.fn(),
        },
        configurable: true,
        writable: true,
      });
    }
  });

  it('submits successfully and calls API with FormData', async () => {
    mockedFetch.mockResolvedValueOnce({ success: true } as any);

    render(<EditPostModal />);

    // Ensure dialog renders
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Edit Post/i })).toBeInTheDocument();

    // Update title and add a tag
    const titleInput = screen.getByLabelText(/Post Title/i);
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, 'New title');

    const tagInput = screen.getByLabelText(/Add Tags/i);
    await userEvent.type(tagInput, 'tag2');
    await userEvent.keyboard('{Enter}');

    // Submit
    await userEvent.click(screen.getByRole('button', { name: /Edit Meme/i }));

    // Success alert appears
    expect(await screen.findByText(/Post edited successfully/i)).toBeInTheDocument();

    // Verify API call
    await waitFor(() => {
      expect(mockedFetch).toHaveBeenCalledWith(
        '/post/p1',
        'PUT',
        'tok',
        expect.any(FormData)
      );
    });

  // Modal closes after a short delay
  await waitFor(() => expect(closeMock).toHaveBeenCalled(), { timeout: 3000 });
  });

  it('shows validation error when title or image missing', async () => {
  render(<EditPostModal />);

  // Use Reset to clear fields and preview so we can trigger both validations
  await userEvent.click(screen.getByRole('button', { name: /Reset/i }));

  // Attempt submit with empty title
  await userEvent.click(screen.getByRole('button', { name: /Edit Meme/i }));
  expect(await screen.findByText(/Please provide a title/i)).toBeInTheDocument();
  expect(mockedFetch).not.toHaveBeenCalled();

  // Fill title but no image (and preview is null)
  await userEvent.type(screen.getByLabelText(/Post Title/i), 'Title set');
  await userEvent.click(screen.getByRole('button', { name: /Edit Meme/i }));
  expect(await screen.findByText(/Please select an image to upload/i)).toBeInTheDocument();
  expect(mockedFetch).not.toHaveBeenCalled();
  });
});
