import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Navbar from './View/Components/Navbar';
import Settings from './View/Settings';
import Home from './View/Home';
import { AuthProvider } from './View/contexts/AuthContext';
import { ModalProvider } from './View/contexts/ModalContext';
import LoginModal from './View/Auth/LoginModal';
import RegisterModal from './View/Auth/RegisterModal';
import ForgotPasswordModal from './View/Auth/ForgotPasswordModal';
import ResetPasswordModal from './View/Auth/ResetPasswordModal';
import CreatePostModal from './View/CreatePostModal';
import PostDetailPage from './View/PostDetailPage';
import EditPostModal from './View/EditPostModal';
import Profile from './View/Account&Profile/Profile';
import Admin from './View/AdminPage';
import AdminRoute from './View/AdminRoute';
// import ErrorBoundary from './View/ErrorBoundary';
// import Comment from './View/Comments/CommentList';

const darkTheme = createTheme({
    palette: {
        mode: 'dark',
        background: {
            default: '#121212',
            paper: '#1a1a1a',
        },
    },
    components: {
        MuiCssBaseline: {
            styleOverrides: {
                body: {
                    margin: 0,
                    padding: 0,
                    backgroundColor: '#121212',
                    overflow: 'hidden',
                    boxSizing: 'border-box',
                },
                html: {
                    margin: 0,
                    padding: 0,
                    boxSizing: 'border-box',
                }
            },
        },
    },
});

// Removed unused theme variable

// Home wrapper agar bisa menerima hasil pencarian dari Navbar
function HomeWithSearch({type}: {type: 'fresh' | 'trending' | 'popular'}) {
    const location = useLocation();
    // searchResults dan searchQuery dikirim dari Navbar via navigate('/', { state: ... })
    const searchResults = location.state?.searchResults ?? null;
    const searchQuery = location.state?.searchQuery ?? '';
    return <Home searchResults={searchResults} searchQuery={searchQuery} type={type}/>;
}

function AppContent() {
    return (
        <div className="App">
            <Navbar />
            <div className="content-container" style={{ marginTop: '64px', minHeight: 'calc(100vh - 64px)' }}>
                <Routes>
                    <Route path="/" element={<HomeWithSearch type="fresh"/>} />
                    <Route path="/fresh" element={<HomeWithSearch type="fresh"/>} />
                    <Route path="/trending" element={<HomeWithSearch type="trending"/>} />
                    <Route path="/top" element={<HomeWithSearch type="popular"/>} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/post/:postId" element={<PostDetailPage />} />
                    <Route path="/profile/:username" element={<Profile />} />
                    <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
                    {/* Add other routes here */}
                </Routes>
            </div>
        </div>
    );
}

function App() {
    return (
        <AuthProvider>
            <ModalProvider>
                <Router>
                    <ThemeProvider theme={darkTheme}>
                        <CssBaseline />
                        <AppContent />
                        {/* Add all modals so they're available throughout the app */}
                        <LoginModal />
                        <RegisterModal />
                        <ForgotPasswordModal />
                        <ResetPasswordModal />
                        <CreatePostModal />
                        <EditPostModal />
                    </ThemeProvider>
                </Router>
            </ModalProvider>
        </AuthProvider>
    );
}

export default App;