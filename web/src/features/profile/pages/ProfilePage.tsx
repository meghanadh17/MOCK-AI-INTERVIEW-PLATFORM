import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User as UserIcon, 
  Mail, 
  Briefcase, 
  Calendar, 
  Edit3, 
  Save, 
  Award, 
  Trophy, 
  Flame, 
  Check, 
  Loader2, 
  Settings, 
  ShieldAlert,
  Moon,
  Sun
} from 'lucide-react';

import { useUserProfileQuery } from '../../../hooks/useAuthQueries';
import { useUpdateProfile } from '../hooks/useProfileMutations';

const avatarPresets: Record<string, string> = {
  purple: 'bg-gradient-to-br from-purple-500 to-indigo-700 text-white',
  teal: 'bg-gradient-to-br from-teal-400 to-emerald-600 text-white',
  blue: 'bg-gradient-to-br from-blue-500 to-cyan-600 text-white',
  orange: 'bg-gradient-to-br from-orange-400 to-red-600 text-white',
  red: 'bg-gradient-to-br from-rose-500 to-red-700 text-white',
  emerald: 'bg-gradient-to-br from-emerald-400 to-teal-700 text-white',
  sunset: 'bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600 text-white',
  dark: 'bg-gradient-to-br from-slate-700 to-slate-900 text-slate-100 border border-zinc-700',
};

export function getAvatarClass(avatarUrl: string | null) {
  if (!avatarUrl) return avatarPresets.dark;
  if (avatarUrl.startsWith('preset:')) {
    const key = avatarUrl.split(':')[1];
    return avatarPresets[key] || avatarPresets.dark;
  }
  return '';
}

