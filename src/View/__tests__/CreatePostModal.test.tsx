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
beforeAll(() => {
  // Mock window.URL.createObjectURL and revokeObjectURL
  Object.defineProperty(window, 'URL', {
    value: {
      createObjectURL: jest.fn(() => 'mocked-url'),
      revokeObjectURL: jest.fn(),
    },
  });

  // Mock localStorage
  const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  };
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
  });

  // Mock FormData
  global.FormData = class FormData {
    private data: Map<string, any> = new Map();
  
    append(name: string, value: any) {
      if (this.data.has(name)) {
        const existing = this.data.get(name);
        if (Array.isArray(existing)) {
          existing.push(value);
        } else {
          this.data.set(name, [existing, value]);
        }
      } else {
        this.data.set(name, value);
      }
    }
  
    get(name: string) {
      const value = this.data.get(name);
      return Array.isArray(value) ? value[0] : value;
    }
  
    getAll(name: string) {
      const value = this.data.get(name);
      return Array.isArray(value) ? value : value ? [value] : [];
    }
  
    has(name: string) {
      return this.data.has(name);
    }
  
    delete(name: string) {
      this.data.delete(name);
    }
  
    keys() {
      return this.data.keys();
    }
  
    values() {
      return this.data.values();
    }
  
    entries() {
      return this.data.entries();
    }
  
    forEach(callback: (value: any, key: string, parent: FormData) => void) {
      this.data.forEach((value, key) => callback(value, key, this));
    }
  } as any;
});

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

  describe('Component Rendering', () => {
    it('should render the modal content when open', () => {
      renderComponent(true);
      
      expect(screen.getByText('Create Post')).toBeInTheDocument();
      expect(screen.getByLabelText('Post Title')).toBeInTheDocument();
      expect(screen.getByLabelText('Add Tags')).toBeInTheDocument();
      expect(screen.getByText('Click to upload an image')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /post meme/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
    });

    it('should not render modal content when closed', () => {
      renderComponent(false);
      expect(screen.queryByText('Create Post')).not.toBeInTheDocument();
    });
  });

  describe('Form Input Handling', () => {
    it('should update title input when user types', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const titleInput = screen.getByLabelText('Post Title') as HTMLInputElement;
      await user.type(titleInput, 'Test Title');
      
      expect(titleInput.value).toBe('Test Title');
    });

    it('should create tag when Enter is pressed', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const tagInput = screen.getByLabelText('Add Tags') as HTMLInputElement;
      await user.type(tagInput, 'funny');
      await user.keyboard('{Enter}');
      
      expect(screen.getByText('funny')).toBeInTheDocument();
      expect(tagInput.value).toBe('');
    });

    it('should create tag when comma is typed', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const tagInput = screen.getByLabelText('Add Tags') as HTMLInputElement;
      await user.type(tagInput, 'meme,');
      
      expect(screen.getByText('meme')).toBeInTheDocument();
      expect(tagInput.value).toBe('');
    });

    it('should not create duplicate tags', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const tagInput = screen.getByLabelText('Add Tags') as HTMLInputElement;
      
      await user.type(tagInput, 'duplicate');
      await user.keyboard('{Enter}');
      await user.type(tagInput, 'duplicate');
      await user.keyboard('{Enter}');
      
      const tagElements = screen.getAllByText('duplicate');
      expect(tagElements).toHaveLength(1);
    });

    it('should not create tags longer than MAX_TAG_LENGTH', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const tagInput = screen.getByLabelText('Add Tags') as HTMLInputElement;
      const longTag = 'a'.repeat(21); // Longer than MAX_TAG_LENGTH (20)
      
      await user.type(tagInput, longTag);
      await user.keyboard('{Enter}');
      
      expect(screen.queryByText(longTag)).not.toBeInTheDocument();
    });

    it('should delete tags when delete button is clicked', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const tagInput = screen.getByLabelText('Add Tags') as HTMLInputElement;
      
      await user.type(tagInput, 'deleteme');
      await user.keyboard('{Enter}');
      
      expect(screen.getByText('deleteme')).toBeInTheDocument();
      
      // Find delete button by chip's delete functionality
      const chip = screen.getByText('deleteme').closest('.MuiChip-root');
      const deleteButton = chip?.querySelector('.MuiChip-deleteIcon');
      
      if (deleteButton) {
        await user.click(deleteButton as Element);
        expect(screen.queryByText('deleteme')).not.toBeInTheDocument();
      }
    });
  });

  describe('Image Upload', () => {
    it('should handle file selection', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const file = new File(['test image'], 'test.jpg', { type: 'image/jpeg' });
      const fileInput = getFileInput();
      
      await user.upload(fileInput, file);
      
      expect(fileInput.files?.[0]).toBe(file);
      expect(URL.createObjectURL).toHaveBeenCalledWith(file);
    });

    it('should show image preview after upload', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const file = new File(['test image'], 'test.jpg', { type: 'image/jpeg' });
      const fileInput = getFileInput();
      
      await user.upload(fileInput, file);
      
      expect(screen.getByAltText('Preview')).toBeInTheDocument();
      expect(screen.queryByText('Click to upload an image')).not.toBeInTheDocument();
    });
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

    it('should show error when user is not logged in', async () => {
      const user = userEvent.setup();
      (localStorage.getItem as jest.Mock).mockReturnValue(null);
      
      renderComponent();
      
      const titleInput = screen.getByLabelText('Post Title') as HTMLInputElement;
      await user.type(titleInput, 'Test Title');
      
      const file = new File(['test image'], 'test.jpg', { type: 'image/jpeg' });
      const fileInput = getFileInput();
      await user.upload(fileInput, file);
      
      const submitButton = screen.getByRole('button', { name: /post meme/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('You must be logged in to create a post')).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
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
      
      // ✅ ENHANCED: Verify both the call and the FormData content
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

    it('should handle submission error', async () => {
      const user = userEvent.setup();
      mockFetchEndpoint.mockRejectedValue(new Error('Network error'));
      
      renderComponent();
      
      const titleInput = screen.getByLabelText('Post Title') as HTMLInputElement;
      await user.type(titleInput, 'Test Title');
      
      const file = new File(['test image'], 'test.jpg', { type: 'image/jpeg' });
      const fileInput = getFileInput();
      await user.upload(fileInput, file);
      
      const submitButton = screen.getByRole('button', { name: /post meme/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });
  });
  

  describe('Form Reset', () => {
    it('should reset form when reset button is clicked', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      // Fill form
      const titleInput = screen.getByLabelText('Post Title') as HTMLInputElement;
      await user.type(titleInput, 'Test Title');
      
      const tagInput = screen.getByLabelText('Add Tags') as HTMLInputElement;
      await user.type(tagInput, 'tag1');
      await user.keyboard('{Enter}');
      
      // Click reset
      const resetButton = screen.getByRole('button', { name: /reset/i });
      await user.click(resetButton);
      
      // Check form is cleared
      expect(titleInput.value).toBe('');
      expect(screen.queryByText('tag1')).not.toBeInTheDocument();
    });
  });

  describe('Modal Closing', () => {
    it('should close modal after successful submission', async () => {
      const user = userEvent.setup();
      
      let resolvePromise: (value: any) => void;
      const controlledPromise = new Promise(resolve => {
        resolvePromise = resolve;
      });
      
      mockFetchEndpoint.mockReturnValue(controlledPromise);
      
      renderComponent();
      
      // Fill and submit form
      const titleInput = screen.getByLabelText('Post Title') as HTMLInputElement;
      await user.type(titleInput, 'Test Title');
      
      const file = new File(['test image'], 'test.jpg', { type: 'image/jpeg' });
      const fileInput = getFileInput();
      await user.upload(fileInput, file);
      
      const submitButton = screen.getByRole('button', { name: /post meme/i });
      await user.click(submitButton);
      
      // Resolve the promise (simulate successful submission)
      resolvePromise!({ success: true });
      
      // Wait for success and verify modal closes
      await waitFor(() => {
        expect(screen.getByText('Post created successfully!')).toBeInTheDocument();
        expect(mockModalState.closeCreatePostModal).toHaveBeenCalledTimes(1);
      });
    });

    it('should close modal when close button is clicked', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      // Find the close button more directly
      const closeButton = document.querySelector('button span[data-icon="fas fa-times"]')
        ?.closest('button') as HTMLButtonElement;
      
      expect(closeButton).toBeTruthy(); // Make sure we found it
      
      await user.click(closeButton);
      
      expect(mockModalState.closeCreatePostModal).toHaveBeenCalledTimes(1);
    });

    it('should close modal when clicking outside', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      // Click the MUI backdrop - this consistently works
      const muiBackdrop = document.querySelector('.MuiBackdrop-root');
      expect(muiBackdrop).toBeTruthy();
      
      await user.click(muiBackdrop!);
      
      expect(mockModalState.closeCreatePostModal).toHaveBeenCalledTimes(1);
    });

    it('should not close modal when submit fails', async () => {
      const user = userEvent.setup();
      mockFetchEndpoint.mockRejectedValue(new Error('Submission failed'));
      
      renderComponent();
      
      // Fill form
      const titleInput = screen.getByLabelText('Post Title') as HTMLInputElement;
      await user.type(titleInput, 'Test Title');
      
      const file = new File(['test image'], 'test.jpg', { type: 'image/jpeg' });
      const fileInput = getFileInput();
      await user.upload(fileInput, file);
      
      const submitButton = screen.getByRole('button', { name: /post meme/i });
      await user.click(submitButton);
      
      // Wait for error message
      await waitFor(() => {
        expect(screen.getByText('Submission failed')).toBeInTheDocument();
        expect(mockModalState.closeCreatePostModal).not.toHaveBeenCalled();
      });
    });
  });
});
