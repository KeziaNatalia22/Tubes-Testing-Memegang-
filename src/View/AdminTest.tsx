import React from 'react';
import { Box, Typography } from '@mui/material';
import { useAuth } from './contexts/AuthContext';

const AdminTest: React.FC = () => {
  const { userData } = useAuth();
  
  return (
    <Box sx={{ 
      p: 3, 
      minHeight: '60vh' 
    }}>
      <Typography variant="h3" sx={{ color: '#fff', mb: 3 }}>
        Admin Panel Test
      </Typography>
      <Typography variant="body1" sx={{ color: '#aaa', mb: 2 }}>
        You are successfully accessing the admin page!
      </Typography>
      <Typography variant="body2" sx={{ color: '#aaa' }}>
        Current user role: {userData?.role || 'unknown'}
      </Typography>
      <Typography variant="body2" sx={{ color: '#aaa' }}>
        User data: {JSON.stringify(userData, null, 2)}
      </Typography>
    </Box>
  );
};

export default AdminTest;