export function ProfilePage() {
  const { data: user, isLoading, isError } = useUserProfileQuery();
  const updateProfileMutation = useUpdateProfile();
  
  const [activeTab, setActiveTab] = useState<'overview' | 'settings'>('overview');
  
  // Edit form states
  const [fullName, setFullName] = useState('');
  const [professionalRole, setProfessionalRole] = useState('Candidate');
  const [customRole, setCustomRole] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('preset:dark');
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const [isCustomAvatar, setIsCustomAvatar] = useState(false);
  
  // Preference states
  const [defaultDifficulty, setDefaultDifficulty] = useState('medium');
  const [emailReminders, setEmailReminders] = useState(true);
  const [theme, setTheme] = useState('dark');

  // Populate form states once user data loads
  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      const userRole = user.preferences?.role || user.role || 'Candidate';
      const standardRoles = ['Software Engineer', 'Product Manager', 'Data Scientist', 'UX Designer', 'QA Engineer', 'Solutions Architect', 'Candidate'];
      
      if (standardRoles.includes(userRole)) {
        setProfessionalRole(userRole);
        setCustomRole('');
      } else {
        setProfessionalRole('Other');
        setCustomRole(userRole);
      }

      const avatar = user.avatar_url || 'preset:dark';
      setSelectedAvatar(avatar);
      if (avatar.startsWith('preset:')) {
        setIsCustomAvatar(false);
        setCustomAvatarUrl('');
      } else {
        setIsCustomAvatar(true);
        setCustomAvatarUrl(avatar);
      }

      setDefaultDifficulty(user.preferences?.default_difficulty || 'medium');
      setEmailReminders(user.preferences?.email_reminders !== false);
      setTheme(user.preferences?.theme || 'dark');
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="size-10 animate-spin text-text-prim" />
        <p className="text-sm text-text-sec font-mono">Loading your profile from database...</p>
      </div>
    );
  }

  if (isError || !user) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-4 text-center max-w-md mx-auto">
        <ShieldAlert className="size-12 text-red-500" />
        <h3 className="text-lg font-bold text-text-prim">Failed to load profile</h3>
        <p className="text-xs text-text-sec">There was an issue connecting to the database server. Please check that the backend is running and try refreshing the page.</p>
      </div>
    );
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

  const displayName = fullName || user.email || 'Candidate';
  const displayInitials = getInitials(displayName);
  const userJoinedDate = user.created_at 
    ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Recently';

  const avatarClass = getAvatarClass(selectedAvatar);

  // Form submit handler
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const finalRole = professionalRole === 'Other' ? customRole : professionalRole;
    const finalAvatar = isCustomAvatar ? customAvatarUrl : selectedAvatar;
    
    const profileData = {
      full_name: fullName,
      avatar_url: finalAvatar,
      preferences: {
        ...user.preferences,
        role: finalRole,
        default_difficulty: defaultDifficulty,
        email_reminders: emailReminders,
        theme: theme,
      }
    };

    updateProfileMutation.mutate(profileData, {
      onSuccess: () => {
        setActiveTab('overview');
      }
    });
  };

  const stats = user.stats || {};
  const totalSessions = (stats.interviews_taken || 0) + (stats.quizzes_taken || 0);

  return (
    <div className="space-y-8 animate-fade-in duration-300 text-left">
      {/* Header Banner */}
      <div className="bg-bg-surface border border-border-def rounded-2xl overflow-hidden shadow-xl shadow-black/20 relative">
        <div className="h-32 bg-gradient-to-r from-zinc-800 via-slate-700 to-zinc-900 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
          <div className="absolute inset-0 bg-gradient-to-t from-bg-surface to-transparent" />
        </div>
        
        <div className="p-6 pt-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 relative">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 -mt-20 sm:-mt-16 text-center sm:text-left w-full sm:w-auto">
            {/* Avatar Preview */}
            <div className="shrink-0 relative group">
              {isCustomAvatar && customAvatarUrl ? (
                <img 
                  src={customAvatarUrl} 
                  alt={displayName} 
                  onError={() => setIsCustomAvatar(false)}
                  className="size-24 rounded-2xl border-4 border-bg-surface shadow-2xl object-cover"
                />
              ) : (
                <div className={`size-24 rounded-2xl border-4 border-bg-surface text-3xl font-black flex items-center justify-center shadow-2xl select-none font-mono ${avatarClass}`}>
                  {displayInitials}
                </div>
              )}
              <div className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                <span className="text-[10px] text-white font-mono bg-zinc-950/80 px-2 py-0.5 rounded border border-zinc-700">Editable</span>
              </div>
            </div>
            
            <div className="leading-tight pb-1 space-y-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <h2 className="text-2xl font-heading font-extrabold text-text-prim">{displayName}</h2>
                <span className="text-[10px] uppercase font-mono font-bold text-zinc-500 bg-bg-elevated px-2 py-0.5 rounded border border-border-strong self-center">
                  {user.role}
                </span>
              </div>
              <p className="text-sm text-text-sec flex flex-col sm:flex-row sm:items-center gap-y-1 gap-x-2">
                <span className="flex items-center gap-1"><Briefcase className="size-3.5" /> {user.preferences?.role || user.role || 'Candidate'}</span>
                <span className="hidden sm:inline text-zinc-600">•</span>
                <span className="flex items-center gap-1"><Calendar className="size-3.5" /> Member since {userJoinedDate}</span>
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 bg-bg-elevated p-1 rounded-xl border border-border-strong w-full md:w-auto self-stretch md:self-auto justify-center">
            <button 
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold font-mono transition-all duration-200 cursor-pointer ${activeTab === 'overview' ? 'bg-bg-surface text-text-prim shadow border border-border-def' : 'text-text-muted hover:text-text-prim'}`}
            >
              <UserIcon className="size-3.5" />
              Overview
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold font-mono transition-all duration-200 cursor-pointer ${activeTab === 'settings' ? 'bg-bg-surface text-text-prim shadow border border-border-def' : 'text-text-muted hover:text-text-prim'}`}
            >
              <Settings className="size-3.5" />
              Settings & Edit
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' ? (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="space-y-8"
          >
            {/* Dynamic Database Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { label: 'Total Sessions', val: totalSessions, icon: Award, color: 'text-blue-400' },
                { label: 'Avg Score', val: `${stats.avg_score || 0}%`, icon: Trophy, color: 'text-yellow-400' },
                { label: 'Highest score', val: `${stats.highest_score || 0}%`, icon: Trophy, color: 'text-emerald-400' },
                { label: 'Active Streak', val: `🔥 ${stats.active_streak || 0}`, icon: Flame, color: 'text-orange-500' }
              ].map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <div key={i} className="p-5 bg-bg-surface border border-border-def rounded-2xl flex flex-col justify-between space-y-4 hover:border-border-strong hover:scale-[1.02] transition-all duration-300 relative group overflow-hidden">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-mono font-bold text-text-muted uppercase tracking-wider block">{stat.label}</span>
                      <Icon className={`size-4.5 ${stat.color} group-hover:scale-110 transition-transform`} />
                    </div>
                    <span className="text-3xl font-mono font-black text-text-prim leading-none block">{stat.val}</span>
                  </div>
                );
              })}
            </div>

            {/* Profile Overview Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Account Details Card */}
              <div className="md:col-span-2 bg-bg-surface border border-border-def rounded-2xl p-6 space-y-6">
                <div className="border-b border-border-subtle pb-4 flex justify-between items-center">
                  <h3 className="text-base font-bold text-text-prim font-heading">Account Specifications</h3>
                  <button 
                    onClick={() => setActiveTab('settings')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-def hover:border-border-strong hover:bg-bg-elevated text-xs font-semibold text-text-sec hover:text-text-prim cursor-pointer transition-all"
                  >
                    <Edit3 className="size-3.5" /> Edit Profile
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 font-sans">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono font-bold text-text-muted uppercase tracking-wider">Full Name</span>
                    <p className="text-sm font-semibold text-text-prim flex items-center gap-2">
                      <UserIcon className="size-4 text-zinc-500" /> {fullName || 'Not specified'}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono font-bold text-text-muted uppercase tracking-wider">Email Address</span>
                    <p className="text-sm font-semibold text-text-prim flex items-center gap-2">
                      <Mail className="size-4 text-zinc-500" /> {user.email}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono font-bold text-text-muted uppercase tracking-wider">Professional Title</span>
                    <p className="text-sm font-semibold text-text-prim flex items-center gap-2">
                      <Briefcase className="size-4 text-zinc-500" /> {user.preferences?.role || user.role || 'Candidate'}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono font-bold text-text-muted uppercase tracking-wider">Verification Status</span>
                    <p className="text-sm font-semibold text-text-prim flex items-center gap-2">
                      <Check className="size-4 text-emerald-500" /> Verified Candidate
                    </p>
                  </div>
                </div>
              </div>

              {/* Preferences Summary Card */}
              <div className="bg-bg-surface border border-border-def rounded-2xl p-6 space-y-6">
                <div className="border-b border-border-subtle pb-4">
                  <h3 className="text-base font-bold text-text-prim font-heading">Application Preferences</h3>
                </div>

                <div className="space-y-4 text-sm font-sans">
                  <div className="flex justify-between items-center py-1.5 border-b border-border-subtle/50">
                    <span className="text-xs text-text-sec">Theme Color</span>
                    <span className="font-semibold text-xs text-text-prim font-mono capitalize">{theme} Mode</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-border-subtle/50">
                    <span className="text-xs text-text-sec">Interview Difficulty</span>
                    <span className="font-semibold text-xs text-text-prim font-mono capitalize">{defaultDifficulty}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-border-subtle/50">
                    <span className="text-xs text-text-sec">Daily Email Reminders</span>
                    <span className={`font-mono text-xs font-bold ${emailReminders ? 'text-emerald-500' : 'text-zinc-500'}`}>
                      {emailReminders ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1.5">
                    <span className="text-xs text-text-sec">Resumes Uploaded</span>
                    <span className="font-semibold text-xs text-text-prim font-mono">{stats.resumes_uploaded || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="settings"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
          >
            {/* Edit Form */}
            <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Profile Config Card */}
              <div className="md:col-span-2 bg-bg-surface border border-border-def rounded-2xl p-6 space-y-6">
                <div className="border-b border-border-subtle pb-4">
                  <h3 className="text-base font-bold text-text-prim font-heading">Configure Profile Details</h3>
                  <p className="text-xs text-text-muted mt-1">Provide your name and choose a design avatar to represent you across reports and quizzes.</p>
                </div>

                <div className="space-y-6">
                  {/* Full Name Input */}
                  <div className="space-y-2">
                    <label htmlFor="fullname" className="text-xs font-semibold text-text-sec block">Full Name</label>
                    <input 
                      id="fullname"
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Alex Kim"
                      className="w-full bg-bg-elevated border border-border-def focus:border-border-strong rounded-xl px-4 py-2.5 text-sm outline-none transition-colors text-text-prim font-sans"
                    />
                  </div>

                  {/* Professional Role Select */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="roleSelect" className="text-xs font-semibold text-text-sec block">Professional Title / Role</label>
                      <select 
                        id="roleSelect"
                        value={professionalRole}
                        onChange={(e) => setProfessionalRole(e.target.value)}
                        className="w-full bg-bg-elevated border border-border-def focus:border-border-strong rounded-xl px-4 py-2.5 text-sm outline-none transition-colors text-text-prim font-sans appearance-none"
                      >
                        <option value="Candidate">Candidate</option>
                        <option value="Software Engineer">Software Engineer</option>
                        <option value="Product Manager">Product Manager</option>
                        <option value="Data Scientist">Data Scientist</option>
                        <option value="UX Designer">UX Designer</option>
                        <option value="QA Engineer">QA Engineer</option>
                        <option value="Solutions Architect">Solutions Architect</option>
                        <option value="Other">Other (Type custom role)</option>
                      </select>
                    </div>

                    {professionalRole === 'Other' && (
                      <div className="space-y-2 animate-fade-in duration-200">
                        <label htmlFor="customRole" className="text-xs font-semibold text-text-sec block">Custom Professional Title</label>
                        <input 
                          id="customRole"
                          type="text"
                          required
                          value={customRole}
                          onChange={(e) => setCustomRole(e.target.value)}
                          placeholder="e.g. Mobile Developer"
                          className="w-full bg-bg-elevated border border-border-def focus:border-border-strong rounded-xl px-4 py-2.5 text-sm outline-none transition-colors text-text-prim font-sans"
                        />
                      </div>
                    )}
                  </div>

                  {/* Avatar Picker */}
                  <div className="space-y-4">
                    <span className="text-xs font-semibold text-text-sec block">Choose Avatar Design</span>
                    
                    <div className="flex flex-wrap items-center gap-3">
                      {Object.keys(avatarPresets).map((key) => {
                        const presetVal = `preset:${key}`;
                        const isPresetSelected = !isCustomAvatar && selectedAvatar === presetVal;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => {
                              setIsCustomAvatar(false);
                              setSelectedAvatar(presetVal);
                            }}
                            className={`size-11 rounded-xl cursor-pointer hover:scale-105 active:scale-95 transition-all flex items-center justify-center text-xs font-bold font-mono ${avatarPresets[key]} ${isPresetSelected ? 'ring-2 ring-text-prim ring-offset-2 ring-offset-bg-surface scale-105' : 'opacity-80'}`}
                          >
                            {isPresetSelected ? <Check className="size-4" /> : getInitials(displayName)}
                          </button>
                        );
                      })}
                      
                      <button
                        type="button"
                        onClick={() => setIsCustomAvatar(true)}
                        className={`px-3.5 py-3 h-11 rounded-xl cursor-pointer hover:scale-105 transition-all text-xs font-semibold font-mono border ${isCustomAvatar ? 'bg-text-prim text-bg-base border-text-prim font-bold' : 'bg-bg-elevated text-text-sec border-border-def hover:text-text-prim'}`}
                      >
                        Custom URL
                      </button>
                    </div>

                    {isCustomAvatar && (
                      <div className="space-y-2 animate-fade-in duration-200">
                        <label htmlFor="avatarUrl" className="text-xs font-semibold text-text-sec block">Custom Image URL</label>
                        <input 
                          id="avatarUrl"
                          type="url"
                          required
                          value={customAvatarUrl}
                          onChange={(e) => setCustomAvatarUrl(e.target.value)}
                          placeholder="e.g. https://images.unsplash.com/photo-..."
                          className="w-full bg-bg-elevated border border-border-def focus:border-border-strong rounded-xl px-4 py-2.5 text-sm outline-none transition-colors text-text-prim font-sans"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Preferences Config Card */}
              <div className="bg-bg-surface border border-border-def rounded-2xl p-6 flex flex-col justify-between space-y-8">
                <div className="space-y-6">
                  <div className="border-b border-border-subtle pb-4">
                    <h3 className="text-base font-bold text-text-prim font-heading">Platform Settings</h3>
                    <p className="text-xs text-text-muted mt-1">Tailor your experience across mock tests and interface defaults.</p>
                  </div>

                  <div className="space-y-6">
                    {/* Default Difficulty Select */}
                    <div className="space-y-2">
                      <label htmlFor="difficultySelect" className="text-xs font-semibold text-text-sec block">Default Difficulty</label>
                      <select 
                        id="difficultySelect"
                        value={defaultDifficulty}
                        onChange={(e) => setDefaultDifficulty(e.target.value)}
                        className="w-full bg-bg-elevated border border-border-def focus:border-border-strong rounded-xl px-4 py-2 text-xs outline-none transition-colors text-text-prim font-sans appearance-none"
                      >
                        <option value="easy">Easy (Fundamentals)</option>
                        <option value="medium">Medium (Standard)</option>
                        <option value="hard">Hard (Advanced)</option>
                        <option value="expert">Expert (Extremely rigorous)</option>
                      </select>
                    </div>

                    {/* Theme Preference Option */}
                    <div className="space-y-2">
                      <span className="text-xs font-semibold text-text-sec block">Interface Theme</span>
                      <div className="grid grid-cols-2 gap-2 bg-bg-elevated p-1 rounded-xl border border-border-strong">
                        <button
                          type="button"
                          onClick={() => setTheme('dark')}
                          className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold font-mono cursor-pointer transition-colors ${theme === 'dark' ? 'bg-bg-surface text-text-prim border border-border-def' : 'text-text-muted hover:text-text-prim'}`}
                        >
                          <Moon className="size-3.5" /> Dark
                        </button>
                        <button
                          type="button"
                          onClick={() => setTheme('light')}
                          className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold font-mono cursor-pointer transition-colors ${theme === 'light' ? 'bg-bg-surface text-text-prim border border-border-def' : 'text-text-muted hover:text-text-prim'}`}
                        >
                          <Sun className="size-3.5" /> Light
                        </button>
                      </div>
                    </div>

                    {/* Daily Reminders Toggle */}
                    <div className="flex items-center justify-between py-2 border-t border-b border-border-subtle/50">
                      <div className="space-y-0.5">
                        <span className="text-xs font-semibold text-text-prim block">Daily Practice Reminders</span>
                        <span className="text-[10px] text-text-muted font-sans block">Receive email suggestions to keep your streak.</span>
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => setEmailReminders(!emailReminders)}
                        className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer border border-transparent ${emailReminders ? 'bg-text-prim border-text-prim' : 'bg-bg-elevated border-border-def'}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 size-4.5 rounded-full bg-bg-surface transition-transform shadow ${emailReminders ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Form Buttons */}
                <div className="flex items-center gap-3 pt-4 border-t border-border-subtle">
                  <button 
                    type="submit"
                    disabled={updateProfileMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-2 bg-text-prim text-bg-base hover:bg-text-prim/90 disabled:opacity-50 py-2.5 rounded-xl text-xs font-bold font-mono transition-colors cursor-pointer shadow-lg shadow-black/15"
                  >
                    {updateProfileMutation.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <>
                        <Save className="size-3.5" /> Save Changes
                      </>
                    )}
                  </button>
                  <button 
                    type="button"
                    onClick={() => setActiveTab('overview')}
                    className="px-4 py-2.5 border border-border-def hover:border-border-strong hover:bg-bg-elevated text-xs font-bold font-mono rounded-xl text-text-sec hover:text-text-prim cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}