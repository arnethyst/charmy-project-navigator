import { getTask } from "@/actions/task";
import { getUsers, getCurrentUser } from "@/actions/auth";
import { TaskDetail } from "@/components/TaskDetail";
import { notFound } from "next/navigation";

export default async function TaskPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const task = await getTask(id);
    const users = await getUsers();
    const currentUser = await getCurrentUser();

    if (!task || !currentUser) {
        notFound();
    }

    // Serialize dates to avoid "Date object" warning/error in Client Components
    const serializedTask = {
        ...task,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
        startDate: task.startDate ? task.startDate.toISOString() : null,
        dueDate: task.dueDate ? task.dueDate.toISOString() : null
    };

    return <TaskDetail task={serializedTask} users={users} currentUserId={currentUser.id} />;
}
