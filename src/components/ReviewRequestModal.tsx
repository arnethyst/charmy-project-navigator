'use client';

import { useState } from 'react';
import { PixelButton } from './ui/PixelButton';
import { MossyFrame } from './ui/MossyFrame';
import { createReviewRequest } from '../actions/communications';

export function ReviewRequestModal({
    taskId,
    users,
    currentUserId,
    onClose,
    onSuccess
}: {
    taskId: string;
    users: any[];
    currentUserId: string;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [message, setMessage] = useState('');
    const [selectedReviewers, setSelectedReviewers] = useState<Set<string>>(new Set());
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Filter out the current user from the reviewer list
    const availableReviewers = users.filter(u => u.id !== currentUserId && u.username !== 'charmy' && u.name !== 'Charmy');

    const toggleReviewer = (id: string) => {
        const newSet = new Set(selectedReviewers);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedReviewers(newSet);
    };

    const handleSubmit = async () => {
        if (selectedReviewers.size === 0) {
            alert('少なくとも1人の確認者（レビュアー）を選択してください。');
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await createReviewRequest(taskId, Array.from(selectedReviewers), message);
            if (result.success) {
                onSuccess();
            } else {
                alert('確認依頼の作成に失敗しました: ' + result.error);
            }
        } catch (error) {
            console.error(error);
            alert('確認依頼の作成中にエラーが発生しました');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
        }}>
            <div style={{ width: '100%', maxWidth: '600px', backgroundColor: 'var(--bg-main)' }}>
                <MossyFrame title="^ 確認依頼 (Review Request)" style={{ boxShadow: '0 0 20px var(--color-flower) inset' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1rem' }}>

                        <div style={{ padding: '1rem', backgroundColor: 'rgba(230,200,250,0.05)', border: '1px dashed var(--color-flower)' }}>
                            <p style={{ color: 'var(--color-flower)', marginBottom: '0.5rem', fontWeight: 'bold' }}>タスクを [確認待ち] ステータスに変更し、報告を送ります。</p>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>指定したユーザーの「確認要請一覧」にタスクが表示されます。</p>
                        </div>

                        <label>
                            <span className="pixel-text" style={{ color: 'var(--color-flower)' }}>確認者 (複数選択可) *</span>
                            <div style={{
                                display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.5rem',
                                padding: '1rem', backgroundColor: 'var(--bg-sunken)', border: '2px solid var(--color-flower)'
                            }}>
                                {availableReviewers.map(u => (
                                    <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedReviewers.has(u.id)}
                                            onChange={() => toggleReviewer(u.id)}
                                            style={{ accentColor: 'var(--color-flower)' }}
                                        />
                                        <div style={{
                                            width: '12px', height: '12px', borderRadius: '50%',
                                            backgroundColor: u.themeColor || 'var(--text-main)'
                                        }} />
                                        <span>{u.name || u.username}</span>
                                    </label>
                                ))}
                                {availableReviewers.length === 0 && <span style={{ opacity: 0.5 }}>選択可能なユーザーがいません</span>}
                            </div>
                        </label>

                        <label>
                            <span className="pixel-text" style={{ color: 'var(--color-flower)' }}>確認メッセージ / 報告事項</span>
                            <textarea
                                value={message}
                                onChange={e => setMessage(e.target.value)}
                                placeholder="例: PRのレビューをお願いします / 画面崩れの修正が完了しました"
                                rows={4}
                                style={{ width: '100%', padding: '0.5rem', fontFamily: 'inherit', backgroundColor: 'var(--bg-sunken)', border: '2px solid var(--text-main)', outlineColor: 'var(--color-flower)' }}
                            />
                        </label>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                            <button
                                onClick={onClose}
                                disabled={isSubmitting}
                                style={{ padding: '0.5rem 1rem', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--text-muted)', cursor: 'pointer' }}
                                className="hover:text-white transition-colors"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting || selectedReviewers.size === 0}
                                style={{
                                    padding: '0.5rem 1rem',
                                    background: isSubmitting || selectedReviewers.size === 0 ? 'var(--text-muted)' : 'transparent',
                                    color: isSubmitting || selectedReviewers.size === 0 ? '#000' : 'var(--color-flower)',
                                    border: `1px solid ${isSubmitting || selectedReviewers.size === 0 ? 'transparent' : 'var(--color-flower)'}`,
                                    cursor: isSubmitting || selectedReviewers.size === 0 ? 'not-allowed' : 'pointer',
                                    fontWeight: 'bold'
                                }}
                                className="hover:bg-[var(--color-flower)] hover:text-black transition-colors"
                            >
                                {isSubmitting ? '処理中...' : '[送信] 報告して確認を依頼する'}
                            </button>
                        </div>
                    </div>
                </MossyFrame>
            </div>
        </div>
    );
}
