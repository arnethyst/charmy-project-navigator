'use server';

import prisma from '@/lib/prisma';
import { getCurrentUser } from './auth';

export async function getMilestones() {
    try {
        const milestones = await prisma.task.findMany({
            where: {
                isMilestone: true,
            },
            orderBy: {
                startDate: 'asc',
            },
            include: {
                assignee: {
                    select: {
                        id: true,
                        username: true,
                        name: true,
                    }
                }
            }
        });
        return { success: true, milestones };
    } catch (error) {
        console.error('Failed to get milestones:', error);
        return { success: false, error: 'マイルストーンの取得に失敗しました。' };
    }
}

export async function createMilestone(formData: FormData) {
    try {
        const userScope = await getCurrentUser();
        if (!userScope) {
            return { success: false, error: 'Unauthorized' };
        }
        
        // Admin or equivalent auth check can be added here if needed, 
        // but typically protected by the admin page itself.

        const title = formData.get('title') as string;
        const startDateStr = formData.get('startDate') as string;
        const dueDateStr = formData.get('dueDate') as string;

        if (!title || !startDateStr || !dueDateStr) {
            return { success: false, error: '必須項目が入力されていません。' };
        }

        const startDate = new Date(startDateStr);
        const dueDate = new Date(dueDateStr);

        const newMilestone = await prisma.task.create({
            data: {
                title,
                startDate,
                dueDate,
                isMilestone: true,
                type: 'milestone',
                status: 'TODO',
                // Optional assignee can be set if you want milestones assigned
            }
        });

        return { success: true, milestone: newMilestone };
    } catch (error) {
        console.error('Failed to create milestone:', error);
        return { success: false, error: 'マイルストーンの作成に失敗しました。' };
    }
}

export async function updateMilestone(id: string, formData: FormData) {
    try {
        const userScope = await getCurrentUser();
        if (!userScope) {
            return { success: false, error: 'Unauthorized' };
        }

        const title = formData.get('title') as string;
        const startDateStr = formData.get('startDate') as string;
        const dueDateStr = formData.get('dueDate') as string;

        if (!title || !startDateStr || !dueDateStr) {
            return { success: false, error: '必須項目が入力されていません。' };
        }

        const startDate = new Date(startDateStr);
        const dueDate = new Date(dueDateStr);

        const updated = await prisma.task.update({
            where: { id },
            data: {
                title,
                startDate,
                dueDate,
            }
        });

        return { success: true, milestone: updated };
    } catch (error) {
        console.error('Failed to update milestone:', error);
        return { success: false, error: 'マイルストーンの更新に失敗しました。' };
    }
}

export async function deleteMilestone(id: string) {
    try {
        const userScope = await getCurrentUser();
        if (!userScope) {
            return { success: false, error: 'Unauthorized' };
        }

        await prisma.task.delete({
            where: { id }
        });

        return { success: true };
    } catch (error) {
        console.error('Failed to delete milestone:', error);
        return { success: false, error: 'マイルストーンの削除に失敗しました。' };
    }
}
