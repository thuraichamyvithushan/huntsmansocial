import React, { useEffect, useState } from 'react';
import { ImagePlus, Loader2, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';

const TargetedPublicationEditModal = ({ group, onClose, onSaved }) => {
    const [text, setText] = useState(group?.text || '');
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(group?.imageUrl || '');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        return () => {
            if (imageFile && imagePreview && imagePreview.startsWith('blob:')) {
                URL.revokeObjectURL(imagePreview);
            }
        };
    }, [imageFile, imagePreview]);

    const handleImageChange = (event) => {
        const file = event.target.files?.[0];

        if (imageFile && imagePreview.startsWith('blob:')) {
            URL.revokeObjectURL(imagePreview);
        }

        if (!file) {
            setImageFile(null);
            setImagePreview(group?.imageUrl || '');
            return;
        }

        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!text.trim() && !imagePreview) {
            toast.error('Add text or keep an image before saving');
            return;
        }

        const formData = new FormData();
        formData.append('text', text.trim());
        if (imageFile) {
            formData.append('image', imageFile);
        }

        setSaving(true);
        try {
            await api.put(`/targeted-publications/admin/group/${encodeURIComponent(group.groupId)}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success('Targeted publication updated');
            onSaved?.();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update targeted publication');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/75" onClick={onClose} />
            <div className="relative w-full max-w-2xl border-2 border-black bg-white overflow-hidden">
                <div className="flex items-center justify-between gap-4 px-6 py-4 bg-black text-white">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">Admin Edit</p>
                        <h3 className="text-sm md:text-lg font-black uppercase tracking-tight italic">Update Targeted Publication</h3>
                    </div>
                    <button type="button" onClick={onClose} className="hover:text-primary-600 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em]">Text Content</label>
                        <textarea
                            value={text}
                            onChange={(event) => setText(event.target.value)}
                            className="w-full min-h-[180px] border-2 border-black px-4 py-3 text-sm font-medium resize-none whitespace-pre-wrap"
                            placeholder="Update the message..."
                        />
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em]">Replace Image</label>
                        <label className="flex cursor-pointer items-center justify-center gap-3 border-2 border-dashed border-black px-4 py-8 text-center hover:bg-gray-50 transition-colors">
                            <ImagePlus size={20} />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Choose Image</span>
                            <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                        </label>

                        {imagePreview && (
                            <div className="border-2 border-black overflow-hidden bg-gray-50">
                                <img src={imagePreview} alt="Targeted publication preview" className="w-full max-h-[320px] object-cover" />
                            </div>
                        )}
                    </div>

                    <div className="flex gap-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-4 border-2 border-black text-[10px] font-black uppercase tracking-[0.2em] hover:bg-black hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex-1 py-4 bg-black text-white text-[10px] font-black uppercase tracking-[0.2em] hover:bg-primary-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TargetedPublicationEditModal;
