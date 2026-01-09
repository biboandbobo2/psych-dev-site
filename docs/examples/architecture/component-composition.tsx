/**
 * Примеры композиции компонентов
 *
 * Из: docs/architecture/guidelines.md
 * Дата: 2026-01-08
 */

// ============================================================
// 1. БАЗОВАЯ КОМПОЗИЦИЯ
// ============================================================

// ❌ ПЛОХО: Монолитный компонент
function AdminContentEditBad() {
  const [title, setTitle] = useState('');
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(false);
  // ... 50 useState

  const handleSave = async () => {
    // ... 100 строк логики
  };

  const handleValidate = () => {
    // ... 50 строк валидации
  };

  return (
    <div>
      {/* 200 строк JSX */}
      <form>
        <input value={title} onChange={e => setTitle(e.target.value)} />
        {/* ... множество полей */}
      </form>
    </div>
  );
}

// ✅ ХОРОШО: Композиция из маленьких компонентов
function AdminContentEditGood() {
  const { content, updateContent } = useContent();

  return (
    <>
      <ContentHeader />
      <ContentForm content={content} onUpdate={updateContent} />
      <ContentPreview content={content} />
    </>
  );
}

// ============================================================
// 2. МОДАЛЬНОЕ ОКНО - КОМПОЗИЦИЯ
// ============================================================

// ✅ ХОРОШО: Композируемая модалка
function UserProfileModal() {
  return (
    <Modal>
      <ModalHeader title="Профиль пользователя" onClose={handleClose} />
      <ModalBody>
        <UserForm user={user} onSubmit={handleSubmit} />
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={handleClose}>
          Отмена
        </Button>
        <Button variant="primary" onClick={handleSubmit}>
          Сохранить
        </Button>
      </ModalFooter>
    </Modal>
  );
}

// ============================================================
// 3. RENDER PROPS PATTERN
// ============================================================

// Компонент с render prop для гибкой кастомизации
interface DataLoaderProps<T> {
  url: string;
  children: (data: T, loading: boolean, error: Error | null) => ReactNode;
}

function DataLoader<T>({ url, children }: DataLoaderProps<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetch(url)
      .then(res => res.json())
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [url]);

  return children(data!, loading, error);
}

// Использование
function UsersList() {
  return (
    <DataLoader<User[]> url="/api/users">
      {(users, loading, error) => {
        if (loading) return <Spinner />;
        if (error) return <ErrorMessage error={error} />;
        return <UserTable users={users} />;
      }}
    </DataLoader>
  );
}

// ============================================================
// 4. COMPOUND COMPONENTS PATTERN
// ============================================================

// Группа взаимосвязанных компонентов с общим контекстом
const TabsContext = createContext<{
  activeTab: string;
  setActiveTab: (tab: string) => void;
} | null>(null);

function Tabs({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTab] = useState<string>('');

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className="tabs">{children}</div>
    </TabsContext.Provider>
  );
}

function TabList({ children }: { children: ReactNode }) {
  return <div className="tab-list">{children}</div>;
}

function Tab({ id, children }: { id: string; children: ReactNode }) {
  const context = useContext(TabsContext);
  if (!context) throw new Error('Tab must be used within Tabs');

  const { activeTab, setActiveTab } = context;
  const isActive = activeTab === id;

  return (
    <button
      className={isActive ? 'tab-active' : 'tab'}
      onClick={() => setActiveTab(id)}
    >
      {children}
    </button>
  );
}

function TabPanel({ id, children }: { id: string; children: ReactNode }) {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabPanel must be used within Tabs');

  const { activeTab } = context;
  if (activeTab !== id) return null;

  return <div className="tab-panel">{children}</div>;
}

// Использование
function SettingsPage() {
  return (
    <Tabs>
      <TabList>
        <Tab id="general">Общие</Tab>
        <Tab id="security">Безопасность</Tab>
        <Tab id="notifications">Уведомления</Tab>
      </TabList>

      <TabPanel id="general">
        <GeneralSettings />
      </TabPanel>
      <TabPanel id="security">
        <SecuritySettings />
      </TabPanel>
      <TabPanel id="notifications">
        <NotificationSettings />
      </TabPanel>
    </Tabs>
  );
}

// ============================================================
// 5. HIGHER-ORDER COMPONENTS (HOC) - ИСПОЛЬЗУЙ С ОСТОРОЖНОСТЬЮ
// ============================================================

// ⚠️ HOC можно использовать, но хуки обычно лучше
function withAuth<P extends object>(Component: ComponentType<P>) {
  return function AuthenticatedComponent(props: P) {
    const { user, loading } = useAuth();

    if (loading) return <Spinner />;
    if (!user) return <Navigate to="/login" />;

    return <Component {...props} />;
  };
}

// Использование
const ProtectedDashboard = withAuth(Dashboard);

// ✅ ЛУЧШЕ: Используй хук вместо HOC
function Dashboard() {
  useRequireAuth(); // Хук который редиректит если не авторизован

  return <div>Dashboard content</div>;
}
