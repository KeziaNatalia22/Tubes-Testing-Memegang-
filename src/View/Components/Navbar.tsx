import React, { useState, useEffect } from 'react';
import { useNavigate, Link as RouterLink, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useModal } from '../contexts/ModalContext';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  InputBase,
  Menu,
  MenuItem,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Box,
  Divider,
  alpha,
  styled,
  useMediaQuery,
  Avatar,
} from '@mui/material';

import FAIcon from './FAIcon';
import { fetchEndpoint } from '../FetchEndpoint';

const LogoTypography = styled(Typography)(({ theme }) => ({
  fontWeight: 'bold',
  cursor: 'pointer',
  marginRight: theme.spacing(2),
  fontSize: '1.3rem',
  fontFamily: '"Poppins", sans-serif', 
}));

const NavButton = styled(Button)(({ theme }) => ({
  margin: theme.spacing(0, 0.5),
  color: 'white',
  textTransform: 'none',
  fontFamily: '"Poppins", sans-serif', 
  fontWeight: 500,
  '&:hover': {
    backgroundColor: alpha(theme.palette.common.white, 0.1),
  },
})) as typeof Button;

const SignUpButton = styled(Button)(({ theme }) => ({
  margin: theme.spacing(0, 0.5),
  backgroundColor: '#1976d2',
  color: 'white',
  textTransform: 'none',
  fontFamily: '"Poppins", sans-serif', 
  fontWeight: 600, 
  '&:hover': {
    backgroundColor: '#1565c0',
  },
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: 'inherit',
  width: '100%',
  height: '100%',
  fontFamily: '"Poppins", sans-serif',
  '& .MuiInputBase-input': {
    padding: theme.spacing(1, 1, 1, 0),
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    transition: theme.transitions.create('width'),
    width: '100%',
    borderRadius: 20,
    fontSize: '0.9rem',
    [theme.breakpoints.up('md')]: {
      width: '20ch',
    },
  },
}));

const IconWrapper = styled('div')({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 24,
  height: 24,
  color: '#aaa'
});

const Search = styled('div')(({ theme }) => ({
  position: 'relative',
  borderRadius: 20,
  backgroundColor: alpha(theme.palette.common.white, 0.1),
  '&:hover': {
    backgroundColor: alpha(theme.palette.common.white, 0.15),
  },
  marginRight: theme.spacing(2),
  marginLeft: 0,
  width: '100%',
  [theme.breakpoints.up('sm')]: {
    marginLeft: theme.spacing(3),
    width: 'auto',
  },
}));

const SearchIconWrapper = styled('div')(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: '100%',
  position: 'absolute',
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));

const StyledAppBar = styled(AppBar)(() => ({
  backgroundColor: '#1a1a1a',
  boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
  color: 'white',
}));

