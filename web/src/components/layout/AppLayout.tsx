import { useState, useRef, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo } from '../custom/Logo';
import { useAuthStore } from '../../store/auth.store';
import { toast } from 'sonner';
import { 
  LayoutDashboard, 
  FileText, 
  MessageSquare, 
  Video, 
  Award, 
  Briefcase, 
  User, 
  LogOut, 
  Menu, 
  X, 
  ChevronLeft, 
  ChevronsUpDown,
  Search,
  Bell,
  Trophy,
  History,
  TrendingUp
} from 'lucide-react';

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const userMenuRef = useRef<HTMLDivElement>(null);

  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  // Close menus when route changes
  useEffect(() => {
    setMobileSidebarOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  // Click outside to close user profile menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const displayName = user?.full_name || user?.email || 'User';
  const displayInitials = getInitials(displayName);
  const displayRole = user?.preferences?.role || user?.role || 'Candidate';
  const displayEmail = user?.email || '';

  const getBreadcrumbName = (pathname: string) => {
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length <= 1) return 'Dashboard';
    const raw = parts[parts.length - 1];
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', path: '/app/dashboard', icon: LayoutDashboard },
    { id: 'resumes', label: 'Resumes', path: '/app/resumes', icon: FileText },
    { id: 'interview', label: 'AI Interview', path: '/app/interview', icon: MessageSquare },
    { id: 'video', label: 'Video Interview', path: '/app/video', icon: Video },
    { id: 'sessions', label: 'Practice Sessions', path: '/app/sessions', icon: History },
    { id: 'progress', label: 'Analytics & Progress', path: '/app/sessions/progress', icon: TrendingUp },
    { id: 'quiz', label: 'Quiz / Leaderboard', path: '/app/quiz', icon: Award },
    { id: 'jobs', label: 'Browse Jobs', path: '/app/jobs', icon: Briefcase },
    { id: 'profile', label: 'Profile', path: '/app/profile', icon: User },
  ];

  const handleLogout = () => {
    useAuthStore.getState().clearSession();
    toast.success('Logged out successfully.');
    navigate('/login');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground relative w-full text-left">
      {/* Background Radial Glow Blobs (Monochrome / White-Grey) */}
      <motion.div 
        animate={{
          x: [0, 50, -30, 0],
          y: [0, -30, 40, 0],
          scale: [1, 1.15, 0.9, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="fixed pointer-events-none rounded-full blur-[120px] opacity-[0.05] z-0"
        style={{
          top: '-200px',
          right: '-200px',
          width: '800px',
          height: '800px',
          background: 'radial-gradient(circle, #FFFFFF 0%, transparent 70%)'
        }}
      />
      <motion.div 
        animate={{
          x: [0, -60, 40, 0],
          y: [0, 40, -25, 0],
          scale: [1, 0.9, 1.1, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="fixed pointer-events-none rounded-full blur-[100px] opacity-[0.02] z-0"
        style={{
          bottom: '-300px',
          left: '-100px',
          width: '600px',
          height: '600px',
          background: 'radial-gradient(circle, #FFFFFF 0%, transparent 70%)'
        }}
      />

      {/* DESKTOP SIDEBAR */}
      <aside 
        className={`hidden md:flex flex-col bg-bg-base border-r border-border-subtle transition-all duration-300 ease-out-quart z-30 relative ${
          sidebarCollapsed ? 'w-16' : 'w-60'
        }`}
      >
        {/* Logo Section */}
        <div className="h-14 flex items-center px-4 border-b border-border-subtle justify-between overflow-hidden select-none">
          <Link to="/" className="flex items-center gap-3 shrink-0 cursor-pointer">
            <Logo size={28} className="shrink-0 text-text-prim transition-transform duration-300 hover:scale-105" />
            {!sidebarCollapsed && (
              <span className="font-heading font-bold text-base text-text-prim tracking-tight font-sans">MockAI</span>
            )}
          </Link>
          {!sidebarCollapsed && (
            <button 
              onClick={() => setSidebarCollapsed(true)}
              className="p-1 rounded hover:bg-bg-elevated text-text-muted hover:text-text-prim cursor-pointer transition-colors"
            >
              <ChevronLeft className="size-4" />
            </button>
          )}
        </div>

        {/* Collapsed State Toggle Trigger (floating or header button) */}
        {sidebarCollapsed && (
          <div className="flex justify-center py-2 border-b border-border-subtle/50">
            <button 
              onClick={() => setSidebarCollapsed(false)}
              className="p-1.5 rounded-md hover:bg-bg-elevated text-text-muted hover:text-text-prim cursor-pointer transition-colors"
            >
              <Menu className="size-4" />
            </button>
          </div>
        )}

        {/* Navigation List */}
        <nav className={`flex-1 py-4 px-2 space-y-1 ${sidebarCollapsed ? 'overflow-visible' : 'overflow-y-auto overflow-x-hidden'}`}>
          {navItems.map((item) => {
            const isActive = item.id === 'sessions'
              ? location.pathname.startsWith('/app/sessions') && !location.pathname.startsWith('/app/sessions/progress')
              : location.pathname.startsWith(item.path);
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                to={item.path}
                className={`w-full flex items-center gap-3 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 group relative ${
                  sidebarCollapsed ? 'justify-center px-0' : 'px-3'
                } ${
                  isActive
                    ? sidebarCollapsed 
                      ? 'text-text-prim bg-bg-elevated' 
                      : 'border-text-prim text-text-prim bg-bg-elevated border-l-[3px]'
                    : 'text-text-muted hover:text-text-prim hover:bg-bg-elevated'
                }`}
              >
                <span className="shrink-0">
                  <Icon className={`size-5 transition-transform group-hover:scale-105 duration-200 ${isActive ? 'text-text-prim' : 'text-text-muted'}`} />
                </span>
                {!sidebarCollapsed && <span>{item.label}</span>}
                
                {/* Collapsed Tooltip */}
                {sidebarCollapsed && (
                  <div className="absolute left-16 bg-bg-overlay border border-border-strong text-text-prim text-xs font-semibold px-2.5 py-1 rounded shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible translate-x-2 group-hover:translate-x-0 transition-all duration-200 pointer-events-none whitespace-nowrap z-50">
                    {item.label}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Info Bottom (Shadcn style with Popover user menu) */}
        <div className={`border-t border-border-subtle relative ${sidebarCollapsed ? 'p-2' : 'p-3'}`} ref={userMenuRef}>
          {/* User Menu Dropdown (Popover) */}
          <AnimatePresence>
            {userMenuOpen && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className={`absolute bottom-16 bg-zinc-950 border border-border-strong rounded-lg shadow-xl shadow-black/60 overflow-hidden divide-y divide-border-subtle z-50 py-1 ${sidebarCollapsed ? 'left-14 w-56' : 'left-3 right-3'}`}
              >
                {!sidebarCollapsed && (
                  <div className="px-3 py-2 text-left">
                    <p className="text-xs font-bold text-text-prim truncate">{displayName}</p>
                    <p className="text-[10px] text-text-muted truncate mt-0.5">{displayEmail}</p>
                  </div>
                )}
                <div className="py-1">
                  <Link 
                    to="/app/profile" 
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-sec hover:text-text-prim hover:bg-bg-elevated transition-colors text-left"
                  >
                    <User className="size-3.5" />
                    Profile Settings
                  </Link>
                  <Link 
                    to="/app/quiz/leaderboard" 
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-sec hover:text-text-prim hover:bg-bg-elevated transition-colors text-left"
                  >
                    <Trophy className="size-3.5" />
                    Global Leaderboard
                  </Link>
                  <Link 
                    to="/app/quiz?tab=history" 
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-sec hover:text-text-prim hover:bg-bg-elevated transition-colors text-left"
                  >
                    <History className="size-3.5" />
                    Quiz Recap History
                  </Link>
                </div>
                <div className="py-1">
                  <button 
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/5 transition-colors text-left cursor-pointer"
                  >
                    <LogOut className="size-3.5" />
                    Log out
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Trigger Card */}
          <div 
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className={`w-full flex items-center rounded-lg border border-transparent hover:bg-bg-elevated hover:border-border-def transition-all duration-200 cursor-pointer overflow-hidden group relative ${
              sidebarCollapsed ? 'justify-center p-1' : 'justify-between p-2'
            }`}
          >
            <div className={`flex items-center overflow-hidden ${sidebarCollapsed ? 'justify-center w-full' : 'gap-2.5'}`}>
              <div className="size-8 rounded-full bg-bg-elevated text-text-prim font-bold flex items-center justify-center border border-border-strong shrink-0 text-xs font-mono">
                {displayInitials}
              </div>
              {!sidebarCollapsed && (
                <div className="overflow-hidden leading-tight text-left">
                  <p className="text-sm font-semibold text-text-prim truncate">{displayName}</p>
                  <p className="text-[10px] text-text-muted truncate">{displayRole}</p>
                </div>
              )}
            </div>
            {!sidebarCollapsed && (
              <ChevronsUpDown className="size-4 text-text-muted shrink-0" />
            )}

            {/* Collapsed Tooltip */}
            {sidebarCollapsed && (
              <div className="absolute left-16 bg-bg-overlay border border-border-strong text-text-prim text-xs font-semibold px-2.5 py-1 rounded shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible translate-x-2 group-hover:translate-x-0 transition-all duration-200 pointer-events-none whitespace-nowrap z-50">
                {displayName}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* MOBILE DRAWER NAVIGATION (AnimatePresence Sheet) */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileSidebarOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden"
            />
            {/* Side Sheet */}
            <motion.aside 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed top-0 bottom-0 left-0 w-72 bg-bg-base border-r border-border-subtle z-50 md:hidden flex flex-col text-left"
            >
              {/* Header */}
              <div className="h-14 flex items-center justify-between px-4 border-b border-border-subtle">
                <Link to="/" className="flex items-center gap-3 select-none">
                  <Logo size={28} className="text-text-prim" />
                  <span className="font-heading font-bold text-base text-text-prim tracking-tight">MockAI</span>
                </Link>
                <button 
                  onClick={() => setMobileSidebarOpen(false)}
                  className="p-1 rounded-md hover:bg-bg-elevated text-text-muted hover:text-text-prim cursor-pointer"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* Navigation List */}
              <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                  const isActive = item.id === 'sessions'
                    ? location.pathname.startsWith('/app/sessions') && !location.pathname.startsWith('/app/sessions/progress')
                    : location.pathname.startsWith(item.path);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.id}
                      to={item.path}
                      className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-lg font-medium text-sm transition-all duration-150 ${
                        isActive
                          ? 'border-text-prim text-text-prim bg-bg-elevated border-l-[3px]'
                          : 'text-text-muted hover:text-text-prim hover:bg-bg-elevated'
                      }`}
                    >
                      <Icon className="size-5 shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              {/* Profile Bottom panel inside Drawer */}
              <div className="p-4 border-t border-border-subtle bg-bg-surface/30">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="size-9 rounded-full bg-bg-elevated text-text-prim font-bold flex items-center justify-center border border-border-strong shrink-0 text-xs font-mono">
                      {displayInitials}
                    </div>
                    <div className="overflow-hidden leading-tight">
                      <p className="text-sm font-semibold text-text-prim truncate">{displayName}</p>
                      <p className="text-[10px] text-text-muted truncate">{displayRole}</p>
                    </div>
                  </div>
                  <button 
                    onClick={handleLogout}
                    title="Log Out"
                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/5 rounded-md cursor-pointer transition-colors shrink-0"
                  >
                    <LogOut className="size-4.5" />
                  </button>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* TOPBAR */}
        <header className="h-14 bg-bg-base/80 backdrop-blur-md border-b border-border-subtle sticky top-0 z-20 flex items-center justify-between px-4 md:px-6 shrink-0">
          <div className="flex items-center gap-3">
            {/* Hamburger Button for Mobile */}
            <button 
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden p-1.5 rounded-md text-text-muted hover:text-text-prim hover:bg-bg-surface cursor-pointer"
            >
              <Menu className="size-5.5" />
            </button>
            
            <div className="flex items-center text-xs font-heading uppercase tracking-widest font-bold select-none">
              <span className="text-text-muted">MockAI</span>
              <span className="mx-2 text-text-disabled">/</span>
              <span className="text-text-prim font-extrabold">
                {getBreadcrumbName(location.pathname)}
              </span>
            </div>
          </div>

          {/* Search Trigger */}
          <div className="relative hidden sm:block">
            <button 
              onClick={() => setSearchOpen(true)}
              className="flex items-center justify-between w-64 md:w-80 h-9 bg-bg-surface border border-border-def hover:border-border-strong rounded-lg px-3 py-1.5 text-xs text-text-muted text-left transition-all duration-200 cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Search className="size-4" />
                Search...
              </span>
              <kbd className="inline-block font-mono bg-bg-elevated border border-border-strong rounded px-1.5 py-0.5 text-[10px] text-text-disabled uppercase">⌘K</kbd>
            </button>
          </div>

          {/* Topbar Right Controls */}
          <div className="flex items-center gap-3">
            {/* Search icon for mobile screen */}
            <button 
              onClick={() => setSearchOpen(true)}
              className="sm:hidden p-2 text-text-muted hover:text-text-prim rounded-md hover:bg-bg-surface cursor-pointer"
            >
              <Search className="size-5" />
            </button>

            {/* Notification Bell */}
            <button className="relative p-2 text-text-muted hover:text-text-prim rounded-md hover:bg-bg-surface cursor-pointer group">
              <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-text-prim ring-2 ring-background"></span>
              <Bell className="size-5 transition-transform group-hover:rotate-12 duration-200" />
            </button>
            
            {/* Quick avatar click navigates to profile */}
            <div 
              onClick={() => navigate('/app/profile')}
              className="size-8 rounded-full bg-bg-elevated text-text-prim font-bold flex items-center justify-center border border-border-strong select-none shadow-md shadow-black/20 text-xs font-mono cursor-pointer hover:border-text-prim transition-colors"
            >
              {displayInitials}
            </div>
          </div>
        </header>

        {/* Dynamic Nested Route Rendering */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto relative z-10">
          <Outlet />
        </main>

        {/* COMMAND DIALOG SEARCH OVERLAY (⌘K) */}
        {searchOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-20 px-4 animate-fade-in duration-200">
            <div className="w-full max-w-xl bg-bg-overlay border border-border-strong rounded-xl shadow-2xl shadow-black overflow-hidden flex flex-col max-h-[400px]">
              
              <div className="flex items-center px-4 border-b border-border-subtle bg-bg-surface gap-3">
                <Search className="size-5 text-text-muted shrink-0" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Type a command or search keywords..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-12 bg-transparent border-0 outline-none text-xs text-text-prim placeholder-text-disabled"
                />
                <button 
                  onClick={() => setSearchOpen(false)}
                  className="text-[10px] font-mono px-2 py-0.5 border border-border-strong rounded bg-bg-base text-text-muted hover:text-text-prim uppercase shrink-0"
                >
                  Esc
                </button>
              </div>

              <div className="flex-1 p-3 overflow-y-auto divide-y divide-border-subtle text-left text-xs text-text-sec">
                {[
                  { group: 'Navigation Commands', items: [
                    { name: 'Go to Dashboard', path: '/app/dashboard' },
                    { name: 'Go to Resume Library', path: '/app/resumes' },
                    { name: 'Launch AI Interview Simulator', path: '/app/interview' },
                    { name: 'Launch Video Feedback Mode', path: '/app/video' },
                    { name: 'Quiz & Global Leaderboards', path: '/app/quiz' },
                    { name: 'Browse Recommendations Jobs', path: '/app/jobs' }
                  ]},
                  { group: 'Actions & Tools', items: [
                    { name: 'Upload a new PDF resume', path: '/app/resumes' },
                    { name: 'Update user settings profile', path: '/app/profile' }
                  ]}
                ].map((grp, idx) => (
                  <div key={idx} className="py-2.5 space-y-1">
                    <p className="text-[10px] font-mono font-bold text-text-disabled uppercase tracking-wider px-2">{grp.group}</p>
                    <div className="space-y-0.5">
                      {grp.items
                        .filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map((item, iIdx) => (
                          <div
                            key={iIdx}
                            onClick={() => {
                              navigate(item.path);
                              setSearchOpen(false);
                            }}
                            className="px-2 py-2 rounded-lg hover:bg-bg-elevated hover:text-text-prim cursor-pointer flex justify-between items-center transition-colors font-medium"
                          >
                            <span>{item.name}</span>
                            <span className="text-[10px] text-text-muted font-mono bg-bg-surface px-1.5 py-0.5 rounded border border-border-def uppercase">Enter</span>
                          </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}