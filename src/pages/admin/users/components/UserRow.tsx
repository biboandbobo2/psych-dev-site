import type { UserRecord } from '../../../../hooks/useAllUsers';
import type { CourseAccessMap } from '../../../../types/user';
import { ALL_COURSE_TYPES, COURSE_LABELS, countAccessibleCourses } from '../../../../types/user';
import { getRoleLabel, getRoleBadgeClasses, isAdminRole, canEditCourseAccess } from '../utils/roleHelpers';

export interface UserRowProps {
  user: UserRecord;
  currentUserUid: string | undefined;
  isSuperAdmin: boolean;
  isExpanded: boolean;
  actionLoading: string | null;
  editingCourseAccess: CourseAccessMap | null;
  courseAccessSaving: boolean;
  onRowClick: () => void;
  onMakeAdmin: () => void;
  onRemoveAdmin: () => void;
  onCourseAccessChange: (course: keyof CourseAccessMap, value: boolean) => void;
  onSaveCourseAccess: () => void;
  onSetRole: (role: 'guest' | 'student') => void;
  onToggleDisabled: () => void;
}

export function UserRow({
  user,
  currentUserUid,
  isSuperAdmin,
  isExpanded,
  actionLoading,
  editingCourseAccess,
  courseAccessSaving,
  onRowClick,
  onMakeAdmin,
  onRemoveAdmin,
  onCourseAccessChange,
  onSaveCourseAccess,
  onSetRole,
  onToggleDisabled,
}: UserRowProps) {
  const isCurrentUser = user.uid === currentUserUid;
  const userIsAdmin = isAdminRole(user.role);
  const userCanEditCourseAccess = canEditCourseAccess(user.role);

  // Используем единую утилиту для подсчёта курсов
  const openCoursesCount = countAccessibleCourses(user.role, user.courseAccess);

  return (
    <>
      <tr
        className={`cursor-pointer transition-colors ${
          isCurrentUser ? 'bg-blue-50' : isExpanded ? 'bg-gray-50' : 'hover:bg-gray-50'
        }`}
        onClick={onRowClick}
      >
        <td className="whitespace-nowrap px-6 py-4">
          <div className="flex items-center">
            {user.photoURL && (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User'}
                className="mr-3 h-10 w-10 rounded-full"
              />
            )}
            <div>
              <div className="flex items-center gap-1.5 text-sm font-medium text-gray-900">
                {user.displayName || 'Без имени'}
                {user.geminiApiKey && (
                  <span
                    className="inline-block w-2 h-2 rounded-full bg-emerald-500"
                    title="Свой API ключ Gemini"
                  />
                )}
              </div>
              <div className="text-sm text-gray-500">UID: {user.uid.substring(0, 8)}...</div>
            </div>
          </div>
        </td>
        <td className="whitespace-nowrap px-6 py-4">
          <div className="text-sm text-gray-900">{user.email}</div>
        </td>
        <td className="whitespace-nowrap px-6 py-4">
          <span
            className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getRoleBadgeClasses(user.role)}`}
          >
            {getRoleLabel(user.role)}
          </span>
        </td>
        <td className="whitespace-nowrap px-6 py-4">
          <CourseAccessBadge
            isAdmin={userIsAdmin}
            count={openCoursesCount}
            total={ALL_COURSE_TYPES.length}
          />
        </td>
        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
          {user.lastLoginAt?.toDate?.()?.toLocaleDateString('ru-RU') || 'Недавно'}
        </td>
        <td className="whitespace-nowrap px-6 py-4 text-sm" onClick={(e) => e.stopPropagation()}>
          <RoleActions
            user={user}
            currentUserUid={currentUserUid}
            isSuperAdmin={isSuperAdmin}
            actionLoading={actionLoading}
            onMakeAdmin={onMakeAdmin}
            onRemoveAdmin={onRemoveAdmin}
            onSetRole={onSetRole}
            onToggleDisabled={onToggleDisabled}
          />
        </td>
      </tr>

      {/* Раскрывающаяся строка с управлением доступом к курсам */}
      {isExpanded && editingCourseAccess && (
        <CourseAccessPanel
          user={user}
          isAdmin={userIsAdmin}
          canEdit={userCanEditCourseAccess}
          editingCourseAccess={editingCourseAccess}
          courseAccessSaving={courseAccessSaving}
          onCourseAccessChange={onCourseAccessChange}
          onSaveCourseAccess={onSaveCourseAccess}
        />
      )}
    </>
  );
}

/**
 * Бейдж отображения доступа к курсам
 */
function CourseAccessBadge({
  isAdmin,
  count,
  total,
}: {
  isAdmin: boolean;
  count: number;
  total: number;
}) {
  if (isAdmin) {
    return <span className="text-sm text-green-600">Полный доступ</span>;
  }
  if (count === total) {
    return <span className="text-sm text-green-600">Все курсы</span>;
  }
  if (count === 0) {
    return <span className="text-sm text-red-600">Нет доступа</span>;
  }
  return (
    <span className="text-sm text-yellow-600">
      {count} из {total}
    </span>
  );
}

/**
 * Кнопки управления ролью пользователя
 */
function RoleActions({
  user,
  currentUserUid,
  isSuperAdmin,
  actionLoading,
  onMakeAdmin,
  onRemoveAdmin,
  onSetRole,
  onToggleDisabled,
}: {
  user: UserRecord;
  currentUserUid: string | undefined;
  isSuperAdmin: boolean;
  actionLoading: string | null;
  onMakeAdmin: () => void;
  onRemoveAdmin: () => void;
  onSetRole: (role: 'guest' | 'student') => void;
  onToggleDisabled: () => void;
}) {
  if (!isSuperAdmin || user.uid === currentUserUid) {
    return <span className="text-gray-400">—</span>;
  }

  const isLoading = actionLoading === user.uid;
  const isDisabled = user.disabled === true;

  return (
    <div className="flex flex-wrap gap-2">
      {/* Кнопка отключения/включения пользователя */}
      {user.role !== 'super-admin' && (
        <ActionButton
          onClick={onToggleDisabled}
          disabled={isLoading}
          variant={isDisabled ? 'green' : 'gray'}
          label={isLoading ? 'Ждите...' : isDisabled ? 'Включить' : 'Отключить'}
          title={isDisabled ? 'Включить пользователя' : 'Отключить (данные сохранятся)'}
        />
      )}

      {user.role === 'guest' && (
        <>
          <ActionButton
            onClick={() => onSetRole('student')}
            disabled={isLoading}
            variant="blue"
            label={isLoading ? 'Ждите...' : 'Студент'}
          />
          <ActionButton
            onClick={onMakeAdmin}
            disabled={isLoading}
            variant="green"
            label={isLoading ? 'Ждите...' : 'Админ'}
          />
        </>
      )}
      {user.role === 'student' && (
        <>
          <ActionButton
            onClick={() => onSetRole('guest')}
            disabled={isLoading}
            variant="yellow"
            label={isLoading ? 'Ждите...' : 'Гость'}
          />
          <ActionButton
            onClick={onMakeAdmin}
            disabled={isLoading}
            variant="green"
            label={isLoading ? 'Ждите...' : 'Админ'}
          />
        </>
      )}
      {user.role === 'admin' && (
        <ActionButton
          onClick={onRemoveAdmin}
          disabled={isLoading}
          variant="red"
          label={isLoading ? 'Ждите...' : 'Снять права'}
        />
      )}
      {user.role === 'super-admin' && (
        <span className="text-gray-400">Super-admin</span>
      )}
    </div>
  );
}

/**
 * Универсальная кнопка действия
 */
function ActionButton({
  onClick,
  disabled,
  variant,
  label,
  title,
}: {
  onClick: () => void;
  disabled: boolean;
  variant: 'blue' | 'green' | 'yellow' | 'red' | 'gray';
  label: string;
  title?: string;
}) {
  const variantClasses = {
    blue: 'bg-blue-600 hover:bg-blue-700',
    green: 'bg-green-600 hover:bg-green-700',
    yellow: 'bg-yellow-600 hover:bg-yellow-700',
    red: 'bg-red-600 hover:bg-red-700',
    gray: 'bg-gray-500 hover:bg-gray-600',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`rounded px-3 py-1 text-white transition ${variantClasses[variant]} disabled:bg-gray-400`}
    >
      {label}
    </button>
  );
}

/**
 * Панель управления доступом к курсам
 */
function CourseAccessPanel({
  user,
  isAdmin,
  canEdit,
  editingCourseAccess,
  courseAccessSaving,
  onCourseAccessChange,
  onSaveCourseAccess,
}: {
  user: UserRecord;
  isAdmin: boolean;
  canEdit: boolean;
  editingCourseAccess: CourseAccessMap;
  courseAccessSaving: boolean;
  onCourseAccessChange: (course: keyof CourseAccessMap, value: boolean) => void;
  onSaveCourseAccess: () => void;
}) {
  return (
    <tr className="bg-gray-50">
      <td colSpan={6} className="px-6 py-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h4 className="mb-3 text-sm font-semibold text-gray-700">
            Доступ к курсам
            {isAdmin && (
              <span className="ml-2 text-xs font-normal text-gray-500">
                (роль {getRoleLabel(user.role)} имеет полный доступ)
              </span>
            )}
            {user.role === 'student' && (
              <span className="ml-2 text-xs font-normal text-blue-500">
                (снятие галочки ограничит доступ)
              </span>
            )}
          </h4>

          <div className="mb-4 flex flex-wrap gap-4">
            {ALL_COURSE_TYPES.map((course) => (
              <label
                key={course}
                className={`flex items-center gap-2 rounded-lg border p-3 transition ${
                  isAdmin
                    ? 'cursor-not-allowed border-gray-200 bg-gray-50 opacity-60'
                    : editingCourseAccess[course]
                    ? 'border-green-300 bg-green-50'
                    : 'border-red-200 bg-red-50 hover:border-red-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isAdmin || editingCourseAccess[course] || false}
                  disabled={isAdmin}
                  onChange={(e) => onCourseAccessChange(course, e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                />
                <span className="text-sm font-medium text-gray-700">{COURSE_LABELS[course]}</span>
              </label>
            ))}
          </div>

          {canEdit && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onSaveCourseAccess}
                disabled={courseAccessSaving}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:bg-gray-400"
              >
                {courseAccessSaving ? 'Сохранение...' : 'Сохранить изменения'}
              </button>
              <span className="text-xs text-gray-500">
                Изменения вступят в силу немедленно
              </span>
            </div>
          )}

          {isAdmin && (
            <p className="text-xs text-gray-500">
              Администраторы имеют полный доступ ко всем курсам.
            </p>
          )}
        </div>
      </td>
    </tr>
  );
}
