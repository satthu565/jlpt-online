'use client';

import React, { useState } from 'react';
import { Button, Input, Select } from '@jlpt/ui';
import type { Role } from '@jlpt/schema';
import type { StaffUser } from '../../lib/auth-context';
import type { AdminManagedUser, AuditLogEntry } from './types';
import { UserManager } from './user-service';

export interface UserListTableProps {
  currentUser: StaffUser;
  userManager: UserManager;
  onRoleChanged?: (userId: string, newRole: Role) => void;
  onStatusChanged?: (userId: string, isBlocked: boolean) => void;
}

export const AVAILABLE_ROLES: { role: Role; label: string; desc: string }[] = [
  { role: 'admin', label: 'Quản trị viên (Admin)', desc: 'Toàn quyền cấu hình, phân quyền, xuất bản đề và xem audit logs' },
  { role: 'editor', label: 'Biên tập viên (Editor)', desc: 'Soạn thảo câu hỏi RichText, bản thiết kế và tạo đề thi' },
  { role: 'reviewer', label: 'Người duyệt đề (Reviewer)', desc: 'Kiểm duyệt câu hỏi, lời giải và duyệt đề thi (nguyên tắc 4 mắt)' },
  { role: 'moderator', label: 'Điều hành viên (Moderator)', desc: 'Kiểm duyệt diễn đàn, bình luận và nội dung cộng đồng' },
  { role: 'billing_admin', label: 'Quản trị tài chính (Billing)', desc: 'Quản lý gói cước, giao dịch, hoàn tiền và báo cáo doanh thu' },
  { role: 'student', label: 'Học viên (Student)', desc: 'Luyện thi, làm bài tập và xem kết quả cá nhân' },
];

/**
 * User Table component displaying user details, role management, and block/unblock actions.
 */
