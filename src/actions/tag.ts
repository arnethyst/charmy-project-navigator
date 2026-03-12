'use server';

import prisma from '@/lib/prisma';

/**
 * 登録済みの全タグを取得します。
 * @returns 登録済みタグの配列
 */
export async function getAllTags() {
    try {
        const tags = await prisma.tag.findMany({
            orderBy: { name: 'asc' },
        });
        return tags;
    } catch (error) {
        console.error('Failed to get tags:', error);
        return [];
    }
}
