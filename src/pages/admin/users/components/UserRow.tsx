import type { UserRecord } from '../../../../hooks/useAllUsers';
import type { CourseAccessMap, StudentStream } from '../../../../types/user';
import { countAccessibleCourses } from '../../../../types/user';
import { getRoleLabel, getRoleBadgeClasses, computeDisplayRole } from '../utils/roleHelpers';

interface CourseOption {
  id: string;
  name: string;
}

export interface UserRowProps {
  user: UserRecord;
  currentUserUid: string | undefined;
  isSuperAdmin: boolean;
  courseOptions: CourseOption[];
  isExpanded: boolean;
  actionLoading: string | null;
  editingCourseAccess: CourseAccessMap | null;
  courseAccessSaving: boolean;
  onRowClick: () => void;
  onRemoveAdmin: () => void;
  onEditAdminCourses: () => void;
  onCourseAccessChange: (courseId: string, value: boolean) => void;
  onSaveCourseAccess: () => void;
  onSetStudentStream: (stream: StudentStream) => void;
  onToggleDisabled: () => void;
  canManageStudentStream: boolean;
}

export function UserRow({
  user,
  currentUserUid,
  isSuperAdmin,
  courseOptions,
  isExpanded,
  actionLoading,
  editingCourseAccess,
  courseAccessSaving,
  onRowClick,
  onRemoveAdmin,
  onEditAdminCourses,
  onCourseAccessChange,
  onSaveCourseAccess,
  onSetStudentStream,
  onToggleDisabled,
  canManageStudentStream,
}: UserRowProps) {
  const isCurrentUser = user.uid === currentUserUid;
  const userIsAdmin = user.role === 'admin' || user.role === 'super-admin';
  const displayRole = computeDisplayRole(user.role, user.courseAccess);
  const userCanEditCourseAccess = !userIsAdmin;
  const displayName =
    user.displayName && user.displayName.trim()
      ? user.displayName
      : user.pendingRegistration
        ? "Ожидает регистрацию"
        : "Без имени";

  // Используем единую утилиту для подсчёта курсов
  const courseIds = courseOptions.map((course) => course.id);
  const openCoursesCount = countAccessibleCourses(user.role, user.courseAccess, courseIds);

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
                {displayName}
                {user.pendingRegistration && (
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                    invite
                  </span>
                )}
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
            className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getRoleBadgeClasses(displayRole)}`}
          >
            {getRoleLabel(displayRole)}
          </span>
        </td>
        <td className="whitespace-nowrap px-6 py-4">
          <CourseAccessBadge
            isAdmin={userIsAdmin}
            count={openCoursesCount}
            total={courseIds.length}
          />
        </td>
        <td className="whitespace-nowrap px-6 py-4">
          <StudentStreamBadge stream={user.studentStream} />
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
            onRemoveAdmin={onRemoveAdmin}
            onEditAdminCourses={onEditAdminCourses}
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
          canManageCourseAccess={isSuperAdmin}
          canManageStudentStream={canManageStudentStream}
          courseOptions={courseOptions}
          onCourseAccessChange={onCourseAccessChange}
          onSaveCourseAccess={onSaveCourseAccess}
          onSetStudentStream={onSetStudentStream}
          studentStream={user.studentStream ?? 'none'}
          streamSaving={actionLoading === user.uid}
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

function getStudentStreamLabel(stream: StudentStream | undefined): string {
  if (stream === 'first') return '1 поток';
  if (stream === 'second') return '2 поток';
  return 'Без потока';
}

function StudentStreamBadge({ stream }: { stream: StudentStream | undefined }) {
  if (stream === 'first') {
    return (
      <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
        {getStudentStreamLabel(stream)}
      </span>
    );
  }

  if (stream === 'second') {
    return (
      <span className="inline-flex rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">
        {getStudentStreamLabel(stream)}
      </span>
    );
  }

  return <span className="text-sm text-gray-500">{getStudentStreamLabel(stream)}</span>;
}

/**
 * Кнопки управления ролью пользователя
 */
function RoleActions({
  user,
  currentUserUid,
  isSuperAdmin,
  actionLoading,
  onRemoveAdmin,
  onEditAdminCourses,
  onToggleDisabled,
}: {
  user: UserRecord;
  currentUserUid: string | undefined;
  isSuperAdmin: boolean;
  actionLoading: string | null;
  onRemoveAdmin: () => void;
  onEditAdminCourses: () => void;
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

      {user.role === 'admin' && (
        <>
          <ActionButton
            onClick={onEditAdminCourses}
            disabled={isLoading}
            variant="blue"
            label={isLoading ? 'Ждите...' : 'Курсы'}
            title="Какие курсы может редактировать"
          />
          <ActionButton
            onClick={onRemoveAdmin}
            disabled={isLoading}
            variant="red"
            label={isLoading ? 'Ждите...' : 'Снять права'}
          />
        </>
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
  canManageCourseAccess,
  canManageStudentStream,
  editingCourseAccess,
  courseAccessSaving,
  streamSaving,
  studentStream,
  courseOptions,
  onCourseAccessChange,
  onSaveCourseAccess,
  onSetStudentStream,
}: {
  user: UserRecord;
  isAdmin: boolean;
  canEdit: boolean;
  canManageCourseAccess: boolean;
  canManageStudentStream: boolean;
  editingCourseAccess: CourseAccessMap;
  courseAccessSaving: boolean;
  streamSaving: boolean;
  studentStream: StudentStream;
  courseOptions: CourseOption[];
  onCourseAccessChange: (courseId: string, value: boolean) => void;
  onSaveCourseAccess: () => void;
  onSetStudentStream: (stream: StudentStream) => void;
}) {
  return (
    <tr className="bg-gray-50">
      <td colSpan={7} className="px-6 py-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h4 className="mb-3 text-sm font-semibold text-gray-700">
            Доступ к курсам
            {isAdmin && user.role && (
              <span className="ml-2 text-xs font-normal text-gray-500">
                (роль {getRoleLabel(user.role)} имеет полный доступ)
              </span>
            )}
            {!user.role && (
              <span className="ml-2 text-xs font-normal text-blue-500">
                (снятие галочки ограничит доступ)
              </span>
            )}
          </h4>

          <div className="mb-4 flex flex-wrap gap-4">
            {courseOptions.map((course) => (
              <label
                key={course.id}
                className={`flex items-center gap-2 rounded-lg border p-3 transition ${
                  isAdmin || !canManageCourseAccess
                    ? 'cursor-not-allowed border-gray-200 bg-gray-50 opacity-60'
                    : editingCourseAccess[course.id]
                    ? 'border-green-300 bg-green-50'
                    : 'border-red-200 bg-red-50 hover:border-red-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isAdmin || editingCourseAccess[course.id] || false}
                  disabled={isAdmin || !canManageCourseAccess}
                  onChange={(e) => onCourseAccessChange(course.id, e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                />
                <span className="text-sm font-medium text-gray-700">{course.name}</span>
              </label>
            ))}
          </div>

          {canEdit && canManageCourseAccess && (
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

          {canManageStudentStream && (
            <div className="mt-4 border-t border-gray-100 pt-4">
              <h5 className="mb-2 text-sm font-semibold text-gray-700">Поток студента</h5>
              <div className="flex flex-wrap items-center gap-2">
                {(['none', 'first', 'second'] as StudentStream[]).map((streamOption) => (
                  <button
                    key={streamOption}
                    type="button"
                    onClick={() => onSetStudentStream(streamOption)}
                    disabled={streamSaving}
                    className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition ${
                      studentStream === streamOption
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                    } disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    {getStudentStreamLabel(streamOption)}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Выбор потока влияет на список курсов на главной странице студента.
              </p>
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
