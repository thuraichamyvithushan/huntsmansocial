import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Loader2, MessageSquareText, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { groupTargetedPublications } from '../utils/targetedPublicationGroups';

const UserTargetedPublicationDetail = () => {
    const { groupId } = useParams();
    const decodedGroupId = decodeURIComponent(groupId || '');
    const [publications, setPublications] = useState([]);
    const [drafts, setDrafts] = useState({});
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        const fetchPublications = async () => {
            try {
                const { data } = await api.get('/targeted-publications/user');
                setPublications(Array.isArray(data) ? data : []);
            } catch (error) {
                toast.error(error.response?.data?.message || 'Failed to load your publication');
            } finally {
                setLoading(false);
            }
        };

        fetchPublications();
    }, []);

    const groupedPosts = useMemo(() => groupTargetedPublications(publications), [publications]);
    const selectedPost = groupedPosts.find((group) => group.groupId === decodedGroupId) || null;
    const selectedReply = selectedPost?.replies?.[0] || null;
    const draft = selectedReply ? (drafts[selectedReply._id] || {}) : {};
    const isAnswered = Boolean(selectedReply?.responseChoice);

    useEffect(() => {
        setIsEditing(false);
    }, [decodedGroupId, selectedReply?._id]);

    const updateDraft = (publicationId, nextValues) => {
        setDrafts((current) => ({
            ...current,
            [publicationId]: {
                ...current[publicationId],
                ...nextValues
            }
        }));
    };

    const startEditing = () => {
        if (!selectedReply) {
            return;
        }

        updateDraft(selectedReply._id, {
            responseChoice: selectedReply.responseChoice || '',
            feedback: selectedReply.feedback || '',
            submitting: false
        });
        setIsEditing(true);
    };

    const handleSubmit = async () => {
        if (!selectedReply) {
            return;
        }

        const currentDraft = drafts[selectedReply._id] || {};

        if (!currentDraft.responseChoice) {
            toast.error('Select Yes or No first');
            return;
        }

        if (!currentDraft.feedback?.trim()) {
            toast.error('Please add your feedback');
            return;
        }

        updateDraft(selectedReply._id, { submitting: true });
        try {
            const { data } = await api.patch(`/targeted-publications/${selectedReply._id}/respond`, {
                responseChoice: currentDraft.responseChoice,
                feedback: currentDraft.feedback.trim()
            });

            setPublications((current) => current.map((item) => (
                item._id === selectedReply._id ? data.publication : item
            )));

            setDrafts((current) => ({
                ...current,
                [selectedReply._id]: {}
            }));
            setIsEditing(false);

            toast.success(isAnswered ? 'Your reply has been updated' : 'Your response has been sent');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to submit your response');
            updateDraft(selectedReply._id, { submitting: false });
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
                            Open private post and submit your reply
                        </p>
                    </div>
                </div>

                <div className="flex items-center justify-between border-b-2 border-black pb-4">
                    <Link to="/my-publications" className="inline-flex items-center gap-2 px-4 py-2 border-2 border-black bg-white hover:bg-black hover:text-white transition-all text-[10px] font-black uppercase tracking-[0.2em]">
                        <ArrowLeft size={14} />
                        Back To Posts
                    </Link>
                </div>

                {loading ? (
                    <div className="p-12 text-center border-2 border-black border-dashed opacity-40">
                        <p className="text-[10px] font-black uppercase tracking-widest italic">Loading Private Post</p>
                    </div>
                ) : !selectedPost || !selectedReply ? (
                    <div className="p-12 text-center border-2 border-black border-dashed opacity-40">
                        <p className="text-[10px] font-black uppercase tracking-widest italic">Private Post Not Found</p>
                    </div>
                ) : (
                    <div className="border-2 border-black bg-white overflow-hidden">
                        <div className="px-6 py-5 border-b border-black flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Shared by {selectedPost.createdBy?.name || 'Admin'}</p>
                                <p className="mt-2 text-sm font-bold text-black">
                                    {new Date(selectedPost.createdAt).toLocaleString()}
                                </p>
                            </div>

                            <span className={`px-3 py-1 text-[9px] font-black uppercase tracking-[0.25em] border-2 border-black ${
                                isAnswered
                                    ? selectedReply.responseChoice === 'yes'
                                        ? 'bg-green-500 text-white'
                                        : 'bg-red-500 text-white'
                                    : 'bg-gray-100 text-black'
                            }`}>
                                {isAnswered ? selectedReply.responseChoice : 'awaiting reply'}
                            </span>
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
                                            <img src={selectedPost.imageUrl} alt="Private post" className="w-full max-h-80 object-cover" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {isAnswered && !isEditing ? (
                                <div className="border-2 border-black bg-gray-50 p-5 space-y-3">
                                    <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.2em]">
                                        <MessageSquareText size={16} className="text-primary-600" />
                                        Submitted Feedback
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`px-3 py-1 text-[9px] font-black uppercase tracking-[0.25em] border border-black ${
                                            selectedReply.responseChoice === 'yes'
                                                ? 'bg-green-500 text-white'
                                                : 'bg-red-500 text-white'
                                        }`}>
                                            {selectedReply.responseChoice}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={startEditing}
                                            className="px-4 py-2 border border-black bg-white hover:bg-black hover:text-white transition-colors text-[10px] font-black uppercase tracking-[0.2em]"
                                        >
                                            Edit Reply
                                        </button>
                                    </div>
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedReply.feedback}</p>
                                </div>
                            ) : (
                                <div className="space-y-5">
                                    <div className="space-y-3">
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em]">Your Response</p>
                                        <div className="flex flex-wrap gap-3">
                                            <button
                                                type="button"
                                                onClick={() => updateDraft(selectedReply._id, { responseChoice: 'yes' })}
                                                className={`px-5 py-3 border-2 border-black text-xs font-black uppercase tracking-[0.25em] transition-colors flex items-center gap-2 ${
                                                    draft.responseChoice === 'yes'
                                                        ? 'bg-green-500 text-white'
                                                        : 'bg-white text-black hover:bg-gray-50'
                                                }`}
                                            >
                                                <CheckCircle2 size={16} />
                                                Yes
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => updateDraft(selectedReply._id, { responseChoice: 'no' })}
                                                className={`px-5 py-3 border-2 border-black text-xs font-black uppercase tracking-[0.25em] transition-colors flex items-center gap-2 ${
                                                    draft.responseChoice === 'no'
                                                        ? 'bg-red-500 text-white'
                                                        : 'bg-white text-black hover:bg-gray-50'
                                                }`}
                                            >
                                                <XCircle size={16} />
                                                No
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em]">Feedback</label>
                                        <textarea
                                            value={draft.feedback || ''}
                                            onChange={(event) => updateDraft(selectedReply._id, { feedback: event.target.value })}
                                            placeholder="Explain why you selected Yes or No..."
                                            className="w-full min-h-[140px] border-2 border-black px-4 py-3 text-sm font-medium resize-none whitespace-pre-wrap"
                                        />
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleSubmit}
                                        disabled={draft.submitting}
                                        className="w-full bg-black text-white py-4 font-black uppercase tracking-[0.25em] text-xs hover:bg-primary-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                                    >
                                        {draft.submitting ? <Loader2 size={18} className="animate-spin" /> : <MessageSquareText size={18} />}
                                        {isAnswered ? 'Save Reply Changes' : 'Submit Response'}
                                    </button>
                                    {isAnswered && (
                                        <button
                                            type="button"
                                            onClick={() => setIsEditing(false)}
                                            className="w-full border-2 border-black py-4 text-[10px] font-black uppercase tracking-[0.25em] hover:bg-black hover:text-white transition-colors"
                                        >
                                            Cancel Edit
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserTargetedPublicationDetail;
