import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
    Users, FileText, CheckCircle, Clock,
    ArrowRight, PlusSquare, MessageSquare,
    Archive, ArchiveRestore, Trash2, PlayCircle, Edit3, X as CloseIcon, UserPlus, Search,
    ChevronLeft, ChevronRight
} from 'lucide-react';
import api from '../utils/api';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const TABS = [
    { key: 'active', label: 'Live Posts' },
    { key: 'archive', label: 'Archived' },
];

const ITEMS_PER_PAGE = 6;

const AdminDashboard = () => {
    const [searchParams] = useSearchParams();
    const initialTab = searchParams.get('tab') || 'active';

    const [stats, setStats] = useState({ totalUsers: 0, pendingReview: 0, totalPosts: 0, activeAssignments: 0 });
    const [recentPending, setRecentPending] = useState([]);
    const [recentActivity, setRecentActivity] = useState([]);
    const [activePosts, setActivePosts] = useState([]);
    const [archivedPosts, setArchivedPosts] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [loadingPosts, setLoadingPosts] = useState(true);
    const [tab, setTab] = useState(initialTab);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [editingPost, setEditingPost] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    // Update tab if URL param changes
    useEffect(() => {
        const t = searchParams.get('tab');
        if (t && (t === 'active' || t === 'archive')) {
            setTab(t);
        }
        setCurrentPage(1); // Reset page on tab change
    }, [searchParams]);

    // Reset page on search
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    /* ── Fetch stats + pending users ── */
    useEffect(() => {
        const fetchStats = async () => {
            try {
                const usersRes = await api.get('/admin/users');
                const allUsersData = Array.isArray(usersRes.data) ? usersRes.data : [];
                setAllUsers(allUsersData.filter(u => u.status === 'approved' && u.role === 'user'));
                const pending = allUsersData.filter(u => u.status === 'pending');
                setStats(prev => ({
                    ...prev,
                    totalUsers: allUsersData.filter(u => u.status === 'approved').length, // Count only approved members as "Total Members"
                }));
                setRecentPending(pending.slice(0, 3));
            } catch { console.error('Failed to fetch user stats'); }
        };

        const fetchActivity = async () => {
            try {
                const { data } = await api.get('/posts/admin/recent-activity');
                setRecentActivity(Array.isArray(data) ? data : []);
            } catch { console.error('Failed to fetch recent activity'); }
        };

        fetchStats();
        fetchActivity();
    }, []);

    /* ── Fetch active + archived posts ── */
    const fetchPosts = useCallback(async () => {
        setLoadingPosts(true);
        try {
            const [activeRes, archivedRes] = await Promise.all([
                api.get('/posts/admin'),
                api.get('/posts/admin/archived')
            ]);
            setActivePosts(Array.isArray(activeRes.data) ? activeRes.data : []);
            setArchivedPosts(Array.isArray(archivedRes.data) ? archivedRes.data : []);
            const activeData = Array.isArray(activeRes.data) ? activeRes.data : [];
            const archivedData = Array.isArray(archivedRes.data) ? archivedRes.data : [];
            const all = [...activeData, ...archivedData];
            setStats(prev => ({
                ...prev,
                totalPosts: all.length,
                activeAssignments: activeRes.data.length,
                pendingReview: activeRes.data.filter(p => !p.totalReplies || p.totalReplies === 0).length
            }));
        } catch { console.error('Failed to fetch posts'); }
        finally { setLoadingPosts(false); }
    }, []);

    useEffect(() => { fetchPosts(); }, [fetchPosts]);

    /* ── Archive ── */
    const handleArchive = async (postId) => {
        try {
            await api.patch(`/posts/${postId}/archive`);
            const post = activePosts.find(p => p._id === postId);
            setActivePosts(prev => prev.filter(p => p._id !== postId));
            if (post) setArchivedPosts(prev => [post, ...prev]);
            toast.success('Moved to Content Archive');
        } catch { toast.error('Failed to archive'); }
    };

    /* ── Unarchive ── */
    const handleUnarchive = async (postId) => {
        try {
            await api.patch(`/posts/${postId}/unarchive`);
            const post = archivedPosts.find(p => p._id === postId);
            setArchivedPosts(prev => prev.filter(p => p._id !== postId));
            if (post) setActivePosts(prev => [post, ...prev]);
            toast.success('Restored to Live Posts');
        } catch { toast.error('Failed to unarchive'); }
    };

    /* ── Delete ── */
    const handleDelete = async (postId) => {
        try {
            await api.delete(`/posts/${postId}`);
            setActivePosts(prev => prev.filter(p => p._id !== postId));
            setArchivedPosts(prev => prev.filter(p => p._id !== postId));
            setDeleteConfirm(null);
            toast.success('Post deleted');
        } catch { toast.error('Failed to delete'); }
    };

    const posts = (tab === 'active' ? activePosts : archivedPosts).filter(post => {
        const titleMatch = post.title.toLowerCase().includes(searchTerm.toLowerCase());
        const userMatch = post.assignedUsers?.some(u =>
            u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
        return titleMatch || userMatch;
    });

    const totalPages = Math.ceil(posts.length / ITEMS_PER_PAGE);
    const paginatedPosts = posts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const totalItems = activePosts.length + archivedPosts.length;

    const statCards = [
        { title: 'Approved Members', value: stats.totalUsers, icon: Users, color: 'text-black' },
        { title: 'Pending Review', value: stats.pendingReview, icon: Clock, color: 'text-primary-600' },
        { title: 'Total Posts', value: stats.totalPosts, icon: FileText, color: 'text-black' },
        { title: 'Live Posts', value: stats.activeAssignments, icon: CheckCircle, color: 'text-black' },
    ];

    return (
        <div className="min-h-screen pb-20 -m-4 md:-m-10 p-4 md:p-10">
            <div className="space-y-8 md:space-y-12 max-w-7xl mx-auto">

            {/* ── Header ─────────────────────────────────────────── */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b-4 border-black pb-8">
                <div>
                    <h1 className="text-2xl md:text-6xl font-black text-black tracking-tighter uppercase italic">
                        HO <span className="text-primary-600">Social.</span>
                    </h1>
                    <p className="text-gray-400 font-bold uppercase tracking-[0.2em] md:tracking-[0.3em] text-[10px] md:text-xs mt-2">
                        Manage designs, tag members & track engagement
                    </p>
                </div>
                <div className="hidden md:block text-right">
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Connection Status</p>
                    <p className="text-sm font-black text-green-500 uppercase tracking-tighter">Online / Secure</p>
                </div>
            </div>

            {/* ── Stat Cards ─────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border-x border-t border-black">
                {statCards.map((card, index) => (
                    <motion.div key={index} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.1 }}
                        className="p-6 md:p-10 border-b border-r border-black hover:bg-black hover:text-white transition-all group relative overflow-hidden"
                    >
                        <div className="relative z-10">
                            <p className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] mb-4 opacity-60 group-hover:opacity-100">{card.title}</p>
                            <div className="flex items-baseline gap-2 md:gap-3">
                                <h3 className="text-3xl md:text-5xl font-black italic">{card.value}</h3>
                                <card.icon size={16} className={`${card.color} group-hover:text-primary-600 transition-colors`} />
                            </div>
                        </div>
                        <div className="absolute -bottom-2 -right-2 md:-bottom-4 md:-right-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <card.icon size={100} />
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* ── Quick Flow + Pending ────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="lg:col-span-2 space-y-8">
                    <div className="flex items-center justify-between border-b-2 border-black pb-4">
                        <h2 className="text-lg md:text-xl font-black uppercase tracking-tighter italic">Recent Activity</h2>
                        <Link to="/admin/users" className="text-[10px] font-black text-gray-400 hover:text-black uppercase tracking-widest transition-colors">View All</Link>
                    </div>
                    <div className="space-y-4">
                        {recentActivity.length === 0 ? (
                            <div className="p-12 text-center border-2 border-black border-dashed opacity-20">
                                <p className="text-[10px] font-black uppercase tracking-widest italic">All Clear // No Recent Activity</p>
                            </div>
                        ) : (
                            recentActivity.map((post, i) => (
                                <Link to={`/post/${post._id}`} key={post._id} className="group flex items-center gap-4 md:gap-6 p-4 md:p-6 border-2 border-transparent hover:border-black transition-all bg-white">
                                    <div className="w-10 h-10 md:w-12 md:h-12 bg-black text-white flex items-center justify-center font-black text-[10px] md:text-xs group-hover:bg-primary-600 transition-colors shrink-0 italic">
                                        {post.unreadReplies > 0 ? 'NEW' : `0${i + 1}`}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <p className="text-xs md:text-sm font-black uppercase tracking-tight truncate">{post.title}</p>
                                            {post.unreadReplies > 0 && <span className="bg-primary-600 text-white text-[7px] font-black px-1.5 py-0.5 uppercase tracking-widest">New {post.unreadReplies}</span>}
                                        </div>
                                        <p className="text-[8px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">
                                            Commented by {post.lastRepliedBy} • {new Date(post.lastActivity).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {post.totalReplies} Comments
                                        </p>
                                    </div>
                                    <ArrowRight className="opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 transition-all text-primary-600 shrink-0" size={18} />
                                </Link>
                            ))
                        )}
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="flex items-center justify-between border-b-2 border-black pb-4">
                        <h2 className="text-lg md:text-xl font-black uppercase tracking-tighter italic">Quick Flow</h2>
                    </div>
                    <div className="space-y-4">
                        <Link to="/admin/create-post" className="group flex items-center justify-between p-4 md:p-6 border-2 border-black bg-white hover:bg-black transition-all">
                            <div className="flex items-center gap-4">
                                <div className="p-2 md:p-3 bg-gray-100 group-hover:bg-primary-600 transition-colors">
                                    <PlusSquare size={20} className="text-black group-hover:text-white" />
                                </div>
                                <div>
                                    <p className="text-xs md:text-sm font-black uppercase tracking-tight group-hover:text-white transition-colors">New Post</p>
                                    <p className="text-[8px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Upload design & tag members</p>
                                </div>
                            </div>
                            <ArrowRight size={18} className="text-primary-600 opacity-0 group-hover:opacity-100 transition-all" />
                        </Link>
                        <Link to="/admin/users" className="group flex items-center justify-between p-4 md:p-6 border-2 border-black bg-white hover:bg-black transition-all">
                            <div className="flex items-center gap-4">
                                <div className="p-2 md:p-3 bg-gray-100 group-hover:bg-primary-600 transition-colors">
                                    <Users size={20} className="text-black group-hover:text-white" />
                                </div>
                                <div>
                                    <p className="text-xs md:text-sm font-black uppercase tracking-tight group-hover:text-white transition-colors">Member Directory</p>
                                    <p className="text-[8px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Manage tagged members</p>
                                </div>
                            </div>
                            <ArrowRight size={18} className="text-primary-600 opacity-0 group-hover:opacity-100 transition-all" />
                        </Link>
                    </div>
                </div>
            </div>

            {/* ── Assignments with Tabs ───────────────────────────── */}
            <div className="space-y-0">
                {/* Header row */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b-4 border-black pb-8 mb-0">
                    <div>
                        <h1 className="text-2xl md:text-4xl font-black text-black tracking-tighter uppercase italic">
                            Manage <span className="text-primary-600">Posts.</span>
                        </h1>
                        <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-[10px] md:text-xs mt-2">
                            Social media designs shared with tagged members
                        </p>
                    </div>
                    <div className="hidden md:block text-right">
                        <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Total Posts</p>
                        <p className="text-sm font-black text-primary-600 uppercase tracking-tighter">{totalItems} Posts</p>
                    </div>
                </div>

                {/* Search and Tabs */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-8 border-b-2 border-black">
                    <div className="flex">
                        {TABS.map(t => (
                            <button key={t.key} onClick={() => setTab(t.key)}
                                className={`relative px-6 md:px-10 py-3 md:py-4 text-[10px] md:text-xs font-black uppercase tracking-[0.3em] transition-all ${tab === t.key ? 'bg-black text-white' : 'bg-white text-gray-400 hover:text-black'
                                    }`}
                            >
                                {t.label}
                                {t.key === 'active' && activePosts.length > 0 && (
                                    <span className={`ml-2 px-1.5 py-0.5 text-[8px] font-black ${tab === t.key ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                        {activePosts.length}
                                    </span>
                                )}
                                {t.key === 'archive' && archivedPosts.length > 0 && (
                                    <span className={`ml-2 px-1.5 py-0.5 text-[8px] font-black ${tab === t.key ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                        {archivedPosts.length}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="flex-1 max-w-md pb-2 md:pb-0 px-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                            <input
                                type="text"
                                placeholder="SEARCH BY TITLE OR MEMBER EMAIL..."
                                className="w-full bg-transparent border-b border-black/10 focus:border-black py-2 pl-10 pr-4 text-[10px] font-black uppercase tracking-widest outline-none transition-colors"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Tab body */}
                {loadingPosts ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border-t border-l border-black mt-6">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="bg-gray-100 animate-pulse h-48 border-b border-r border-black" />
                        ))}
                    </div>
                ) : (
                    <AnimatePresence mode="wait">
                        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="mt-6">
                            {posts.length === 0 ? (
                                <div className="p-16 md:p-24 text-center border-2 border-black border-dashed opacity-20">
                                    {tab === 'active' ? (
                                        <>
                                            <Clock size={40} className="mx-auto mb-4" />
                                            <p className="text-[10px] font-black uppercase tracking-widest">No active assignments</p>
                                        </>
                                    ) : (
                                        <>
                                            <Archive size={40} className="mx-auto mb-4" />
                                            <p className="text-[10px] font-black uppercase tracking-widest">Content archive is empty</p>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-8">
                                    <div className={`grid grid-cols-1 gap-0 border-t border-l border-black ${tab === 'archive' ? 'md:grid-cols-2 lg:grid-cols-3' : 'md:grid-cols-2'}`}>
                                        <AnimatePresence>
                                            {paginatedPosts.map((post, index) => (
                                                <AdminPostCard
                                                    key={post._id}
                                                    post={post}
                                                    index={index}
                                                    archived={tab === 'archive'}
                                                    deleteConfirm={deleteConfirm}
                                                    onArchive={handleArchive}
                                                    onUnarchive={handleUnarchive}
                                                    onEdit={() => setEditingPost(post)}
                                                    onDeleteRequest={setDeleteConfirm}
                                                    onDeleteConfirm={handleDelete}
                                                    onDeleteCancel={() => setDeleteConfirm(null)}
                                                />
                                            ))}
                                        </AnimatePresence>
                                    </div>

                                    {/* Pagination UI */}
                                    {totalPages > 1 && (
                                        <div className="flex items-center justify-center gap-4 py-8 border-t-2 border-black">
                                            <button
                                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                disabled={currentPage === 1}
                                                className="p-2 border-2 border-black hover:bg-black hover:text-white transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-black"
                                            >
                                                <ChevronLeft size={20} />
                                            </button>

                                            <div className="flex items-center gap-2">
                                                {[...Array(totalPages)].map((_, i) => (
                                                    <button
                                                        key={i + 1}
                                                        onClick={() => setCurrentPage(i + 1)}
                                                        className={`w-10 h-10 border-2 border-black text-xs font-black uppercase tracking-tighter transition-all ${currentPage === i + 1 ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'
                                                            }`}
                                                    >
                                                        {i + 1}
                                                    </button>
                                                ))}
                                            </div>

                                            <button
                                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                                disabled={currentPage === totalPages}
                                                className="p-2 border-2 border-black hover:bg-black hover:text-white transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-black"
                                            >
                                                <ChevronRight size={20} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                )}
            </div>

            {/* ── Edit Modal ─────────────────────────────────────── */}
            <AnimatePresence>
                {editingPost && (
                    <EditModal
                        post={editingPost}
                        allUsers={allUsers}
                        onClose={() => setEditingPost(null)}
                        onUpdate={(updated) => {
                            setActivePosts(prev => prev.map(p => p._id === updated._id ? updated : p));
                            setArchivedPosts(prev => prev.map(p => p._id === updated._id ? updated : p));
                            setEditingPost(null);
                        }}
                    />
                )}
            </AnimatePresence>
            </div>
        </div>
    );
};

/* ── EditModal ───────────────────────────────────────────────── */
const EditModal = ({ post, allUsers, onClose, onUpdate }) => {
    const [title, setTitle] = useState(post.title);
    const [description, setDescription] = useState(post.description);
    const [selectedUsers, setSelectedUsers] = useState(post.assignedUsers?.map(u => u._id) || []);
    const [loading, setLoading] = useState(false);

    const [userSearch, setUserSearch] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const toggleUser = (userId) => {
        setSelectedUsers(prev =>
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
        setUserSearch('');
    };

    const filteredUsers = allUsers.filter(user =>
        (user.name.toLowerCase().includes(userSearch.toLowerCase()) ||
            user.email.toLowerCase().includes(userSearch.toLowerCase())) &&
        !selectedUsers.includes(user._id)
    );

    const selectedUsersData = allUsers.filter(u => selectedUsers.includes(u._id));

    const handleUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data } = await api.put(`/posts/${post._id}`, {
                title,
                description,
                assignedUsers: JSON.stringify(selectedUsers)
            });
            // Re-populate data for UI (since backend returns IDs primarily)
            const updatedForUI = {
                ...data,
                assignedUsers: allUsers.filter(u => selectedUsers.includes(u._id))
            };
            onUpdate(updatedForUI);
            toast.success('Assignment updated');
        } catch (error) {
            toast.error('Failed to update assignment');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative w-full max-w-2xl bg-white border-2 border-black overflow-hidden flex flex-col max-h-[90vh]">
                <div className="bg-black p-4 flex items-center justify-between text-white">
                    <h3 className="text-xs font-black uppercase tracking-widest italic">Modify Assignment</h3>
                    <button onClick={onClose} className="hover:text-primary-600 transition-colors"><CloseIcon size={20} /></button>
                </div>

                <form onSubmit={handleUpdate} className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 custom-scrollbar">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em]">Assignment Title</label>
                        <input type="text" required className="w-full p-3 border-2 border-black text-sm font-bold" value={title} onChange={e => setTitle(e.target.value)} />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em]">Instructions</label>
                        <textarea required className="w-full p-3 border-2 border-black text-sm font-bold min-h-[120px] resize-none" value={description} onChange={e => setDescription(e.target.value)} />
                    </div>

                    <div className="space-y-3 relative">
                        <div className="flex items-center justify-between border-b border-black/10 pb-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em]">Re-assign Members</label>
                            <span className="text-[10px] text-primary-600 font-bold uppercase">{selectedUsers.length} Assigned</span>
                        </div>

                        {/* Search Input */}
                        <div className="relative">
                            <Search
                                className="absolute top-1/2 -translate-y-1/2 text-gray-400"
                                size={14}
                                style={{ left: '16px' }}
                            />
                            <input
                                type="text"
                                placeholder="TYPE NAME OR EMAIL TO FIND MEMBERS..."
                                className="w-full p-3 border-2 border-black text-[10px] font-black uppercase tracking-widest outline-none focus:border-primary-600 transition-colors"
                                style={{ paddingLeft: '48px' }}
                                value={userSearch}
                                onChange={(e) => {
                                    setUserSearch(e.target.value);
                                    setIsDropdownOpen(true);
                                }}
                                onFocus={() => setIsDropdownOpen(true)}
                            />

                            {/* Dropdown Suggestions */}
                            {isDropdownOpen && userSearch && (
                                <div className="absolute z-[110] left-0 right-0 top-full mt-1 bg-white border-2 border-black shadow-[8px_8px_0px_#000] max-h-[160px] overflow-y-auto custom-scrollbar">
                                    {filteredUsers.length === 0 ? (
                                        <div className="p-4 text-[10px] font-black uppercase text-gray-400">No matches found</div>
                                    ) : (
                                        filteredUsers.map(user => (
                                            <button
                                                key={user._id}
                                                type="button"
                                                onClick={() => {
                                                    toggleUser(user._id);
                                                    setIsDropdownOpen(false);
                                                }}
                                                className="w-full flex items-center justify-between p-4 hover:bg-black hover:text-white transition-colors text-left border-b border-black/5 last:border-0"
                                            >
                                                <div>
                                                    <div className="text-[10px] font-black uppercase tracking-tighter italic">{user.name}</div>
                                                    <div className="text-[8px] font-bold opacity-50 tracking-widest">{user.email}</div>
                                                </div>
                                                <UserPlus size={12} />
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Selected Chips */}
                        <div className="flex flex-wrap gap-2 mt-8">
                            {selectedUsersData.map(user => (
                                <div key={user._id} className="flex items-center gap-2 bg-black text-white px-3 py-1.5 flex-wrap">
                                    <span className="text-[9px] font-black uppercase tracking-tighter italic">{user.name}</span>
                                    <button
                                        type="button"
                                        onClick={() => toggleUser(user._id)}
                                        className="hover:text-primary-600 transition-colors"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            ))}
                            {selectedUsers.length === 0 && (
                                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest italic py-2">No members assigned.</p>
                            )}
                        </div>
                    </div>
                </form>

                <div className="p-4 border-t border-black bg-gray-50 flex gap-4">
                    <button type="button" onClick={onClose} className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest border-2 border-black hover:bg-black hover:text-white transition-all">Cancel</button>
                    <button type="button" onClick={handleUpdate} disabled={loading} className="flex-[2] py-4 bg-primary-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-primary-700 transition-all flex items-center justify-center gap-2">
                        {loading ? <Loader2 className="animate-spin" size={16} /> : <><Edit3 size={14} /> Update Assignment</>}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

/* ── AdminPostCard ───────────────────────────────────────────── */
const AdminPostCard = ({ post, index, archived, deleteConfirm, onArchive, onUnarchive, onEdit, onDeleteRequest, onDeleteConfirm, onDeleteCancel }) => {
    const firstMedia = post.media?.[0] || { url: post.mediaUrl, type: post.mediaType };
    const mediaCount = post.media?.length || (post.mediaUrl ? 1 : 0);
    const isConfirming = deleteConfirm === post._id;
    const [busy, setBusy] = useState(false);

    const handleArchiveClick = async (e) => {
        e.preventDefault(); e.stopPropagation();
        if (busy) return;
        setBusy(true);
        try { archived ? await onUnarchive(post._id) : await onArchive(post._id); }
        finally { setBusy(false); }
    };

    return (
        <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: archived ? 0.75 : 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: index * 0.07 }}
            className="group border-b border-r border-black relative overflow-hidden bg-white hover:bg-gray-50 transition-colors"
        >
            {/* Thumbnail row */}
            <Link to={`/post/${post._id}`} className="flex items-start gap-4 p-4 md:p-6">
                <div className="w-20 h-14 shrink-0 bg-gray-100 overflow-hidden border border-black/10">
                    {firstMedia.url ? (
                        firstMedia.type === 'image'
                            ? <img src={firstMedia.url?.startsWith('http') ? firstMedia.url : `http://localhost:5000${firstMedia.url}`} className="w-full h-full object-cover" alt="" />
                            : <div className="w-full h-full bg-gray-900 flex items-center justify-center"><PlayCircle size={18} className="text-white" /></div>
                    ) : <div className="w-full h-full bg-gray-100" />}
                </div>

                <div className="flex-1 min-w-0">
                    <p className="text-xs font-black uppercase tracking-tight truncate">{post.title}</p>
                    <p className="text-[8px] text-gray-400 uppercase tracking-widest mt-1 line-clamp-2">{post.description}</p>

                    {/* User Details */}
                    <div className="mt-3 flex flex-wrap gap-1">
                        {post.assignedUsers?.map(u => (
                            <div key={u._id} className="group/user relative">
                                <div className="px-1.5 py-0.5 bg-gray-100 text-[7px] font-black uppercase tracking-tighter text-gray-500 border border-transparent hover:border-black transition-all cursor-default">
                                    {u.name.split(' ')[0]}
                                </div>
                                <div className="absolute bottom-full left-0 mb-1 hidden group-hover/user:block z-20 bg-black text-white text-[7px] font-bold uppercase tracking-widest px-2 py-1 whitespace-nowrap">
                                    {u.name} • {u.email}
                                </div>
                            </div>
                        ))}
                        {(!post.assignedUsers || post.assignedUsers.length === 0) && (
                            <span className="text-[7px] text-gray-300 uppercase italic">No members assigned</span>
                        )}
                    </div>
                </div>

                {post.unreadReplies > 0 && (
                    <div className="flex items-center gap-1 bg-primary-600 text-white px-2 py-1 shrink-0 self-start">
                        <MessageSquare size={10} />
                        <span className="text-[9px] font-black">{post.unreadReplies}</span>
                    </div>
                )}
            </Link>

            {/* Action Bar */}
            <div className="flex items-center gap-2 px-4 md:px-6 pb-4 border-t border-black/5 pt-3">
                {/* Archive / Unarchive */}
                <button onClick={handleArchiveClick} disabled={busy}
                    title={archived ? 'Restore to Active' : 'Move to Archive'}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-[8px] font-black uppercase tracking-widest transition-all disabled:opacity-40 ${archived ? 'bg-primary-600 text-white hover:bg-primary-700' : 'bg-gray-100 text-gray-600 hover:bg-black hover:text-white'
                        }`}
                >
                    {archived ? <><ArchiveRestore size={11} /> Restore</> : <><Archive size={11} /> Archive</>}
                </button>

                {/* Edit */}
                {!archived && (
                    <button onClick={(e) => { e.preventDefault(); onEdit(); }}
                        title="Edit assignment"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-black text-[8px] font-black uppercase tracking-widest hover:bg-black hover:text-white transition-all"
                    >
                        <Edit3 size={11} /> Edit
                    </button>
                )}

                {/* Delete */}
                <div className="ml-auto flex items-center gap-1">
                    {isConfirming ? (
                        <>
                            <button onClick={(e) => { e.preventDefault(); onDeleteConfirm(post._id); }}
                                className="px-3 py-1.5 bg-red-600 text-white text-[8px] font-black uppercase tracking-widest hover:bg-red-700 transition-colors"
                            >Confirm Delete</button>
                            <button onClick={(e) => { e.preventDefault(); onDeleteCancel(); }}
                                className="px-3 py-1.5 bg-gray-100 text-black text-[8px] font-black uppercase tracking-widest hover:bg-gray-200 transition-colors"
                            >Cancel</button>
                        </>
                    ) : (
                        <button onClick={(e) => { e.preventDefault(); onDeleteRequest(post._id); }}
                            title="Delete assignment"
                            className="p-2 text-gray-300 hover:bg-red-600 hover:text-white transition-all"
                        >
                            <Trash2 size={13} />
                        </button>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export default AdminDashboard;
