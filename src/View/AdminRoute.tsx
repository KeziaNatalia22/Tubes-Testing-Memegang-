import React from 'react';
import { useAuth } from './contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button } from '@mui/material';
import FAIcon from './Components/FAIcon';

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { isAuthenticated, userData } = useAuth();
  const navigate = useNavigate();

  if (!isAuthenticated) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          minHeight: '60vh',
          gap: 2,
          textAlign: 'center',
          px: 3
        }}
      >
        <FAIcon icon="fas fa-shield-halved" style={{ fontSize: '4rem', color: '#666' }} />
        <Typography variant="h4" sx={{ color: '#fff', fontWeight: 600 }}>
          Authentication Required
        </Typography>
        <Typography variant="body1" sx={{ color: '#aaa', mb: 2 }}>
          You need to be logged in to access the admin panel.
        </Typography>
        <Button 
          variant="contained" 
          onClick={() => navigate('/')}
          startIcon={<FAIcon icon="fas fa-home" />}
        >
          Go Home
        </Button>
      </Box>
    );
  }

  if (userData?.role !== 'admin') {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          minHeight: '60vh',
          gap: 2,
          textAlign: 'center',
          px: 3
        }}
      >
        <FAIcon icon="fas fa-exclamation-triangle" style={{ fontSize: '4rem', color: '#f44336' }} />
        <Typography variant="h4" sx={{ color: '#fff', fontWeight: 600 }}>
          Access Denied
        </Typography>
        <Typography variant="body1" sx={{ color: '#aaa', mb: 2 }}>
          You don't have permission to access the admin panel. Only administrators can view this page.
        </Typography>
        <Button 
          variant="contained" 
          onClick={() => navigate('/')}
          startIcon={<FAIcon icon="fas fa-home" />}
        >
          Go Home
        </Button>
      </Box>
    );
  }

  return <>{children}</>;
};

export default AdminRoute;
