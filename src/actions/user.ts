'use server';

import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/actions/auth';

export async function getPersonalMemo() {
    const user = await getCurrentUser();
    if (!user) return null;

    const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { personalMemo: true }
    });

    return dbUser?.personalMemo || '';
}

export async function updatePersonalMemo(memo: string) {
    const user = await getCurrentUser();
    if (!user) throw new Error('Unauthorized');

    await prisma.user.update({
        where: { id: user.id },
        data: { personalMemo: memo }
    });

    return { success: true };
}
