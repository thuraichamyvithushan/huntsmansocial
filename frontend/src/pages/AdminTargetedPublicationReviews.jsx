import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock3, Edit3, SendHorizontal, Trash2, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { groupTargetedPublications } from '../utils/targetedPublicationGroups';
import TargetedPublicationEditModal from '../components/targeted-publications/TargetedPublicationEditModal';

const AdminTargetedPublicationReviews = () => {
    const [publications, setPublications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingGroup, setEditingGroup] = useState(null);

    const fetchPublications = async () => {
        try {
            const { data } = await api.get('/targeted-publications/admin');
            const items = Array.isArray(data) ? data : [];
            setPublications(items);
        } catch (error) {
            toast.error('Failed to load targeted publication reviews');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPublications();
    }, []);

    const handleDelete = async (groupId) => {
        if (!window.confirm('Delete this targeted publication for all selected users?')) {
            return;
        }

        try {
            await api.delete(`/targeted-publications/admin/group/${encodeURIComponent(groupId)}`);
            toast.success('Targeted publication deleted');
            await fetchPublications();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete targeted publication');
        }
    };

    const groupedPosts = useMemo(() => groupTargetedPublications(publications), [publications]);

    const stats = useMemo(() => {
        const answered = publications.filter((item) => item.responseChoice).length;
        const pending = publications.length - answered;
        const yesCount = publications.filter((item) => item.responseChoice === 'yes').length;
        const noCount = publications.filter((item) => item.responseChoice === 'no').length;

        return {
            totalPosts: groupedPosts.length,
            answered,
            pending,
            yesCount,
            noCount
        };
    }, [groupedPosts.length, publications]);

    const statCards = [
        { title: 'Published Posts', value: stats.totalPosts, icon: SendHorizontal, color: 'text-black' },
        { title: 'Answered Replies', value: stats.answered, icon: CheckCircle2, color: 'text-green-600' },
        { title: 'Pending Replies', value: stats.pending, icon: Clock3, color: 'text-primary-600' },
        { title: 'No Replies', value: stats.noCount, icon: XCircle, color: 'text-red-500' }
    ];

    return (
        <div className="min-h-screen pb-20 -m-4 md:-m-10 p-4 md:p-10">
            <div className="space-y-8 md:space-y-12 max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b-4 border-black pb-8">
                    <div>
                        <h1 className="text-2xl md:text-6xl font-black text-black tracking-tighter uppercase italic">
                            HO <span className="text-primary-600">Social.</span>
                        </h1>
                        <p className="text-gray-400 font-bold uppercase tracking-[0.2em] md:tracking-[0.3em] text-[10px] md:text-xs mt-2">
                            Published posts and user replies
                        </p>
                    </div>
                    <div className="hidden md:block text-right">
                        <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Connection Status</p>
                        <p className="text-sm font-black text-green-500 uppercase tracking-tighter">Online / Secure</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border-x border-t border-black">
                    {statCards.map((card) => (
                        <div
                            key={card.title}
                            className="p-6 md:p-10 border-b border-r border-black hover:bg-black hover:text-white transition-all group relative overflow-hidden"
                        >
                            <div className="relative z-10">
                                <p className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] mb-4 opacity-60 group-hover:opacity-100">
                                    {card.title}
                                </p>
                                <div className="flex items-baseline gap-2 md:gap-3">
                                    <h3 className="text-3xl md:text-5xl font-black italic">{card.value}</h3>
                                    <card.icon size={16} className={`${card.color} group-hover:text-primary-600 transition-colors`} />
                                </div>
                            </div>
                            <div className="absolute -bottom-2 -right-2 md:-bottom-4 md:-right-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <card.icon size={100} />
                            </div>
                        </div>
                    ))}
                </div>

                <div className="space-y-8">
                    <div className="flex items-center justify-between border-b-2 border-black pb-4">
                        <h2 className="text-lg md:text-xl font-black uppercase tracking-tighter italic">Published Posts</h2>
                        <Link to="/admin/targeted-publications" className="inline-flex items-center gap-2 px-4 py-2 border-2 border-black bg-white hover:bg-black hover:text-white transition-all text-[10px] font-black uppercase tracking-[0.2em]">
                            <SendHorizontal size={14} />
                            Targeted Publish
                        </Link>
                    </div>

                    {loading ? (
                        <div className="p-12 text-center border-2 border-black border-dashed opacity-40">
                            <p className="text-[10px] font-black uppercase tracking-widest italic">Loading Posts</p>
                        </div>
                    ) : groupedPosts.length === 0 ? (
                        <div className="p-12 text-center border-2 border-black border-dashed opacity-40">
                            <p className="text-[10px] font-black uppercase tracking-widest italic">No Targeted Posts Yet</p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-0 border-x border-t border-black">
                                {groupedPosts.map((group) => {
                                    const groupYesCount = group.replies.filter((reply) => reply.responseChoice === 'yes').length;
                                    const groupNoCount = group.replies.filter((reply) => reply.responseChoice === 'no').length;

                                    return (
                                        <div key={group.groupId} className="border-b border-r border-black bg-white">
                                            <Link
                                                to={`/admin/targeted-publications/review/${encodeURIComponent(group.groupId)}`}
                                                className="text-left p-5 transition-all hover:bg-gray-50 block"
                                            >
                                                <div className="space-y-4">
                                                    <div>
                                                        <p className="text-[8px] font-black uppercase tracking-[0.25em] text-primary-600">
                                                            {group.replies.length} user{group.replies.length > 1 ? 's' : ''}
                                                        </p>
                                                        <p className="mt-2 text-sm font-black uppercase tracking-tight line-clamp-3">
                                                            {group.text ? group.text : 'Image Publication'}
                                                        </p>
                                                    </div>

                                                    {group.imageUrl && (
                                                        <div className="border border-black overflow-hidden bg-gray-100">
                                                            <img src={group.imageUrl} alt="Published post" className="w-full h-32 object-cover" />
                                                        </div>
                                                    )}

                                                    <div className="flex items-center justify-between gap-3">
                                                        <div className="flex gap-2">
                                                            <span className="px-2 py-1 text-[8px] font-black uppercase tracking-[0.2em] border border-black bg-green-500 text-white">
                                                                Yes {groupYesCount}
                                                            </span>
                                                            <span className="px-2 py-1 text-[8px] font-black uppercase tracking-[0.2em] border border-black bg-red-500 text-white">
                                                                No {groupNoCount}
                                                            </span>
                                                        </div>
                                                        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-400">
                                                            {new Date(group.createdAt).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                </div>
                                            </Link>

                                            <div className="flex items-center gap-2 px-5 py-4 border-t border-black bg-gray-50">
                                                <button
                                                    type="button"
                                                    onClick={() => setEditingGroup(group)}
                                                    className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 border border-black bg-white hover:bg-black hover:text-white transition-colors text-[9px] font-black uppercase tracking-[0.2em]"
                                                >
                                                    <Edit3 size={12} />
                                                    Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(group.groupId)}
                                                    className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 border border-black bg-white hover:bg-red-600 hover:text-white hover:border-red-600 transition-colors text-[9px] font-black uppercase tracking-[0.2em]"
                                                >
                                                    <Trash2 size={12} />
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
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

export default AdminTargetedPublicationReviews;
