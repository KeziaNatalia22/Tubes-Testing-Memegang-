import React, { useState, ChangeEvent, KeyboardEvent } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Stack,
  Chip,
  IconButton,
  Dialog,
  DialogContent,
  CircularProgress,
  Alert,
  AlertTitle,
  InputAdornment,
  styled
} from '@mui/material';
import { fetchEndpoint } from './FetchEndpoint';
import FAIcon from './Components/FAIcon';
import { useModal } from './contexts/ModalContext';

const MAX_TAG_LENGTH = 20;

// Styled components to match other modals
const StyledTextField = styled(TextField)(({ theme }) => ({
  marginBottom: theme.spacing(2.5),
  '& .MuiOutlinedInput-root': {
    '& fieldset': {
      borderColor: 'rgba(255, 255, 255, 0.23)',
    },
    '&:hover fieldset': {
      borderColor: 'rgba(255, 255, 255, 0.5)',
    },
    '&.Mui-focused fieldset': {
      borderColor: '#1976d2',
    },
    '& input': {
      color: 'white',
      fontFamily: '"Poppins", sans-serif',
    },
  },
  '& .MuiInputLabel-root': {
    color: '#aaa',
    fontFamily: '"Poppins", sans-serif',
    '&.Mui-focused': {
      color: '#1976d2',
    },
  },
  '& .MuiFormHelperText-root': {
    color: '#888',
    fontFamily: '"Poppins", sans-serif',
  },
}));

const ActionButton = styled(Button)(({ theme }) => ({
  backgroundColor: '#1976d2',
  color: 'white',
  textTransform: 'none',
  fontFamily: '"Poppins", sans-serif',
  fontWeight: 600,
  padding: theme.spacing(1.2, 0),
  fontSize: '1rem',
  '&:hover': {
    backgroundColor: '#1565c0',
  },
}));

const CancelButton = styled(Button)(({ theme }) => ({
  backgroundColor: 'transparent',
  color: '#aaa',
  textTransform: 'none',
  fontFamily: '"Poppins", sans-serif',
  fontWeight: 600,
  padding: theme.spacing(1.2, 0),
  fontSize: '1rem',
  border: '1px solid rgba(255, 255, 255, 0.23)',
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
}));

const StyledChip = styled(Chip)(({ theme }) => ({
  backgroundColor: alpha(theme.palette.primary.main, 0.1),
  color: theme.palette.primary.main,
  fontFamily: '"Poppins", sans-serif',
  '& .MuiChip-deleteIcon': {
    color: theme.palette.primary.main,
    '&:hover': {
      color: theme.palette.primary.dark,
    },
  },
}));

