export const buildFallbackGroupKey = (item) => {
    const createdAt = item.createdAt ? new Date(item.createdAt) : new Date(0);
    const minuteBucket = `${createdAt.getFullYear()}-${createdAt.getMonth()}-${createdAt.getDate()}-${createdAt.getHours()}-${createdAt.getMinutes()}`;

    return [
        item.text || '',
        item.imageUrl || '',
        item.createdBy?._id || '',
        minuteBucket
    ].join('::');
};

export const groupTargetedPublications = (publications) => {
    const groups = new Map();

    publications.forEach((item) => {
        const groupId = item.publicationGroupId || buildFallbackGroupKey(item);

        if (!groups.has(groupId)) {
            groups.set(groupId, {
                groupId,
                text: item.text || '',
                imageUrl: item.imageUrl || '',
                createdAt: item.createdAt,
                createdBy: item.createdBy,
                replies: []
            });
        }

        const group = groups.get(groupId);
        group.replies.push(item);

        if (new Date(item.createdAt) < new Date(group.createdAt)) {
            group.createdAt = item.createdAt;
        }
    });

    return Array.from(groups.values())
        .map((group) => ({
            ...group,
            replies: group.replies.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        }))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};