export function UserListTable({
  currentUser,
  userManager,
  onRoleChanged,
  onStatusChanged,
}: UserListTableProps): React.JSX.Element {
  const [keyword, setKeyword] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<AdminManagedUser | null>(null);
  const [pendingRole, setPendingRole] = useState<Role>('editor');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [, setRefreshKey] = useState(0);

  const users = userManager.listUsers(currentUser, {
    keyword: keyword || undefined,
    role: roleFilter === 'all' ? undefined : (roleFilter as Role),
  });

  const handleOpenRoleModal = (u: AdminManagedUser) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setSelectedUser(u);
    setPendingRole(u.role);
  };

  const handleSaveRole = () => {
    if (!selectedUser) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // Calls userManager.updateUserRole - enforces Admin check & self-elevation prevention!
      userManager.updateUserRole(currentUser, selectedUser.id, pendingRole);
      setSuccessMsg(`Đã cập nhật vai trò của ${selectedUser.email} thành ${pendingRole}.`);
      onRoleChanged?.(selectedUser.id, pendingRole);
      setSelectedUser(null);
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Lỗi khi cập nhật vai trò.');
    }
  };

  const handleToggleBlock = (u: AdminManagedUser) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    const currentlyBlocked = Boolean(u.blockedAt);

    try {
      userManager.setUserBlocked(currentUser, u.id, !currentlyBlocked, currentlyBlocked ? undefined : 'Khóa bởi quản trị viên');
      setSuccessMsg(`Đã ${currentlyBlocked ? 'mở khóa' : 'khóa'} tài khoản ${u.email}.`);
      onStatusChanged?.(u.id, !currentlyBlocked);
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Lỗi khi thay đổi trạng thái tài khoản.');
    }
  };

  return (
    <div data-testid="user-management-panel" className="space-y-4">
      {/* Alert notices */}
      {errorMsg && (
        <div data-testid="user-error-alert" className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div data-testid="user-success-alert" className="p-3 bg-green-50 border border-green-200 text-green-700 rounded text-sm">
          {successMsg}
        </div>
      )}

      {/* Filter toolbar */}
      <div className="flex flex-wrap gap-3 items-center justify-between bg-white dark:bg-slate-900 p-3 border border-gray-200 dark:border-slate-800 rounded-lg">
        <div className="flex items-center space-x-2">
          <Input
            type="text"
            data-testid="input-user-search"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Tìm theo email hoặc tên..."
            className="w-64"
          />
          <Select
            data-testid="select-role-filter"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-48"
          >
            <option value="all">Tất cả vai trò</option>
            {AVAILABLE_ROLES.map((r) => (
              <option key={r.role} value={r.role}>
                {r.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="text-xs text-gray-500">
          Tìm thấy <strong className="text-gray-800 dark:text-slate-200">{users.length}</strong> tài khoản
        </div>
      </div>

      {/* Users table */}
      <div className="overflow-x-auto bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800 text-sm">
          <thead className="bg-gray-50 dark:bg-slate-800/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider text-xs">Người dùng</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider text-xs">Vai trò</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider text-xs">2FA</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider text-xs">Trạng thái</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase tracking-wider text-xs">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} data-testid="users-empty" className="px-4 py-6 text-center text-gray-400 italic">
                  Không tìm thấy người dùng phù hợp.
                </td>
              </tr>
            ) : (
              users.map((u) => {
                const isBlocked = Boolean(u.blockedAt);
                return (
                  <tr key={u.id} data-testid={`user-row-${u.id}`} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-slate-100">{u.name}</div>
                      <div className="text-xs text-gray-500">{u.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        data-testid={`user-role-badge-${u.id}`}
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          u.role === 'admin'
                            ? 'bg-red-100 text-red-800'
                            : u.role === 'editor'
                            ? 'bg-blue-100 text-blue-800'
                            : u.role === 'reviewer'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-medium ${
                          u.twoFactorEnabled
                            ? 'bg-green-100 text-green-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {u.twoFactorEnabled ? 'Đã bật' : 'Chưa bật'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        data-testid={`user-status-${u.id}`}
                        className={`text-xs px-2 py-0.5 rounded font-medium ${
                          isBlocked ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {isBlocked ? 'Bị khóa' : 'Hoạt động'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        data-testid={`btn-edit-role-${u.id}`}
                        onClick={() => handleOpenRoleModal(u)}
                      >
                        Đổi vai trò
                      </Button>
                      <Button
                        type="button"
                        variant={isBlocked ? 'outline' : 'destructive'}
                        size="sm"
                        data-testid={`btn-toggle-block-${u.id}`}
                        onClick={() => handleToggleBlock(u)}
                      >
                        {isBlocked ? 'Mở khóa' : 'Khóa'}
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Role Change Modal */}
      {selectedUser && (
        <div data-testid="role-change-modal" className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-base font-bold text-gray-900">
              Đổi vai trò người dùng: {selectedUser.email}
            </h3>
            <p className="text-xs text-gray-500">
              Chỉ Quản trị viên (Admin) mới có thẩm quyền đổi vai trò nhân sự. Biên tập viên không thể tự nâng quyền.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-700 dark:text-slate-300 block">Chọn vai trò mới:</label>
              <Select
                data-testid="modal-select-role"
                value={pendingRole}
                onChange={(e) => setPendingRole(e.target.value as Role)}
                className="w-full"
              >
                {AVAILABLE_ROLES.map((r) => (
                  <option key={r.role} value={r.role}>
                    {r.label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-gray-200 dark:border-slate-800">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                data-testid="btn-cancel-role-modal"
                onClick={() => setSelectedUser(null)}
              >
                Hủy
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                data-testid="btn-confirm-role-change"
                onClick={handleSaveRole}
              >
                Lưu vai trò
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export interface AuditLogTimelineProps {
  logs: AuditLogEntry[];
}

/**
 * Audit Log Timeline viewer component.
 */
export function AuditLogTimeline({ logs }: AuditLogTimelineProps): React.JSX.Element {
  if (logs.length === 0) {
    return (
      <div data-testid="audit-empty" className="p-6 bg-white border rounded-lg text-center text-gray-400 text-sm">
        Chưa có nhật ký hoạt động nào.
      </div>
    );
  }

  return (
    <div data-testid="audit-log-timeline" className="bg-white border rounded-lg p-4 space-y-3">
      <h3 className="text-sm font-bold text-gray-800 border-b pb-2">Nhật ký kiểm toán hệ thống ({logs.length})</h3>
      <div className="space-y-2">
        {logs.map((log) => (
          <div key={log.id} data-testid={`audit-entry-${log.id}`} className="text-xs p-2.5 rounded bg-gray-50 border space-y-1">
            <div className="flex items-center justify-between text-gray-500">
              <span className="font-semibold text-gray-800">
                Thao tác: <code className="bg-gray-200 px-1 rounded text-purple-700">{log.action}</code>
              </span>
              <span>{new Date(log.timestamp).toLocaleString('vi-VN')}</span>
            </div>
            <div className="text-gray-700">
              Người thực hiện (Actor): <strong data-testid={`audit-actor-${log.id}`} className="text-blue-700">{log.operatorEmail || log.operatorId}</strong> • Đơn vị (Tenant):{' '}
              <span data-testid={`audit-tenant-${log.id}`} className="font-semibold text-emerald-700">{log.tenantId || 'global'}</span> • Tài nguyên:{' '}
              <code>{log.targetResource}/{log.targetId}</code>
            </div>
            {log.details && Object.keys(log.details).length > 0 && (
              <pre className="text-[11px] bg-white p-1.5 rounded border text-gray-600 overflow-x-auto">
                {JSON.stringify(log.details, null, 2)}
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
