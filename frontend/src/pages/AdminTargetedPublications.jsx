import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Clock3, ImagePlus, Loader2, MessageSquareText, SendHorizontal } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';

const AdminTargetedPublications = () => {
    const [users, setUsers] = useState([]);
    const [publications, setPublications] = useState([]);
    const [form, setForm] = useState({
        targetEmails: [],
        text: ''
    });
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        return () => {
            if (imagePreview) {
                URL.revokeObjectURL(imagePreview);
            }
        };
    }, [imagePreview]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [usersResponse, publicationsResponse] = await Promise.all([
                    api.get('/admin/users'),
                    api.get('/targeted-publications/admin')
                ]);

                const approvedUsers = (Array.isArray(usersResponse.data) ? usersResponse.data : [])
                    .filter((user) => user.role === 'user' && user.status === 'approved')
                    .sort((a, b) => a.email.localeCompare(b.email));

                setUsers(approvedUsers);
                setPublications(Array.isArray(publicationsResponse.data) ? publicationsResponse.data : []);
            } catch (error) {
                toast.error('Failed to load targeted publication data');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const refreshPublications = async () => {
        const { data } = await api.get('/targeted-publications/admin');
        setPublications(Array.isArray(data) ? data : []);
    };

    const handleImageChange = (event) => {
        const file = event.target.files?.[0];

        if (imagePreview) {
            URL.revokeObjectURL(imagePreview);
        }

        if (!file) {
            setImageFile(null);
            setImagePreview('');
            return;
        }

        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!form.text.trim() && !imageFile) {
            toast.error('Add text or an image before publishing');
            return;
        }

        if (form.targetEmails.length === 0) {
            toast.error('Select at least one user email');
            return;
        }

        const formData = new FormData();
        formData.append('targetEmails', JSON.stringify(form.targetEmails));
        formData.append('text', form.text.trim());

        if (imageFile) {
            formData.append('image', imageFile);
        }

        setSubmitting(true);
        try {
            const { data } = await api.post('/targeted-publications/admin', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setForm({ targetEmails: [], text: '' });
            setImageFile(null);
            if (imagePreview) {
                URL.revokeObjectURL(imagePreview);
            }
            setImagePreview('');

            await refreshPublications();

            if (data.emailSent) {
                toast.success(`Published for ${form.targetEmails.length} selected user${form.targetEmails.length > 1 ? 's' : ''}`);
            } else {
                toast.error('Published, but some emails could not be sent');
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to publish');
        } finally {
            setSubmitting(false);
        }
    };

    const toggleTargetEmail = (email) => {
        setForm((current) => ({
            ...current,
            targetEmails: current.targetEmails.includes(email)
                ? current.targetEmails.filter((item) => item !== email)
                : [...current.targetEmails, email]
        }));
    };

    const pendingCount = publications.filter((item) => !item.responseChoice).length;
    const answeredCount = publications.filter((item) => item.responseChoice).length;

    return (
        <div className="min-h-screen pb-20 -m-4 md:-m-10 p-4 md:p-10">
            <div className="space-y-8 md:space-y-12 max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b-4 border-black pb-8">
                    <div>
                        <h1 className="text-2xl md:text-6xl font-black text-black tracking-tighter uppercase italic">
                            HO <span className="text-primary-600">Social.</span>
                        </h1>
                        <p className="text-gray-400 font-bold uppercase tracking-[0.2em] md:tracking-[0.3em] text-[10px] md:text-xs mt-2">
                            Manage targeted publications for a selected user
                        </p>
                    </div>
                    <div className="hidden md:block text-right">
                        <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Connection Status</p>
                        <p className="text-sm font-black text-green-500 uppercase tracking-tighter">Online / Secure</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    <div className="lg:col-span-2">
                        <form onSubmit={handleSubmit} className="border-2 border-black bg-white">
                            <div className="flex items-center gap-3 px-6 md:px-8 py-5 border-b-2 border-black">
                                <SendHorizontal size={18} className="text-primary-600" />
                                    <div>
                                        <h2 className="text-sm md:text-lg font-black uppercase tracking-tight italic">New Private Publication</h2>
                                        <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-gray-400">Only selected users will receive this email</p>
                                    </div>
                                </div>

                            <div className="p-6 md:p-8 space-y-6">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between gap-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em]">User Emails</label>
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary-600">
                                            {form.targetEmails.length} selected
                                        </span>
                                    </div>
                                    <div className="border-2 border-black bg-white max-h-72 overflow-y-auto">
                                        {users.length === 0 ? (
                                            <div className="px-4 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                                                No approved users available
                                            </div>
                                        ) : (
                                            users.map((user) => {
                                                const isSelected = form.targetEmails.includes(user.email);
                                                return (
                                                    <label
                                                        key={user._id}
                                                        className={`flex items-start gap-3 px-4 py-4 border-b border-black/10 cursor-pointer transition-colors ${
                                                            isSelected ? 'bg-black text-white' : 'hover:bg-gray-50'
                                                        }`}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => toggleTargetEmail(user.email)}
                                                            className="mt-1 h-4 w-4 accent-primary-600"
                                                        />
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-black break-all">{user.email}</p>
                                                            <p className={`text-[10px] font-bold uppercase tracking-[0.2em] mt-1 ${
                                                                isSelected ? 'text-white/70' : 'text-gray-400'
                                                            }`}>
                                                                {user.name}
                                                            </p>
                                                        </div>
                                                    </label>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em]">Text Content</label>
                                    <textarea
                                        value={form.text}
                                        onChange={(event) => setForm((current) => ({ ...current, text: event.target.value }))}
                                        placeholder="Write the message for the selected user..."
                                        className="w-full min-h-[180px] border-2 border-black px-4 py-3 text-sm font-medium resize-none whitespace-pre-wrap"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em]">Optional Image</label>
                                    <label className="flex cursor-pointer items-center justify-center gap-3 border-2 border-dashed border-black px-4 py-8 text-center hover:bg-gray-50 transition-colors">
                                        <ImagePlus size={20} />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Choose Image</span>
                                        <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                                    </label>

                                    {imagePreview && (
                                        <div className="border-2 border-black overflow-hidden bg-gray-50">
                                            <img src={imagePreview} alt="Preview" className="w-full max-h-[320px] object-cover" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full border-t-2 border-black bg-black text-white py-5 font-black uppercase tracking-[0.25em] text-xs hover:bg-primary-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                            >
                                {submitting ? <Loader2 size={18} className="animate-spin" /> : <SendHorizontal size={18} />}
                                Publish
                            </button>
                        </form>
                    </div>

                    <div className="space-y-8">
                        <div className="flex items-center justify-between border-b-2 border-black pb-4">
                            <h2 className="text-lg md:text-xl font-black uppercase tracking-tighter italic">Quick Flow</h2>
                        </div>

                        <div className="space-y-4">
                            <Link to="/admin/targeted-publications/review" className="group flex items-center justify-between p-4 md:p-6 border-2 border-black bg-white hover:bg-black transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 md:p-3 bg-gray-100 group-hover:bg-primary-600 transition-colors">
                                        <MessageSquareText size={20} className="text-black group-hover:text-white" />
                                    </div>
                                    <div>
                                        <p className="text-xs md:text-sm font-black uppercase tracking-tight group-hover:text-white transition-colors">Admin Review</p>
                                        <p className="text-[8px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">View responses and feedback</p>
                                    </div>
                                </div>
                                <ArrowRight size={18} className="text-primary-600 opacity-0 group-hover:opacity-100 transition-all" />
                            </Link>

                            {loading ? (
                                <div className="p-8 text-center border-2 border-black border-dashed opacity-30">
                                    <p className="text-[10px] font-black uppercase tracking-widest italic">Loading Summary</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-0 border-x border-t border-black">
                                    <div className="p-6 border-b border-r border-black bg-white">
                                        <p className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] mb-4 text-gray-400">Pending Responses</p>
                                        <div className="flex items-baseline gap-3">
                                            <h3 className="text-4xl font-black italic">{pendingCount}</h3>
                                            <Clock3 size={16} className="text-primary-600" />
                                        </div>
                                    </div>
                                    <div className="p-6 border-b border-r border-black bg-white">
                                        <p className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] mb-4 text-gray-400">Answered</p>
                                        <div className="flex items-baseline gap-3">
                                            <h3 className="text-4xl font-black italic">{answeredCount}</h3>
                                            <CheckCircle2 size={16} className="text-green-600" />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminTargetedPublications;
