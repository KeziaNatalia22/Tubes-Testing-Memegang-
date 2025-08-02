/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import '@testing-library/jest-dom';
import CreatePostModal from '../CreatePostModal';
import { fetchEndpoint } from '../FetchEndpoint';

// Mock the dependencies
jest.mock('../FetchEndpoint');
jest.mock('../Components/FAIcon', () => {
  return function MockFAIcon({ icon, style }: { icon: string; style?: React.CSSProperties }) {
    return <span data-testid="fa-icon" data-icon={icon} style={style}>{icon}</span>;
  };
});

// Mock the modal context with a dynamic state
let mockModalState = {
  isCreatePostModalOpen: true,
  closeCreatePostModal: jest.fn(),
};

jest.mock('../contexts/ModalContext', () => ({
  useModal: () => mockModalState,
}));


const mockFetchEndpoint = fetchEndpoint as jest.MockedFunction<typeof fetchEndpoint>;
const theme = createTheme();

// Setup mocks for browser APIs
// Helper function to get file input more specifically
const getFileInput = () => document.querySelector('input[type="file"]') as HTMLInputElement;

// Helper function to render component
const renderComponent = (modalOpen = true) => {
  // Update the mock state before rendering
  mockModalState.isCreatePostModalOpen = modalOpen;
  
  return render(
    <ThemeProvider theme={theme}>
      <CreatePostModal />
    </ThemeProvider>
  );
};

describe('CreatePostModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (localStorage.getItem as jest.Mock).mockReturnValue('mock-token');
    (URL.createObjectURL as jest.Mock).mockReturnValue('mocked-url');
  });

  describe('Form Validation', () => {
    it('should show error when title is missing', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const submitButton = screen.getByRole('button', { name: /post meme/i });
      await user.click(submitButton);
      
      expect(screen.getByText('Please provide a title for your post.')).toBeInTheDocument();
    });

    it('should show error when image is missing', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const titleInput = screen.getByLabelText('Post Title') as HTMLInputElement;
      await user.type(titleInput, 'Test Title');
      
      const submitButton = screen.getByRole('button', { name: /post meme/i });
      await user.click(submitButton);
      
      expect(screen.getByText('Please select an image to upload.')).toBeInTheDocument();
    });

    it('should submit form successfully with correct FormData format', async () => {
      const user = userEvent.setup();
      
      // Create a promise that we can control
      let resolvePromise: (value: any) => void;
      const controlledPromise = new Promise(resolve => {
        resolvePromise = resolve;
      });
      
      mockFetchEndpoint.mockReturnValue(controlledPromise);
      
      renderComponent();
      
      // Fill form with specific test data
      const titleInput = screen.getByLabelText('Post Title') as HTMLInputElement;
      await user.type(titleInput, 'My Test Meme');
      
      const tagInput = screen.getByLabelText('Add Tags') as HTMLInputElement;
      await user.type(tagInput, 'funny');
      await user.keyboard('{Enter}');
      await user.type(tagInput, 'meme');
      await user.keyboard('{Enter}');
      
      const file = new File(['test image data'], 'test-meme.jpg', { type: 'image/jpeg' });
      const fileInput = getFileInput();
      await user.upload(fileInput, file);
      
      const submitButton = screen.getByRole('button', { name: /post meme/i });
      await user.click(submitButton);
      
      // Check loading state
      expect(screen.getByText(/uploading/i)).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
      
      // Now resolve the promise
      resolvePromise!({ success: true });
      
      await waitFor(() => {
        expect(mockFetchEndpoint).toHaveBeenCalledWith(
          '/post/submit',
          'POST',
          'mock-token',
          expect.any(FormData)
        );
      });
      
      const callArgs = mockFetchEndpoint.mock.calls[0];
      const formData = callArgs[3] as FormData;
      
      // Verify FormData contains correct fields and values
      expect(formData.get('title')).toBe('My Test Meme');
      expect(formData.getAll('tag')).toEqual(['funny', 'meme']);
      expect(formData.get('image')).toBe(file);
      expect((formData.get('image') as File).name).toBe('test-meme.jpg');
      expect((formData.get('image') as File).type).toBe('image/jpeg');
      
      // Verify success message
      await waitFor(() => {
        expect(screen.getByText('Post created successfully!')).toBeInTheDocument();
      });
    });
  });  
});