const CreatePostModal: React.FC = () => {
  const { isCreatePostModalOpen, closeCreatePostModal } = useModal();
  
  const [title, setTitle] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [alertSeverity, setAlertSeverity] = useState<'success' | 'error'>('error');

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleTagInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setTagInput(e.target.value);
  };

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault();
      addTag(tagInput.trim());
    }
  };

  const addTag = (tag: string) => {
    if (
      tag &&
      !tags.includes(tag) &&
      tag.length <= MAX_TAG_LENGTH
    ) {
      setTags([...tags, tag]);
    }
    setTagInput('');
  };

  const handleTagDelete = (tagToDelete: string) => {
    setTags(tags.filter((tag) => tag !== tagToDelete));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title) {
      setAlertMessage('Please provide a title for your post.');
      setAlertSeverity('error');
      return;
    }

    if (!image) {
      setAlertMessage('Please select an image to upload.');
      setAlertSeverity('error');
      return;
    }

    setLoading(true);
    setAlertMessage(null);

    const formData = new FormData();
    formData.append('title', title);
    formData.append('image', image);
    tags.forEach((tag) => formData.append('tag', tag));

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('You must be logged in to create a post');
      }
      
      const result = await fetchEndpoint('/post/submit', 'POST', token, formData);

      setAlertMessage('Post created successfully!');
      setAlertSeverity('success');
      
      // Clear form after success
      setTimeout(() => {
        handleCancel();
        closeCreatePostModal();
      }, 2000);
      
    } catch (error: any) {
      console.error('Upload error:', error);
      setAlertMessage(error.message || 'Failed to create post. Please try again.');
      setAlertSeverity('error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setTitle('');
    setImage(null);
    setImagePreview(null);
    setTagInput('');
    setTags([]);
    setAlertMessage(null);
  };

  const handleClose = () => {
    handleCancel();
    closeCreatePostModal();
  };

  return (
    <Dialog 
      open={isCreatePostModalOpen} 
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      disableScrollLock={true}
      PaperProps={{
        sx: {
          backgroundColor: '#1a1a1a',
          borderRadius: 2,
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
        }
      }}
      slotProps={{
        backdrop: {
          sx: {
            backdropFilter: 'blur(8px)',
            backgroundColor: 'rgba(0,0,0,0.5)'
          }
        }
      }}
    >
      <DialogContent sx={{ p: 4 }}>
        <Box sx={{ position: 'absolute', top: 12, right: 12 }}>
          <IconButton onClick={handleClose} sx={{ color: '#aaa' }}>
            <FAIcon icon="fas fa-times" />
          </IconButton>
        </Box>
        
        <Typography 
          variant="h4" 
          component="h1" 
          sx={{ 
            textAlign: 'center', 
            mb: 3,
            fontWeight: 600,
            fontFamily: '"Poppins", sans-serif',
            color: 'white'
          }}
        >
          Create Post
        </Typography>
        
        {alertMessage && (
          <Alert 
            severity={alertSeverity}
            sx={{ 
              mb: 3,
              '& .MuiAlert-message': {
                fontFamily: '"Poppins", sans-serif',
              }
            }}
          >
            <AlertTitle sx={{ fontFamily: '"Poppins", sans-serif', fontWeight: 600 }}>
              {alertSeverity === 'success' ? 'Success' : 'Error'}
            </AlertTitle>
            {alertMessage}
          </Alert>
        )}
        
        <form onSubmit={handleSubmit}>
          <StyledTextField
            label="Post Title"
            fullWidth
            variant="outlined"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <FAIcon icon="fas fa-heading" style={{ color: '#888' }} />
                </InputAdornment>
              ),
            }}
          />
          
          <StyledTextField
            label="Add Tags"
            fullWidth
            variant="outlined"
            value={tagInput}
            onChange={handleTagInputChange}
            onKeyDown={handleTagKeyDown}
            helperText={`Press Enter or comma to add (max ${MAX_TAG_LENGTH} chars)`}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <FAIcon icon="fas fa-tags" style={{ color: '#888' }} />
                </InputAdornment>
              ),
            }}
          />
          
          {tags.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3, mt: 1 }}>
              {tags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  onDelete={() => handleTagDelete(tag)}
                  sx={{ 
                    backgroundColor: 'rgba(25, 118, 210, 0.1)',
                    color: '#1976d2',
                    fontFamily: '"Poppins", sans-serif',
                  }}
                />
              ))}
            </Box>
          )}
          
          <Box 
            sx={{ 
              border: '1px dashed rgba(255, 255, 255, 0.3)', 
              borderRadius: 1,
              p: 2,
              mb: 3,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
              cursor: 'pointer',
              '&:hover': {
                borderColor: '#1976d2',
                backgroundColor: 'rgba(25, 118, 210, 0.05)',
              }
            }}
            onClick={() => document.getElementById('image-upload')?.click()}
          >
            {imagePreview ? (
              <Box 
                component="img" 
                src={imagePreview} 
                alt="Preview"
                sx={{ 
                  maxWidth: '100%', 
                  maxHeight: '250px',
                  borderRadius: 1,
                }}
              />
            ) : (
              <>
                <FAIcon icon="fas fa-cloud-upload-alt" style={{ fontSize: '2.5rem', color: '#888', marginBottom: '12px' }} />
                <Typography sx={{ color: '#888', fontFamily: '"Poppins", sans-serif' }}>
                  Click to upload an image
                </Typography>
              </>
            )}
            
            <input
              id="image-upload"
              type="file"
              accept="image/*"
              hidden
              onChange={handleImageChange}
            />
          </Box>
          
          <Stack direction="row" spacing={2}>
            <ActionButton
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              startIcon={loading ? undefined : <FAIcon icon="fas fa-paper-plane" />}
            >
              {loading ? (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
                  Uploading...
                </Box>
              ) : (
                'Post Meme'
              )}
            </ActionButton>
            
            <CancelButton
              fullWidth
              variant="outlined"
              onClick={handleCancel}
              startIcon={<FAIcon icon="fas fa-undo" />}
            >
              Reset
            </CancelButton>
          </Stack>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePostModal;

function alpha(main: string, arg1: number): import("csstype").Property.BackgroundColor | readonly string[] | readonly import("csstype").Property.BackgroundColor[] | undefined {
  throw new Error('Function not implemented.');
}
