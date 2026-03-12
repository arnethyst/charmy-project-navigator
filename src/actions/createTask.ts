'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getCurrentUser } from './auth'

// ... existing actions ...

export async function createTask(formData: FormData) {
    const user = await getCurrentUser();
    if (!user) throw new Error("Not authenticated");

    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const priority = formData.get('priority') as string;
    const assigneeId = formData.get('assigneeId') as string;
    const startDate = formData.get('startDate') as string;
    const dueDate = formData.get('dueDate') as string;
    const type = formData.get('type') as string;
    
    // ロール制御 (EnumがないためStringバリデーション)
    const roleInput = formData.get('role') as string;
    const role = ['PLANNER', 'PROGRAMMER', 'DESIGNER'].includes(roleInput) ? roleInput : 'PROGRAMMER';

    // 自由タグ (JSON文字列配列として受け取る想定)
    const tagsJson = formData.get('tagsStr') as string;
    let tagNames: string[] = [];
    try {
        if (tagsJson) tagNames = JSON.parse(tagsJson);
    } catch(e) {
        console.warn("Failed to parse tags JSON");
    }

    const tagsConnectOrCreate = tagNames.filter(n => n.trim() !== '').map(name => ({
        where: { name },
        create: { name }
    }));

    try {
        const newTask = await prisma.task.create({
            data: {
                title,
                description,
                priority: priority || 'MIDDLE',
                status: 'TODO',
                assigneeId: assigneeId || user.id, // Default to creator if not selected
                startDate: startDate ? new Date(startDate) : null,
                dueDate: dueDate ? new Date(dueDate) : null,
                type: type || 'TASK',
                role: role,
                tags: tagsConnectOrCreate.length > 0 ? {
                    connectOrCreate: tagsConnectOrCreate
                } : undefined,
            }
        });

        // 担当者の情報を取得 (通知メッセージ用)
        const assignee = await prisma.user.findUnique({ where: { id: newTask.assigneeId! } });
        const creatorName = user.name || user.username;
        const assigneeName = assignee?.name || assignee?.username || '担当者';

        // ログ記録 (対象を担当者に設定)
        await prisma.systemLog.create({
            data: {
                taskId: newTask.id,
                userId: newTask.assigneeId!,
                content: `${creatorName} さんが ${assigneeName} さんへ新たなタスク『${newTask.title}』を生成しました。`,
            }
        });

        revalidatePath('/');
        revalidatePath('/kanban');
        revalidatePath('/gantt');
    } catch (e: any) {
        console.error('Failed to create task:', e);
        console.error('Detailed Error:', e?.message || e);
        throw new Error('タスク作成時エラー: ' + (e?.message || 'Unknown Error'));
    }

    redirect('/');
}
