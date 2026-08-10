import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock3, MessageSquareText, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { groupTargetedPublications } from '../utils/targetedPublicationGroups';

const UserTargetedPublications = () => {
    const { user } = useAuth();
    const [publications, setPublications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPublications = async () => {
            try {
                const { data } = await api.get('/targeted-publications/user');
                setPublications(Array.isArray(data) ? data : []);
            } catch (error) {
                toast.error(error.response?.data?.message || 'Failed to load your publications');
            } finally {
                setLoading(false);
            }
        };

        fetchPublications();
    }, []);

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
        { title: 'Private Posts', value: stats.totalPosts, icon: MessageSquareText, color: 'text-black' },
        { title: 'Answered', value: stats.answered, icon: CheckCircle2, color: 'text-green-600' },
        { title: 'Pending', value: stats.pending, icon: Clock3, color: 'text-primary-600' },
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
                            Private posts shared only with {user?.email || 'you'}
                        </p>
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
                        <h2 className="text-lg md:text-xl font-black uppercase tracking-tighter italic">Private Posts</h2>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                            Open one post to reply
                        </span>
                    </div>

                    {loading ? (
                        <div className="p-12 text-center border-2 border-black border-dashed opacity-40">
                            <p className="text-[10px] font-black uppercase tracking-widest italic">Loading Private Posts</p>
                        </div>
                    ) : groupedPosts.length === 0 ? (
                        <div className="p-12 text-center border-2 border-black border-dashed opacity-40">
                            <p className="text-[10px] font-black uppercase tracking-widest italic">No Private Posts Yet</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-0 border-x border-t border-black">
                            {groupedPosts.map((group) => {
                                const reply = group.replies[0];
                                const isAnswered = Boolean(reply?.responseChoice);

                                return (
                                    <Link
                                        key={group.groupId}
                                        to={`/my-publications/${encodeURIComponent(group.groupId)}`}
                                        className="text-left p-5 border-b border-r border-black transition-all bg-white hover:bg-gray-50 block"
                                    >
                                        <div className="space-y-4">
                                            <div>
                                                <p className="text-[8px] font-black uppercase tracking-[0.25em] text-primary-600">
                                                    Shared by {group.createdBy?.name || 'Admin'}
                                                </p>
                                                <p className="mt-2 text-sm font-black uppercase tracking-tight line-clamp-3">
                                                    {group.text ? group.text : 'Image Publication'}
                                                </p>
                                            </div>

                                            {group.imageUrl && (
                                                <div className="border border-black overflow-hidden bg-gray-100">
                                                    <img src={group.imageUrl} alt="Private post" className="w-full h-32 object-cover" />
                                                </div>
                                            )}

                                            <div className="flex items-center justify-between gap-3">
                                                <span className={`px-2 py-1 text-[8px] font-black uppercase tracking-[0.2em] border border-black ${
                                                    isAnswered
                                                        ? reply.responseChoice === 'yes'
                                                            ? 'bg-green-500 text-white'
                                                            : 'bg-red-500 text-white'
                                                        : 'bg-gray-100 text-black'
                                                }`}>
                                                    {isAnswered ? reply.responseChoice : 'awaiting reply'}
                                                </span>
                                                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-400">
                                                    {new Date(group.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserTargetedPublications;
