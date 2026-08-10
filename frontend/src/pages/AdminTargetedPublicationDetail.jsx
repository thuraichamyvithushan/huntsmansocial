import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit3, Mail, SendHorizontal, Trash2, UserRound } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { groupTargetedPublications } from '../utils/targetedPublicationGroups';
import TargetedPublicationEditModal from '../components/targeted-publications/TargetedPublicationEditModal';

const AdminTargetedPublicationDetail = () => {
    const { groupId } = useParams();
    const navigate = useNavigate();
    const decodedGroupId = decodeURIComponent(groupId || '');
    const [publications, setPublications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingGroup, setEditingGroup] = useState(null);

    const fetchPublications = async () => {
        try {
            const { data } = await api.get('/targeted-publications/admin');
            setPublications(Array.isArray(data) ? data : []);
        } catch (error) {
            toast.error('Failed to load targeted publication details');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPublications();
    }, []);

    const groupedPosts = useMemo(() => groupTargetedPublications(publications), [publications]);
    const selectedPost = groupedPosts.find((group) => group.groupId === decodedGroupId) || null;
    const selectedYesCount = selectedPost ? selectedPost.replies.filter((reply) => reply.responseChoice === 'yes').length : 0;
    const selectedNoCount = selectedPost ? selectedPost.replies.filter((reply) => reply.responseChoice === 'no').length : 0;

    const handleDelete = async () => {
        if (!selectedPost) {
            return;
        }

        if (!window.confirm('Delete this targeted publication for all selected users?')) {
            return;
        }

        try {
            await api.delete(`/targeted-publications/admin/group/${encodeURIComponent(selectedPost.groupId)}`);
            toast.success('Targeted publication deleted');
            navigate('/admin/targeted-publications/review');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete targeted publication');
        }
    };

    return (
        <div className="min-h-screen pb-20 -m-4 md:-m-10 p-4 md:p-10">
            <div className="space-y-8 md:space-y-12 max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b-4 border-black pb-8">
                    <div>
                        <h1 className="text-2xl md:text-6xl font-black text-black tracking-tighter uppercase italic">
                            HO <span className="text-primary-600">Social.</span>
                        </h1>
                        <p className="text-gray-400 font-bold uppercase tracking-[0.2em] md:tracking-[0.3em] text-[10px] md:text-xs mt-2">
                            Selected post and user replies
                        </p>
                    </div>
                    <div className="hidden md:block text-right">
                        <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Connection Status</p>
                        <p className="text-sm font-black text-green-500 uppercase tracking-tighter">Online / Secure</p>
                    </div>
                </div>

                <div className="flex items-center justify-between border-b-2 border-black pb-4">
                    <Link to="/admin/targeted-publications/review" className="inline-flex items-center gap-2 px-4 py-2 border-2 border-black bg-white hover:bg-black hover:text-white transition-all text-[10px] font-black uppercase tracking-[0.2em]">
                        <ArrowLeft size={14} />
                        Back To Posts
                    </Link>
                    <Link to="/admin/targeted-publications" className="inline-flex items-center gap-2 px-4 py-2 border-2 border-black bg-white hover:bg-black hover:text-white transition-all text-[10px] font-black uppercase tracking-[0.2em]">
                        <SendHorizontal size={14} />
                        Targeted Publish
                    </Link>
                </div>

                {loading ? (
                    <div className="p-12 text-center border-2 border-black border-dashed opacity-40">
                        <p className="text-[10px] font-black uppercase tracking-widest italic">Loading Selected Post</p>
                    </div>
                ) : !selectedPost ? (
                    <div className="p-12 text-center border-2 border-black border-dashed opacity-40">
                        <p className="text-[10px] font-black uppercase tracking-widest italic">Selected Post Not Found</p>
                    </div>
                ) : (
                    <div className="border-2 border-black bg-white overflow-hidden">
                        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 px-6 py-5 border-b border-black">
                            <div className="space-y-3">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Selected Post</p>
                                <p className="text-sm font-bold text-black">
                                    {new Date(selectedPost.createdAt).toLocaleString()}
                                </p>
                            </div>

                            <div className="flex flex-col items-end gap-3">
                                <div className="flex gap-3">
                                    <div className="border border-black px-4 py-3 min-w-[96px] bg-white">
                                        <p className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-400">Yes</p>
                                        <p className="mt-2 text-2xl font-black italic text-green-600">{selectedYesCount}</p>
                                    </div>
                                    <div className="border border-black px-4 py-3 min-w-[96px] bg-white">
                                        <p className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-400">No</p>
                                        <p className="mt-2 text-2xl font-black italic text-red-500">{selectedNoCount}</p>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setEditingGroup(selectedPost)}
                                        className="inline-flex items-center gap-2 px-4 py-2 border border-black bg-white hover:bg-black hover:text-white transition-colors text-[10px] font-black uppercase tracking-[0.2em]"
                                    >
                                        <Edit3 size={14} />
                                        Edit
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleDelete}
                                        className="inline-flex items-center gap-2 px-4 py-2 border border-black bg-white hover:bg-red-600 hover:text-white hover:border-red-600 transition-colors text-[10px] font-black uppercase tracking-[0.2em]"
                                    >
                                        <Trash2 size={14} />
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
                                <div className="space-y-5">
                                    {selectedPost.text && (
                                        <div className="border-l-4 border-black bg-gray-50 px-4 py-3 text-sm text-gray-700 whitespace-pre-wrap">
                                            {selectedPost.text}
                                        </div>
                                    )}

                                    <div className="border border-black p-4">
                                        <p className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400">Published</p>
                                        <p className="mt-2 text-sm font-bold text-black">
                                            {new Date(selectedPost.createdAt).toLocaleString()}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-5">
                                    {selectedPost.imageUrl && (
                                        <div className="border-2 border-black overflow-hidden bg-gray-50">
                                            <img src={selectedPost.imageUrl} alt="Published post" className="w-full max-h-80 object-cover" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between border-b border-black pb-3">
                                    <h3 className="text-sm md:text-lg font-black uppercase tracking-tight italic">User Replies</h3>
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                                        {selectedPost.replies.length} total
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                                    {selectedPost.replies.map((reply) => (
                                        <div key={reply._id} className="border border-black p-4 space-y-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="space-y-2 min-w-0">
                                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                                                        <UserRound size={12} />
                                                        <span>{reply.targetUser?.name || 'User'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs font-bold text-black break-all">
                                                        <Mail size={14} className="shrink-0 text-primary-600" />
                                                        <span>{reply.targetEmail}</span>
                                                    </div>
                                                </div>

                                                <span className={`px-3 py-1 text-[9px] font-black uppercase tracking-[0.25em] border border-black ${
                                                    reply.responseChoice === 'yes'
                                                        ? 'bg-green-500 text-white'
                                                        : reply.responseChoice === 'no'
                                                            ? 'bg-red-500 text-white'
                                                            : 'bg-gray-100 text-black'
                                                }`}>
                                                    {reply.responseChoice || 'pending'}
                                                </span>
                                            </div>

                                            <div className="border border-black p-3 bg-gray-50">
                                                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400">Reply</p>
                                                <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">
                                                    {reply.feedback || 'No feedback yet'}
                                                </p>
                                            </div>

                                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">
                                                {new Date(reply.createdAt).toLocaleString()}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {editingGroup && (
                <TargetedPublicationEditModal
                    group={editingGroup}
                    onClose={() => setEditingGroup(null)}
                    onSaved={async () => {
                        setEditingGroup(null);
                        await fetchPublications();
                    }}
                />
            )}
        </div>
    );
};

export default AdminTargetedPublicationDetail;
