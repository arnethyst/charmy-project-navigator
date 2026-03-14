'use client';

import { useState, useEffect } from 'react';
import { PixelButton } from './ui/PixelButton';
import styles from '../app/admin/admin.module.css'; // Reuse admin modal styles
import { createTask } from '../actions/task';
import { getUsers } from '../actions/auth'; // Reusing this to get user list for assignment
import CreatableSelect from 'react-select/creatable';
import { getAllTags } from '../actions/tag';

interface User {
    id: string;
    username: string;
    name: string | null;
}

interface TaskModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

export function TaskModal({ onClose, onSuccess }: TaskModalProps) {
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState<User[]>([]);

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        type: 'TASK',
        status: 'TODO',
        priority: 'MIDDLE',
        assigneeId: '',
        startDate: '',
        dueDate: '',
        role: 'PROGRAMMER',
    });

    const [availableTags, setAvailableTags] = useState<{value: string, label: string}[]>([]);
    const [selectedTags, setSelectedTags] = useState<readonly {value: string, label: string}[]>([]);

    useEffect(() => {
        // Fetch users for assignee dropdown
        getUsers().then(res => {
            if (res && res.length > 0) {
                const fetchedUsers = res as User[];
                setUsers(fetchedUsers);
                setFormData(prev => ({ ...prev, assigneeId: fetchedUsers[0].id }));
            }
        });
        
        getAllTags().then(tags => {
            setAvailableTags(tags.map((t: any) => ({ value: t.name, label: t.name })));
        });
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.startDate && formData.dueDate) {
            if (new Date(formData.startDate) > new Date(formData.dueDate)) {
                alert('開始日は締切日より前の日付にしてください');
                return;
            }
        }

        setLoading(true);

        const data = new FormData();
        Object.entries(formData).forEach(([key, value]) => {
            data.append(key, value);
        });
        // 追加: タグ情報
        data.append('tagsStr', JSON.stringify(selectedTags.map(t => t.value)));

        const res = await createTask(data);
        setLoading(false);

        if (res.success) {
            onSuccess();
            onClose();
        } else {
            alert('Failed to create task');
        }
    };

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalWindow} style={{ maxWidth: '600px' }}>
                <h2 className={styles.title} style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                    NEW ENTRY
                </h2>
                <form onSubmit={handleSubmit}>
                    <label className={styles.label}>
                        Title
                        <input
                            className={styles.input}
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            required
                            placeholder="Task Name"
                        />
                    </label>
                    <label className={styles.label}>
                        Description
                        <textarea
                            className={styles.input}
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            rows={3}
                            placeholder="Details..."
                            style={{ resize: 'vertical' }}
                        />
                    </label>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <label className={styles.label}>
                            Type
                            <select
                                className={styles.select}
                                value={formData.type}
                                onChange={e => setFormData({ ...formData, type: e.target.value })}
                            >
                                <option value="TASK">TASK</option>
                                <option value="BUG">BUG</option>
                            </select>
                        </label>
                        <label className={styles.label}>
                            Status
                            <select
                                className={styles.select}
                                value={formData.status}
                                onChange={e => setFormData({ ...formData, status: e.target.value })}
                            >
                                <option value="TODO">TODO</option>
                                <option value="IN_PROGRESS">IN PROGRESS</option>
                                <option value="REVIEW">REVIEW</option>
                                <option value="DONE">DONE</option>
                            </select>
                        </label>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                        <label className={styles.label}>
                            Priority
                            <select
                                className={styles.select}
                                value={formData.priority}
                                onChange={e => setFormData({ ...formData, priority: e.target.value })}
                            >
                                <option value="LOW">LOW</option>
                                <option value="MIDDLE">MIDDLE</option>
                                <option value="HIGH">HIGH</option>
                            </select>
                        </label>
                        <label className={styles.label}>
                            Role
                            <select
                                className={styles.select}
                                value={formData.role}
                                onChange={e => setFormData({ ...formData, role: e.target.value })}
                            >
                                <option value="PLANNER">PLANNER</option>
                                <option value="PROGRAMMER">PROGRAMMER</option>
                                <option value="DESIGNER">DESIGNER</option>
                            </select>
                        </label>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <label className={styles.label}>
                            Start Date
                            <input
                                type="date"
                                className={styles.input}
                                value={formData.startDate}
                                onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                            />
                        </label>
                        <label className={styles.label}>
                            Due Date
                            <input
                                type="date"
                                className={styles.input}
                                value={formData.dueDate}
                                onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                            />
                        </label>
                    </div>

                    <label className={styles.label}>
                        Assignee
                        <select
                            className={styles.select}
                            value={formData.assigneeId}
                            onChange={e => setFormData({ ...formData, assigneeId: e.target.value })}
                        >
                            {users.map(u => (
                                <option key={u.id} value={u.id}>{u.name || u.username}</option>
                            ))}
                        </select>
                    </label>

                    <label className={styles.label} style={{ marginTop: '1rem' }}>
                        Tags
                        <div style={{color: '#000'}}>
                            <CreatableSelect
                                isMulti
                                options={availableTags}
                                value={selectedTags}
                                onChange={(newValue) => setSelectedTags(newValue)}
                                placeholder="Add tags..."
                                formatCreateLabel={(v) => `Create "${v}"`}
                                styles={{
                                    control: (base) => ({
                                        ...base,
                                        backgroundColor: 'var(--bg-sunken)',
                                        borderColor: 'var(--text-main)',
                                        borderWidth: '2px',
                                        borderRadius: '0',
                                    })
                                }}
                            />
                        </div>
                    </label>

                    <div className={styles.actions} style={{ marginTop: '2rem' }}>
                        <PixelButton type="button" onClick={onClose} style={{ flex: 1, opacity: 0.7 }}>CANCEL</PixelButton>
                        <PixelButton type="submit" disabled={loading} style={{ flex: 1, backgroundColor: '#c06c4b', color: 'white' }}>
                            {loading ? 'SAVING...' : 'CREATE'}
                        </PixelButton>
                    </div>
                </form>
            </div>
        </div>
    );
}
