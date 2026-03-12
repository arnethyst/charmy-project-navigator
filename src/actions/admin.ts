'use server';

import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/actions/auth';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';

// Helper to ensure admin access
async function requireAdmin() {
    const session = await getCurrentUser();
    if (!session || session.role !== 'ADMIN') {
        throw new Error('Unauthorized: Admin access required');
    }
    return session;
}

export async function getUsers() {
    await requireAdmin();
    try {
        const users = await prisma.user.findMany({
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                username: true,
                name: true,
                role: true,
                themeColor: true,
                avatar: true,
                createdAt: true,
            },
        });
        return { users };
    } catch (error) {
        console.error('Failed to fetch users:', error);
        return { error: 'Failed to fetch users' };
    }
}

export async function updateUser(userId: string, formData: FormData) {
    await requireAdmin();

    const username = formData.get('username') as string;
    const role = formData.get('role') as string;
    const themeColor = formData.get('themeColor') as string;
    const avatar = formData.get('avatar') as string;
    const password = formData.get('password') as string;

    try {
        const data: any = {
            username,
            role,
            themeColor,
            avatar,
            name: username, // Sync name with username for simplicity
        };

        if (password && password.trim() !== '') {
            data.passwordHash = await bcrypt.hash(password, 10);
        }

        await prisma.user.update({
            where: { id: userId },
            data,
        });

        revalidatePath('/admin');
        return { success: true };
    } catch (error) {
        console.error('Failed to update user:', error);
        return { error: 'Failed to update user' };
    }
}

export async function deleteUser(userId: string) {
    await requireAdmin();
    try {
        await prisma.user.delete({
            where: { id: userId },
        });
        revalidatePath('/admin');
        return { success: true };
    } catch (error) {
        console.error('Failed to delete user:', error);
        return { error: 'Failed to delete user' };
    }
}