const MuiNavbar: React.FC = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const isMobile = useMediaQuery('(max-width:600px)');
  const navigate = useNavigate();
  // const location = useLocation();

  const { isAuthenticated, logout, userData } = useAuth();
  const { openLoginModal, openRegisterModal, openCreatePostModal } = useModal();

  // Debounced search handler
  useEffect(() => {
    if (searchTimeout) clearTimeout(searchTimeout);
    if (searchQuery.trim() === '') {
      // Jika kosong, bisa reset hasil pencarian di home jika mau
      navigate('/', { state: { searchResults: null, searchQuery: '' } });
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const data = await fetchEndpoint(`/search?query=${searchQuery}`, 'GET');
        navigate('/', { state: { searchResults: data, searchQuery } });
      } catch {
        navigate('/', { state: { searchResults: [], searchQuery } });
      }
    }, 500);
    setSearchTimeout(timeout);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line
  }, [searchQuery]);

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleDrawerToggle = () => {
    setDrawerOpen((prev) => !prev);
  };

  const handleLogout = () => {
    logout();
    handleMenuClose();
    navigate('/');
    console.log('User logged out successfully');
  };

  const handleSearchSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (searchTimeout) clearTimeout(searchTimeout);
    if (searchQuery.trim() === '') {
      navigate('/', { state: { searchResults: null, searchQuery: '' } });
      return;
    }
    try {
      const endpoint = `/search?query=${searchQuery}`;
      const data = await fetchEndpoint(endpoint, 'GET');
      console.log('Searching for:', searchQuery);
      navigate('/', { state: { searchResults: data, searchQuery } });
    } catch {
      navigate('/', { state: { searchResults: [], searchQuery } });
    }
  };

  const getAvatarUrl = (avatarPath: string | undefined) => {
    if (!avatarPath) return undefined;
    if (avatarPath.startsWith('http')) {
      return avatarPath;
    }
    const filename = avatarPath.includes('/')
      ? avatarPath.split('/').pop()
      : avatarPath;
    if (!filename) return undefined;
    const cacheBuster = avatarPath.includes('?t=') ? '' : `?t=${new Date().getTime()}`;
    return `/uploads/avatars/${filename}${cacheBuster}`;
  };

  const menuId = 'primary-account-menu';
  const renderMenu = (
    <Menu
      anchorEl={anchorEl}
      id={menuId}
      keepMounted
      open={Boolean(anchorEl)}
      onClose={handleMenuClose}
      slotProps={{
        paper: {
          elevation: 3,
          sx: { 
            backgroundColor: '#222', 
            color: 'white',
            minWidth: '200px'
          }
        },
        backdrop: {
          sx: { backdropFilter: 'none' }
        }
      }}
      disableScrollLock={true}
    >
      {userData && (
        <Box sx={{ 
          p: 2, 
          display: 'flex', 
          alignItems: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          {userData.profilePicture ? (
            <Link to={`/profile/${userData.username}`} style={{ display: 'inline-block' }}>
              <Avatar
                src={getAvatarUrl(userData.profilePicture)}
                alt={userData.username}
                sx={{
                  width: 40,
                  height: 40,
                  mr: 1.5,
                  border: '2px solid rgba(255,255,255,0.2)',
                }}
              />
            </Link>
          ) : ( 
            <Link to={`/profile/${userData.username}`} style={{ display: 'inline-block' }}>
            <Avatar sx={{ 
              width: 40, 
              height: 40,
              mr: 1.5,
              bgcolor: '#1976d2'
            }}>
              {userData.username[0].toUpperCase()}
            </Avatar>
            </Link>
          )}
          <Box>
            <Typography sx={{ 
              fontWeight: 500,
              lineHeight: 1.2,
              fontFamily: '"Poppins", sans-serif'
            }}>
              {userData.name}
            </Typography>
            <Typography variant="body2" sx={{ 
              color: '#aaa',
              fontSize: '0.8rem',
              fontFamily: '"Poppins", sans-serif'
            }}>
              @{userData.username}
            </Typography>
          </Box>
        </Box>
      )}

      {[
        <MenuItem onClick={() => { navigate('/settings'); handleMenuClose(); }}>
          <ListItemIcon>
            <IconWrapper>
              <FAIcon icon="fas fa-gear" />
            </IconWrapper>
          </ListItemIcon>
          <Typography>Settings</Typography>
        </MenuItem>,
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <IconWrapper>
              <FAIcon icon="fas fa-sign-out-alt" />
            </IconWrapper>
          </ListItemIcon>
          <Typography>Logout</Typography>
        </MenuItem>
        ]}
    </Menu>
  );

  return (
    <>
      <StyledAppBar position="fixed">
        <Toolbar>
          {isMobile && (
            <IconButton
              edge="start"
              color="inherit"
              aria-label="menu"
              onClick={handleDrawerToggle}
              sx={{ mr: 1 }}
            >
              <FAIcon icon="fas fa-bars" />
            </IconButton>
          )}
          
          <LogoTypography variant="h6" onClick={() => navigate('/')}>
            MEME GANG
          </LogoTypography>
          
          {!isMobile && (
            <>
              <NavButton 
                component={RouterLink} 
                to="/trending"
                startIcon={<FAIcon icon="fas fa-fire-flame-curved" />}
              >
                Trending
              </NavButton>
              <NavButton 
                component={RouterLink} 
                to="/fresh"
                startIcon={<FAIcon icon="fas fa-clock" />}
              >
                Fresh
              </NavButton>
              <NavButton 
                component={RouterLink} 
                to="/top"
                startIcon={<FAIcon icon="fas fa-chart-line" />}
              >
                Top
              </NavButton>
            </>
          )}

          {!isMobile && (
            <>
              <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <form onSubmit={handleSearchSubmit} style={{ width: '100%', maxWidth: '400px' }}>
                  <Search>
                    <SearchIconWrapper>
                      <FAIcon icon="fas fa-search" />
                    </SearchIconWrapper>
                    <StyledInputBase
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      inputProps={{ 'aria-label': 'search' }}
                    />
                  </Search>
                </form>
              </Box>
            </>
          )}
          
          <Box sx={{ flexGrow: 1 }} />
          
          {!isMobile && (
            <>
              {isAuthenticated ? (
                <>
                  <NavButton
                    startIcon={<FAIcon icon="fas fa-plus" />}
                    onClick={openCreatePostModal}
                  >
                    Post
                  </NavButton>
                  {userData?.role === 'admin' && (
                    <NavButton
                      component={RouterLink}
                      to="/admin"
                      startIcon={<FAIcon icon="fas fa-shield-halved" />}
                    >
                      Admin
                    </NavButton>
                  )}
                  <IconButton
                    edge="end"
                    aria-label="account"
                    aria-controls={menuId}
                    aria-haspopup="true"
                    onClick={handleProfileMenuOpen}
                    color="inherit"
                    sx={{ p: 0.5 }}
                  >
                    {userData?.profilePicture ? (
                      <Avatar 
                        src={getAvatarUrl(userData.profilePicture)} 
                        alt={userData.username}
                        sx={{ 
                          width: 36, 
                          height: 36,
                          border: '2px solid rgba(255,255,255,0.2)'
                        }} 
                      />
                    ) : (
                      <Avatar sx={{ 
                        width: 36, 
                        height: 36,
                        bgcolor: '#1976d2'
                      }}>
                        {userData?.username ? userData.username[0].toUpperCase() : <FAIcon icon="fas fa-user" />}
                      </Avatar>
                    )}
                  </IconButton>
                </>
              ) : (
                <>
                  <NavButton
                    startIcon={<FAIcon icon="fas fa-sign-in-alt" />}
                    onClick={openLoginModal}
                  >
                    Log In
                  </NavButton>
                  <SignUpButton
                    variant="contained"
                    onClick={openRegisterModal}
                  >
                    Sign Up
                  </SignUpButton>
                </>
              )}
            </>
          )}
        </Toolbar>
      </StyledAppBar>
      
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
      >
        <Box sx={{ width: 250, backgroundColor: '#222', height: '100%', color: 'white' }}>
          {isAuthenticated && userData && (
            <Box sx={{ 
              p: 2, 
              display: 'flex', 
              alignItems: 'center',
              borderBottom: '1px solid rgba(255,255,255,0.1)'
            }}>
              {userData.profilePicture ? (
                <Avatar 
                  src={getAvatarUrl(userData.profilePicture)} 
                  alt={userData.username}
                  sx={{ 
                    width: 40, 
                    height: 40,
                    mr: 1.5,
                    border: '2px solid rgba(255,255,255,0.2)'
                  }} 
                />
              ) : (
                <Avatar sx={{ 
                  width: 40, 
                  height: 40,
                  mr: 1.5,
                  bgcolor: '#1976d2'
                }}>
                  {userData.username[0].toUpperCase()}
                </Avatar>
              )}
              <Box>
                <Typography sx={{ 
                  fontWeight: 500,
                  lineHeight: 1.2,
                  fontFamily: '"Poppins", sans-serif'
                }}>
                  {userData.name || userData.username}
                </Typography>
                <Typography variant="body2" sx={{ 
                  color: '#aaa',
                  fontSize: '0.8rem',
                  fontFamily: '"Poppins", sans-serif'
                }}>
                  @{userData.username}
                </Typography>
              </Box>
            </Box>
          )}
          
          <Box sx={{ p: 2 }}>
            <Search sx={{ width: '100%', maxWidth: '400px' }}>
              <SearchIconWrapper>
                <FAIcon icon="fas fa-search" />
              </SearchIconWrapper>
              <StyledInputBase
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                inputProps={{ 'aria-label': 'search' }}
                fullWidth
              />
            </Search>
          </Box>
          <Divider sx={{ backgroundColor: '#444' }} />
          <List>
            <ListItem component={RouterLink} to="/trending" onClick={() => setDrawerOpen(false)} sx={{ cursor: 'pointer' }}>
              <ListItemIcon sx={{ color: '#aaa' }}>
                <FAIcon icon="fas fa-fire-flame-curved" />
              </ListItemIcon>
              <ListItemText primary="Trending" />
            </ListItem>
            <ListItem component={RouterLink} to="/fresh" onClick={() => setDrawerOpen(false)} sx={{ cursor: 'pointer' }}>
              <ListItemIcon sx={{ color: '#aaa' }}>
                <FAIcon icon="fas fa-clock" />
              </ListItemIcon>
              <ListItemText primary="Fresh" />
            </ListItem>
            <ListItem component={RouterLink} to="/top" onClick={() => setDrawerOpen(false)} sx={{ cursor: 'pointer' }}>
              <ListItemIcon sx={{ color: '#aaa' }}>
                <FAIcon icon="fas fa-chart-line" />
              </ListItemIcon>
              <ListItemText primary="Top" />
            </ListItem>
          </List>
          <Divider sx={{ backgroundColor: '#444' }} />
          <Box sx={{ p: 2 }}>
            {isAuthenticated ? (
              <>
                <Button 
                  fullWidth 
                  variant="contained" 
                  sx={{ mb: 1 }}
                  onClick={() => { navigate('/create-post'); setDrawerOpen(false); }}
                  startIcon={<FAIcon icon="fas fa-plus" />}

                >
                  Post
                </Button>
                {userData?.role === 'admin' && (
                  <Button 
                    fullWidth 
                    variant="outlined" 
                    sx={{ mb: 1 }}
                    onClick={() => { navigate('/admin'); setDrawerOpen(false); }}
                    startIcon={<FAIcon icon="fas fa-shield-halved" />}
                  >
                    Admin
                  </Button>
                )}
                <Button 
                  fullWidth 
                  variant="outlined" 
                  sx={{ mb: 1 }}
                  onClick={() => { navigate('/settings'); setDrawerOpen(false); }}
                  startIcon={<FAIcon icon="fas fa-gear" />}
                >
                  Settings
                </Button>
                <Button 
                  fullWidth 
                  variant="outlined" 
                  onClick={handleLogout}
                  color="error"
                  startIcon={<FAIcon icon="fas fa-sign-out-alt" />}
                >
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Button 
                  fullWidth 
                  variant="outlined" 
                  sx={{ mb: 1 }}
                  onClick={() => { navigate('/login'); setDrawerOpen(false); }}
                  color="primary"
                  startIcon={<FAIcon icon="fas fa-sign-in-alt" />}
                >
                  Log In
                </Button>
                <Button 
                  fullWidth 
                  variant="contained" 
                  onClick={() => { navigate('/register'); setDrawerOpen(false); }}
                >
                  Sign Up
                </Button>
              </>
            )}
          </Box>
        </Box>
      </Drawer>
      
      {renderMenu}
    </>
  );
};

export default MuiNavbar;