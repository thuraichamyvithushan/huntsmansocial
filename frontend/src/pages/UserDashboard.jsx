import React, { useState, useEffect, useCallback } from 'react';
import { PlayCircle, Heart, MessageSquare, Clock, User as UserIcon, Maximize2, X } from 'lucide-react';
import api from '../utils/api';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import CommentSection from '../components/CommentSection';

const UserDashboard = () => {
    const { user: currentUser } = useAuth();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 5;

    const fetchPosts = useCallback(async () => {
        try {
            const res = await api.get('/posts/user');
            setPosts(res.data);
        } catch (error) {
            console.error('Failed to fetch posts');
            toast.error('Failed to load assignments');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchPosts(); }, [fetchPosts]);

    const handleLike = async (postId) => {
        try {
            const res = await api.patch(`/posts/${postId}/like`);
            setPosts(prev => prev.map(p => 
                p._id === postId ? { ...p, likes: res.data.likes } : p
            ));
        } catch (error) {
            toast.error('Failed to update like');
        }
    };

    return (
        <div className="min-h-screen pb-20 -m-4 md:-m-10 p-4 md:p-10">
            <div className="max-w-2xl mx-auto space-y-6">
                {/* Header */}
                <div className="border-b-4 border-black pb-6 mb-8 backdrop-blur-sm">
                    <h1 className="text-3xl md:text-5xl font-black text-black tracking-tighter uppercase italic drop-shadow-sm">
                        Latest <span className="text-primary-600">Designs.</span>
                    </h1>
                    <p className="text-black/70 font-bold uppercase tracking-[0.2em] text-[10px] mt-2">
                        Social media content tagged for you
                    </p>
                </div>

                {/* Content Feed */}
                {loading ? (
                    <div className="space-y-8">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-white border-2 border-black p-6 space-y-4 animate-pulse">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gray-200 rounded-full" />
                                    <div className="space-y-2">
                                        <div className="w-24 h-3 bg-gray-200" />
                                        <div className="w-16 h-2 bg-gray-200" />
                                    </div>
                                </div>
                                <div className="w-full h-64 bg-gray-200" />
                                <div className="space-y-2">
                                    <div className="w-full h-3 bg-gray-200" />
                                    <div className="w-3/4 h-3 bg-gray-200" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-8">
                        {posts.length === 0 ? (
                            <div className="p-16 text-center border-2 border-black border-dashed backdrop-blur-sm bg-white/20">
                                <Clock size={40} className="mx-auto mb-4 text-black" />
                                <p className="text-[10px] font-black uppercase tracking-widest">No assignments found</p>
                            </div>
                        ) : (
                            <>
                                {posts.slice(0, currentPage * ITEMS_PER_PAGE).map((post, index) => (
                                    <PostItem
                                        key={post._id}
                                        post={post}
                                        index={index}
                                        currentUser={currentUser}
                                        onLike={handleLike}
                                    />
                                ))}
                                
                                {posts.length > currentPage * ITEMS_PER_PAGE && (
                                    <button
                                        onClick={() => setCurrentPage(prev => prev + 1)}
                                        className="w-full py-4 border-2 border-black font-black uppercase tracking-widest text-xs hover:bg-black hover:text-white transition-all shadow-[4px_4px_0px_#000]"
                                    >
                                        Load More Assignments
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

/* ── PostItem ────────────────────────────────────────────────── */
import { useNavigate } from 'react-router-dom';

const PostItem = ({ post, index, currentUser, onLike }) => {
    const navigate = useNavigate();
    const [isLocalNew, setIsLocalNew] = useState(post.isNew);

    const markAsRead = async () => {
        if (!isLocalNew) return;
        try {
            await api.put('/notifications/read', { id: post._id, type: 'new_assignment' });
            setIsLocalNew(false);
        } catch (err) {
            console.error('Failed to mark as read');
        }
    };

    const handleNavigate = () => {
        markAsRead();
        navigate(`/post/${post._id}`);
    };

    const isLiked = post.likes?.some(id => (id._id || id).toString() === currentUser?._id);
    const mediaList = post.media && post.media.length > 0
        ? post.media
        : post.mediaUrl ? [{ url: post.mediaUrl, type: post.mediaType }] : [];
    
    const firstMedia = mediaList[0] || {};

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`backdrop-blur-md bg-white/70 border-2 border-black shadow-[8px_8px_0px_rgba(0,0,0,0.7)] overflow-hidden transition-all ${isLocalNew ? 'ring-2 ring-primary-600 ring-offset-2' : ''}`}
        >
            {/* Post Header */}
            <div className="p-4 flex items-center justify-between border-b border-black/10 bg-white/30">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-black border-2 border-black">
                        {post.createdBy?.name?.charAt(0) || <UserIcon size={18} />}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h4 className="text-xs font-black uppercase tracking-tight text-black">
                                {post.createdBy?.name || 'Admin'}
                            </h4>
                            {isLocalNew && (
                                <span className="bg-primary-600 text-white text-[7px] font-black px-1.5 py-0.5 uppercase tracking-widest animate-pulse">
                                    New
                                </span>
                            )}
                        </div>
                        <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">
                            {new Date(post.createdAt).toLocaleDateString()} • HO SOCIAL
                        </p>
                    </div>
                </div>
            </div>

            {/* Post Content */}
            <div className="p-4 md:p-6 space-y-4">
                <div className="space-y-2 cursor-pointer" onClick={handleNavigate}>
                    <h3 className="text-xl md:text-2xl font-black uppercase tracking-tighter leading-none italic hover:text-primary-600 transition-colors">
                        {post.title}
                    </h3>
                    <p className="text-xs text-gray-600 leading-relaxed font-medium line-clamp-2">
                        {post.description}
                    </p>
                </div>

                {/* Media Container */}
                {firstMedia.url && (
                    <div 
                        className="relative aspect-video bg-black border-2 border-black group cursor-pointer overflow-hidden"
                        onClick={handleNavigate}
                    >
                        {firstMedia.type === 'video' ? (
                            <div className="w-full h-full flex items-center justify-center">
                                <video 
                                    src={firstMedia.url?.startsWith('http') ? firstMedia.url : `http://localhost:5000${firstMedia.url}`}
                                    className="w-full h-full object-contain"
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                                    <PlayCircle size={48} className="text-white opacity-80 group-hover:scale-110 transition-transform" />
                                </div>
                            </div>
                        ) : (
                            <img
                                src={firstMedia.url?.startsWith('http') ? firstMedia.url : `http://localhost:5000${firstMedia.url}`}
                                alt={post.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                            />
                        )}
                        
                        {/* Media Count Badge */}
                        {mediaList.length > 1 && (
                            <div className="absolute top-3 right-3 px-2 py-1 bg-black text-white text-[8px] font-black uppercase tracking-widest border border-white/20 shadow-lg flex items-center gap-1.5 backdrop-blur-sm">
                                <span>1 / {mediaList.length}</span>
                            </div>
                        )}

                        <div className="absolute inset-0 bg-primary-600/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="bg-black text-white text-[8px] font-black uppercase tracking-[0.3em] px-4 py-2 border border-white/20">
                                View Full Details
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Engagement Bar - Simplified */}
            <div className="px-4 py-3 flex items-center justify-between border-t border-black/10 bg-white/30">
                <div className="flex items-center gap-6">
                    <button 
                        onClick={() => onLike(post._id)}
                        className={`flex items-center gap-2 group transition-colors ${isLiked ? 'text-primary-600' : 'text-black hover:text-primary-600'}`}
                    >
                        <Heart size={18} fill={isLiked ? 'currentColor' : 'none'} className={isLiked ? 'scale-110' : 'group-hover:scale-110 transition-transform'} />
                        <span className="text-[10px] font-black uppercase tracking-widest">{post.likes?.length || 0}</span>
                    </button>
                    <div className="flex items-center gap-2 text-black/40">
                        <MessageSquare size={18} />
                        <span className="text-[10px] font-black uppercase tracking-widest">
                            {post.commentCount || 0}
                        </span>
                    </div>
                </div>
                <button 
                    onClick={handleNavigate}
                    className="text-[8px] font-black uppercase tracking-widest text-primary-600 hover:underline"
                >
                    Details & Comments →
                </button>
            </div>
        </motion.div>
    );
};

export default UserDashboard;
