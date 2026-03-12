'use client';

import { useMemo } from 'react';
import clsx from 'clsx';

interface User {
    id: string;
    name?: string | null;
    username?: string;
}

export const GanttCalendar = ({ users }: { users: User[] }) => {
    // 1. 状態管理はいったん削除し、今固定の月（今月）として処理します。
    // ※今回は「タスク描画や月めくり機能はいったん忘れ」との指示のため静的に表示。
    const currentMonth = useMemo(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
    }, []);

    // ヘッダー表示用の年・月文字列
    const yearMonthLabel = `${currentMonth.getFullYear()}年${currentMonth.getMonth() + 1}月`;

    // 2. カレンダーの生成ロジック
    // 選択されている「月」の総日数（28日〜31日）を計算し、1日から末日までの配列を生成
    const days = useMemo(() => {
        const result: Date[] = [];
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        for (let i = 1; i <= daysInMonth; i++) {
            result.push(new Date(year, month, i));
        }
        return result;
    }, [currentMonth]);

    const usersList = users.concat([{ id: 'unassigned', name: '未割り当て' }]);

    return (
        <div className="w-full h-full flex flex-col font-mono text-[var(--color-moss-dark)] bg-[#e5e5dc]">
            {/* デザイン維持：ハッカー風のヘッダー */}
            <div className="p-4 border-b border-[#334433] flex items-center justify-between bg-[var(--color-sunken)]">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <span className="text-[var(--color-rust)]">SYSTEM_GANTT</span> v3.0.0
                </h2>
                <div className="flex items-center gap-4">
                    <span className="font-bold text-lg">{yearMonthLabel}</span>
                </div>
            </div>

            {/* 3. 鉄壁のTableレイアウト（厳守） */}
            <div className="flex-1 overflow-auto p-4 bg-[#e5e5dc]">
                {/* 全体コンテナ: 横スクロール可能 */}
                <div className="w-full overflow-x-auto border-2 border-[#334433] bg-[#e5e5dc] font-mono text-[#334433]">
                    <table className="w-max border-collapse">
                        <thead>
                            <tr>
                                <th className="sticky left-0 z-20 w-[150px] min-w-[150px] border-b-2 border-r-2 border-[#334433] bg-[#dcdcdc] p-2 text-left font-bold shadow-sm">
                                    Assignee
                                </th>
                                {/* ↓ calendarDays 等をマップ展開 */}
                                {days.map((day, index) => {
                                    const dayOfWeek = day.getDay();
                                    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                                    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
                                    return (
                                        <th key={index} className={clsx("w-[40px] min-w-[40px] border-b-2 border-r border-[#334433] text-center text-xs font-normal py-1", isWeekend && "bg-black/10 text-[#cc6633]")}>
                                            {/* 日付を表示 */}
                                            <div className="flex flex-col items-center justify-center">
                                                <span className="font-bold">{day.getDate()}</span>
                                                <span className="text-[10px] opacity-70">{dayNames[dayOfWeek]}</span>
                                            </div>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {/* ↓ ユーザーの配列をマップ展開 */}
                            {usersList.map((user) => (
                                <tr key={user.id} className="hover:bg-[#dcdcdc] transition-colors">
                                    <td className="sticky left-0 z-10 w-[150px] min-w-[150px] border-b border-r-2 border-[#334433] bg-[#e5e5dc] p-2 text-sm">
                                        <div className="truncate w-full" title={user.name || user.username}>
                                            {user.name || user.username}
                                        </div>
                                    </td>
                                    {/* ↓ calendarDays と同じ数だけ空のマス目を展開 */}
                                    {days.map((day, index) => {
                                        const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                                        return (
                                            <td key={`cell-${index}`} className={clsx("w-[40px] min-w-[40px] h-[50px] border-b border-r border-[#334433]/40 border-dashed", isWeekend && "bg-black/5")}>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
