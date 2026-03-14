'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getUsers, updateUser, deleteUser } from '../../actions/admin';
import { getMilestones, createMilestone, updateMilestone, deleteMilestone } from '../../actions/milestone';
import { logout } from '../../actions/auth';
import { PixelButton } from '../../components/ui/PixelButton';
import { MossyFrame } from '../../components/ui/MossyFrame';
import styles from './admin.module.css';
// Check if VerifySession is available client-side? No, it's server-side.
// We'll rely on server action or layout protection, but for now simple check in useEffect?
// Ideally this page should be a Server Component to fetch initial data, but we need interactivity.
// Let's make it a Client Component that fetches data on mount or uses a Server Component wrapper.
// Simplifying: Client Component fetching via Server Action.

interface User {
    id: string;
    username: string;
    name: string | null;
    role: string;
    themeColor: string;
    avatar: string | null;
}

interface Milestone {
    id: string;
    title: string;
    startDate: Date | string | null;
    dueDate: Date | string | null;
}

export default function AdminPage() {
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [editUser, setEditUser] = useState<User | null>(null);
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        role: 'MEMBER',
        themeColor: '#00ff00',
        avatar: '[?_?]',
    });

    // Milestone states
    const [milestones, setMilestones] = useState<Milestone[]>([]);
    const [editMilestone, setEditMilestone] = useState<Milestone | null>(null);
    const [milestoneFormData, setMilestoneFormData] = useState({
        title: '',
        startDate: '',
        dueDate: '',
    });

    useEffect(() => {
        loadUsers();
        loadMilestones();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function loadUsers() {
        try {
            setLoading(true);
            const res = await getUsers();
            if (res.error) {
                // Redirect if unauthorized usually handled by middleware or action return
                if (res.error.includes('Unauthorized')) {
                    router.push('/login');
                    return;
                }
                alert(res.error);
            } else {
                setUsers(res.users || []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    async function loadMilestones() {
        try {
            const res = await getMilestones();
            if (res.success) {
                setMilestones(res.milestones || []);
            }
        } catch (e) {
            console.error(e);
        }
    }

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`【警告】\nユーザー "${name}" を本当に削除してもよろしいですか？\nこの操作は取り消せません。`)) {
            return;
        }
        const res = await deleteUser(id);
        if (res.success) {
            loadUsers();
        } else {
            alert('削除に失敗しました。');
        }
    };

    const openEdit = (user: User) => {
        setEditUser(user);
        setFormData({
            username: user.username,
            password: '', // Leave blank to keep current
            role: user.role,
            themeColor: user.themeColor,
            avatar: user.avatar || '[?_?]',
        });
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editUser) return;

        const data = new FormData();
        data.append('username', formData.username);
        data.append('role', formData.role);
        data.append('themeColor', formData.themeColor);
        data.append('avatar', formData.avatar);
        data.append('password', formData.password);

        const res = await updateUser(editUser.id, data);
        if (res.success) {
            setEditUser(null);
            loadUsers();
        } else {
            alert('更新に失敗しました。');
        }
    };

    // Milestone handlers
    const formatDateForInput = (dateValue: Date | string | null) => {
        if (!dateValue) return '';
        const d = new Date(dateValue);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };

    const handleCreateMilestone = async (e: React.FormEvent) => {
        e.preventDefault();
        const data = new FormData();
        data.append('title', milestoneFormData.title);
        data.append('startDate', milestoneFormData.startDate);
        data.append('dueDate', milestoneFormData.dueDate);

        const res = await createMilestone(data);
        if (res.success) {
            setMilestoneFormData({ title: '', startDate: '', dueDate: '' });
            loadMilestones();
        } else {
            alert(res.error || '作成に失敗しました。');
        }
    };

    const handleSaveMilestone = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editMilestone) return;

        const data = new FormData();
        data.append('title', milestoneFormData.title);
        data.append('startDate', milestoneFormData.startDate);
        data.append('dueDate', milestoneFormData.dueDate);

        const res = await updateMilestone(editMilestone.id, data);
        if (res.success) {
            setEditMilestone(null);
            loadMilestones();
        } else {
            alert(res.error || '更新に失敗しました。');
        }
    };

    const handleDeleteMilestone = async (id: string, title: string) => {
        if (!confirm(`【警告】\nマイルストーン "${title}" を削除しますか？\nこの操作は取り消せません。`)) return;
        const res = await deleteMilestone(id);
        if (res.success) {
            loadMilestones();
        } else {
            alert(res.error || '削除に失敗しました。');
        }
    };

    const openEditMilestone = (milestone: Milestone) => {
        setEditMilestone(milestone);
        setMilestoneFormData({
            title: milestone.title,
            startDate: formatDateForInput(milestone.startDate),
            dueDate: formatDateForInput(milestone.dueDate),
        });
    };

    if (loading) return <div className="p-8 text-center text-green-500 font-mono">LOADING SYSTEM DATA...</div>;

    return (
        <div className="min-h-screen bg-[#f0f4f0] p-8 font-mono relative overflow-hidden">
            {/* Background Visuals Reuse if possible, or simplified */}
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                backgroundImage: 'radial-gradient(#6b7c6b 1px, transparent 1px)',
                backgroundSize: '20px 20px',
                opacity: 0.5,
                zIndex: 0,
                pointerEvents: 'none',
            }} />

            <div className="max-w-4xl mx-auto relative z-10">
                <header className="flex justify-between items-center mb-8">
                    <h1 className="text-2xl font-bold text-[#2f3e2f]">ADMIN DASHBOARD</h1>
                    <PixelButton onClick={() => logout()}>LOGOUT / EXIT</PixelButton>
                </header>

                <MossyFrame title="USER MANAGEMENT">
                    <div className="grid grid-cols-1 gap-4">
                        {users.map(user => (
                            <div key={user.id} className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 bg-[#caceca] border-2 border-[#6b7c6b] rounded">
                                <div className="flex items-center gap-4 mb-2 md:mb-0">
                                    <div className="w-12 h-12 flex items-center justify-center bg-[#e2e8e2] border-2 border-[#2f3e2f] rounded text-xl">
                                        {user.avatar}
                                    </div>
                                    <div>
                                        <div className="font-bold text-[#2f3e2f]">{user.username} <span className="text-sm opacity-70">({user.role})</span></div>
                                        <div className="text-xs text-[#2f3e2f] flex items-center gap-2">
                                            COLOR:
                                            <span className="inline-block w-4 h-4 border border-black" style={{ backgroundColor: user.themeColor }}></span>
                                            {user.themeColor}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2 w-full md:w-auto">
                                    {user.username !== 'Charmy' ? (
                                        <>
                                            <PixelButton onClick={() => openEdit(user)} style={{ flex: 1 }}>EDIT</PixelButton>
                                            <PixelButton onClick={() => handleDelete(user.id, user.username)} style={{ backgroundColor: '#ff3333', color: 'white', flex: 1 }}>DELETE</PixelButton>
                                        </>
                                    ) : (
                                        <div className="flex items-center justify-center px-4 py-2 border-2 border-transparent text-[#2f3e2f] opacity-50 font-bold" style={{ flex: 1 }}>
                                            [PROTECTED]
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </MossyFrame>
                
                {/* MILESTONE MANAGEMENT PANEL */}
                <div className="mt-8">
                    <MossyFrame title="MILESTONE MANAGEMENT">
                        <div className="mb-6 p-4 bg-[#caceca] border-2 border-[#6b7c6b] rounded">
                            <h3 className="text-xl font-bold mb-4 text-[#2f3e2f]">CREATE NEW MILESTONE</h3>
                            <form onSubmit={handleCreateMilestone} className="flex flex-col md:flex-row gap-4 items-end">
                                <label className="flex flex-col flex-1 text-[#2f3e2f] font-bold text-sm">
                                    TITLE
                                    <input
                                        type="text"
                                        className="mt-1 p-2 border-2 border-[#6b7c6b] bg-[#e2e8e2] outline-none"
                                        value={milestoneFormData.title}
                                        onChange={(e) => setMilestoneFormData({ ...milestoneFormData, title: e.target.value })}
                                        required
                                        placeholder="Event Name"
                                    />
                                </label>
                                <label className="flex flex-col text-[#2f3e2f] font-bold text-sm">
                                    START DATE
                                    <input
                                        type="date"
                                        className="mt-1 p-2 border-2 border-[#6b7c6b] bg-[#e2e8e2] outline-none"
                                        value={milestoneFormData.startDate}
                                        onChange={(e) => setMilestoneFormData({ ...milestoneFormData, startDate: e.target.value })}
                                        required
                                    />
                                </label>
                                <label className="flex flex-col text-[#2f3e2f] font-bold text-sm">
                                    DUE DATE
                                    <input
                                        type="date"
                                        className="mt-1 p-2 border-2 border-[#6b7c6b] bg-[#e2e8e2] outline-none"
                                        value={milestoneFormData.dueDate}
                                        onChange={(e) => setMilestoneFormData({ ...milestoneFormData, dueDate: e.target.value })}
                                        required
                                    />
                                </label>
                                <PixelButton type="submit" style={{ padding: '0.65rem 1rem' }}>ADD</PixelButton>
                            </form>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            {milestones.length === 0 ? (
                                <div className="text-center p-4 text-[#2f3e2f] opacity-70">NO MILESTONES FOUND</div>
                            ) : milestones.map(ms => (
                                <div key={ms.id} className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 bg-[#caceca] border-2 border-[#6b7c6b] rounded">
                                    <div className="flex flex-col mb-2 md:mb-0">
                                        <div className="font-bold text-[#2f3e2f] text-lg">{ms.title}</div>
                                        <div className="text-sm text-[#2f3e2f] opacity-80">
                                            {formatDateForInput(ms.startDate)} - {formatDateForInput(ms.dueDate)}
                                        </div>
                                    </div>
                                    <div className="flex gap-2 w-full md:w-auto">
                                        <PixelButton onClick={() => openEditMilestone(ms)} style={{ flex: 1 }}>EDIT</PixelButton>
                                        <PixelButton onClick={() => handleDeleteMilestone(ms.id, ms.title)} style={{ backgroundColor: '#ff3333', color: 'white', flex: 1 }}>DELETE</PixelButton>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </MossyFrame>
                </div>
            </div>

            {/* Edit User Modal */}
            {editUser && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalWindow}>
                        <h2 className={styles.title} style={{ marginBottom: '1.5rem', textAlign: 'center' }}>EDIT USER DATA</h2>
                        <form onSubmit={handleSave}>
                            <label className={styles.label}>
                                Username
                                <input
                                    className={styles.input}
                                    value={formData.username}
                                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                                    required
                                />
                            </label>
                            <label className={styles.label}>
                                Role
                                <select
                                    className={styles.select}
                                    value={formData.role}
                                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                                >
                                    <option value="ADMIN">ADMIN</option>
                                    <option value="PLANNER">PLANNER</option>
                                    <option value="PROGRAMMER">PROGRAMMER</option>
                                    <option value="DESIGNER">DESIGNER</option>
                                    <option value="MEMBER">MEMBER</option>
                                </select>
                            </label>
                            <label className={styles.label}>
                                Theme Color
                                <div className={styles.colorGrid}>
                                    {[
                                        '#0000ff', '#ff0000', '#00ff00',
                                        '#ffff00', '#00ccff', '#ff00ff',
                                        '#ff8800', '#ccff00', '#6600cc'
                                    ].map(c => (
                                        <div
                                            key={c}
                                            onClick={() => setFormData({ ...formData, themeColor: c })}
                                            className={`${styles.colorOption} ${formData.themeColor === c ? styles.selected : ''}`}
                                            style={{ backgroundColor: c }}
                                        />
                                    ))}
                                </div>
                            </label>
                            <label className={styles.label}>
                                Avatar
                                <select
                                    className={styles.select}
                                    style={{ fontFamily: 'monospace' }}
                                    value={formData.avatar}
                                    onChange={e => setFormData({ ...formData, avatar: e.target.value })}
                                >
                                    <option value="[o_o]">[o_o]</option>
                                    <option value="[-_-]">[-_-]</option>
                                    <option value="[^_^]">[^_^]</option>
                                    <option value="[>_<]">[&gt;_&lt;]</option>
                                    <option value="[@_@]">[@_@]</option>
                                    <option value="[*_*]">[*_*]</option>
                                    <option value="[T_T]">[T_T]</option>
                                    <option value="[x_x]">[x_x]</option>
                                    <option value="[~_~]">[~_~]</option>
                                    <option value="['.']">['.']</option>
                                    <option value="[?_?]">[?_?]</option>
                                </select>
                            </label>
                            <label className={styles.label}>
                                Reset Password
                                <input
                                    type="password"
                                    className={styles.input}
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    placeholder="Leave empty to keep current"
                                />
                            </label>

                            <div className={styles.actions} style={{ marginTop: '2rem' }}>
                                <PixelButton type="button" onClick={() => setEditUser(null)} style={{ flex: 1, opacity: 0.7 }}>CANCEL</PixelButton>
                                <PixelButton type="submit" style={{ flex: 1, backgroundColor: '#c06c4b', color: 'white' }}>SAVE</PixelButton>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Milestone Modal */}
            {editMilestone && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalWindow}>
                        <h2 className={styles.title} style={{ marginBottom: '1.5rem', textAlign: 'center' }}>EDIT MILESTONE</h2>
                        <form onSubmit={handleSaveMilestone}>
                            <label className={styles.label}>
                                Title
                                <input
                                    type="text"
                                    className={styles.input}
                                    value={milestoneFormData.title}
                                    onChange={e => setMilestoneFormData({ ...milestoneFormData, title: e.target.value })}
                                    required
                                />
                            </label>
                            <label className={styles.label}>
                                Start Date
                                <input
                                    type="date"
                                    className={styles.input}
                                    value={milestoneFormData.startDate}
                                    onChange={e => setMilestoneFormData({ ...milestoneFormData, startDate: e.target.value })}
                                    required
                                />
                            </label>
                            <label className={styles.label}>
                                Due Date
                                <input
                                    type="date"
                                    className={styles.input}
                                    value={milestoneFormData.dueDate}
                                    onChange={e => setMilestoneFormData({ ...milestoneFormData, dueDate: e.target.value })}
                                    required
                                />
                            </label>

                            <div className={styles.actions} style={{ marginTop: '2rem' }}>
                                <PixelButton type="button" onClick={() => setEditMilestone(null)} style={{ flex: 1, opacity: 0.7 }}>CANCEL</PixelButton>
                                <PixelButton type="submit" style={{ flex: 1, backgroundColor: '#c06c4b', color: 'white' }}>SAVE</PixelButton>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
