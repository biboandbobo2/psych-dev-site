import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GroupZoomAttendancePanel } from "./GroupZoomAttendancePanel";
import { MyZoomAttendance } from "./MyZoomAttendance";
import type { ZoomAttendanceResponse } from "../../../shared/zoomAttendance";

const api = vi.hoisted(() => ({
  getAttendance: vi.fn(),
  matchParticipant: vi.fn(),
  setConnection: vi.fn(),
  syncAttendance: vi.fn(),
  getMyAttendance: vi.fn(),
}));
vi.mock("./api", () => api);
const response: ZoomAttendanceResponse = {
  settings: { accountKey: "a", minPercent: 70 },
  accounts: [{ key: "a", label: "Аккаунт" }],
  accountsConfigured: true,
  canConfigure: true,
  events: [
    {
      id: "e1",
      title: "Первое",
      startAtMs: 1,
      endAtMs: 2,
      status: "ready",
      message: null,
      syncedAtMs: 2,
    },
    {
      id: "e2",
      title: "Второе",
      startAtMs: 3,
      endAtMs: 4,
      status: "ready",
      message: null,
      syncedAtMs: 4,
    },
  ],
  students: [{ uid: "s1", displayName: "Студент", email: "" }],
  participants: [
    {
      key: "p1",
      name: "Гость",
      email: null,
      minutes: 20,
      studentId: null,
      matchSource: null,
      canRemember: false,
    },
  ],
  attendance: [{ uid: "s1", minutes: 20, percent: 80, present: true }],
};
beforeEach(() => {
  vi.clearAllMocks();
  api.getAttendance.mockResolvedValue(response);
  api.matchParticipant.mockResolvedValue({ success: true });
});
afterEach(cleanup);
describe("посещаемость Zoom", () => {
  it("привязывает участника только по явному сохранению и не запоминает без email", async () => {
    render(<GroupZoomAttendancePanel groupId="g" />);
    fireEvent.change(await screen.findByLabelText("Завершившееся занятие"), {
      target: { value: "e1" },
    });
    const select = await screen.findByLabelText("Студент для Гость");
    fireEvent.change(select, { target: { value: "s1" } });
    expect(api.matchParticipant).not.toHaveBeenCalled();
    expect(
      screen.getByText("Привязка только для этого занятия"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));
    await waitFor(() =>
      expect(api.matchParticipant).toHaveBeenCalledWith({
        groupId: "g",
        eventId: "e1",
        participantKey: "p1",
        studentId: "s1",
        remember: false,
      }),
    );
  });
  it("не показывает отчёт предыдущей группы при позднем ответе", async () => {
    let resolveFirst!: (value: ZoomAttendanceResponse) => void;
    api.getAttendance.mockImplementation(
      ({ groupId, eventId }: { groupId: string; eventId?: string }) =>
        groupId === "g" && eventId === "e1"
          ? new Promise((resolve) => {
              resolveFirst = resolve;
            })
          : Promise.resolve(
              groupId === "g"
                ? response
                : { ...response, participants: [], attendance: [] },
            ),
    );
    const { rerender } = render(<GroupZoomAttendancePanel groupId="g" />);
    fireEvent.change(await screen.findByLabelText("Завершившееся занятие"), {
      target: { value: "e1" },
    });
    rerender(<GroupZoomAttendancePanel groupId="other" />);
    await act(async () => {
      resolveFirst(response);
    });
    expect(screen.queryByText("Гость")).not.toBeInTheDocument();
    expect(screen.queryByText("80% · Зачтено")).not.toBeInTheDocument();
  });
  it("скрывает отключённую посещаемость и показывает ожидающий отчёт", async () => {
    api.getMyAttendance
      .mockResolvedValueOnce({
        enabled: false,
        status: "pending",
        minutes: null,
        percent: null,
        present: null,
      })
      .mockResolvedValueOnce({
        enabled: true,
        status: "pending",
        minutes: null,
        percent: null,
        present: null,
      });
    const { rerender, container } = render(
      <MyZoomAttendance groupId="g" eventId="one" />,
    );
    await waitFor(() => expect(container).toBeEmptyDOMElement());
    rerender(<MyZoomAttendance groupId="g" eventId="two" />);
    expect(await screen.findByText("Отчёт ещё не готов")).toBeInTheDocument();
  });
});

describe("безопасные ошибки синхронизации", () => {
  it.each([
    [
      "functions/resource-exhausted",
      "Обновление уже выполняется или запускалось менее 10 минут назад.",
    ],
    [
      "functions/failed-precondition",
      "Дождитесь 30 минут после окончания занятия.",
    ],
  ])("показывает известное сообщение %s", async (code, message) => {
    api.syncAttendance.mockRejectedValueOnce({ code, message });
    render(<GroupZoomAttendancePanel groupId="g" />);
    fireEvent.change(await screen.findByLabelText("Завершившееся занятие"), {
      target: { value: "e1" },
    });
    fireEvent.click(
      await screen.findByRole("button", { name: "Синхронизировать" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(message);
  });
  it("скрывает неизвестное сообщение сервера даже для известного кода", async () => {
    api.syncAttendance.mockRejectedValueOnce({
      code: "functions/failed-precondition",
      message: "секрет",
    });
    render(<GroupZoomAttendancePanel groupId="g" />);
    fireEvent.change(await screen.findByLabelText("Завершившееся занятие"), {
      target: { value: "e1" },
    });
    fireEvent.click(
      await screen.findByRole("button", { name: "Синхронизировать" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Не удалось выполнить действие.",
    );
    expect(screen.queryByText("секрет")).not.toBeInTheDocument();
  });
});

it("позволяет отключить подключённый аккаунт при недоступной конфигурации", async () => {
  api.getAttendance.mockResolvedValue({
    ...response,
    accounts: [],
    accountsConfigured: false,
  });
  api.setConnection.mockResolvedValue({ success: true });
  render(<GroupZoomAttendancePanel groupId="g" />);
  const select = await screen.findByLabelText("Аккаунт Zoom");
  expect(select).toHaveDisplayValue("Подключённый аккаунт недоступен");
  expect(
    screen.getByRole("button", { name: "Сохранить настройки" }),
  ).toBeDisabled();
  fireEvent.change(select, { target: { value: "" } });
  fireEvent.click(screen.getByRole("button", { name: "Сохранить настройки" }));
  await waitFor(() =>
    expect(api.setConnection).toHaveBeenCalledWith({
      groupId: "g",
      accountKey: null,
      minPercent: 70,
    }),
  );
});

describe("неподтверждённая посещаемость", () => {
  it("не утверждает отсутствие при нулевых минутах", async () => {
    api.getMyAttendance.mockResolvedValue({
      enabled: true,
      status: "ready",
      minutes: 0,
      percent: 0,
      present: false,
    });
    render(<MyZoomAttendance groupId="g" eventId="e" />);
    expect(
      await screen.findByText(/Присутствие пока не подтверждено/),
    ).toHaveTextContent("попросите преподавателя привязать ваше имя в Zoom");
    expect(screen.queryByText(/Не зачтено/)).not.toBeInTheDocument();
  });
  it("сохраняет незачёт при положительных минутах ниже порога", async () => {
    api.getMyAttendance.mockResolvedValue({
      enabled: true,
      status: "ready",
      minutes: 20,
      percent: 30,
      present: false,
    });
    render(<MyZoomAttendance groupId="g" eventId="e" />);
    expect(
      await screen.findByText(/20 мин.*30%.*Не зачтено/),
    ).toBeInTheDocument();
  });
  it("показывает число непривязанных подключений перед списком студентов", async () => {
    render(<GroupZoomAttendancePanel groupId="g" />);
    fireEvent.change(await screen.findByLabelText("Завершившееся занятие"), {
      target: { value: "e1" },
    });
    expect(
      await screen.findByText(/Непривязанных подключений: 1/),
    ).toHaveTextContent("Минуты студентов до привязки могут быть неполными");
  });
});

describe("запоминание имени Zoom", () => {
  const showParticipant = async (
    changes: Partial<ZoomAttendanceResponse["participants"][number]>,
  ) => {
    api.getAttendance.mockResolvedValue({
      ...response,
      participants: [{ ...response.participants[0], ...changes }],
    });
    render(<GroupZoomAttendancePanel groupId="g" />);
    fireEvent.change(await screen.findByLabelText("Завершившееся занятие"), {
      target: { value: "e1" },
    });
    fireEvent.change(await screen.findByLabelText("Студент для Гость"), {
      target: { value: "s1" },
    });
  };
  it("запоминает имя только после явного выбора", async () => {
    await showParticipant({ canRememberByName: true });
    expect(
      screen.getByText(/применяется к другим отчётам/),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("checkbox", { name: /Запомнить имя в группе/ }),
    );
    expect(api.matchParticipant).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));
    await waitFor(() =>
      expect(api.matchParticipant).toHaveBeenCalledWith({
        groupId: "g",
        eventId: "e1",
        participantKey: "p1",
        studentId: "s1",
        remember: false,
        rememberName: true,
      }),
    );
  });
  it("не передаёт rememberName без явного выбора", async () => {
    await showParticipant({ canRememberByName: true });
    fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));
    await waitFor(() =>
      expect(api.matchParticipant).toHaveBeenCalledWith({
        groupId: "g",
        eventId: "e1",
        participantKey: "p1",
        studentId: "s1",
        remember: false,
      }),
    );
  });
  it("показывает источник автоматической привязки по имени", async () => {
    await showParticipant({
      canRememberByName: true,
      matchSource: "name",
      studentId: "s1",
    });
    expect(screen.getByText("По сохранённому имени")).toBeInTheDocument();
  });
  it.each([
    ["ambiguous", /одинаковые имена/],
    ["generic", /укажите личное имя в Zoom/],
  ] as const)(
    "запрещает запомнить имя при %s, но сохраняет привязку к занятию",
    async (issue, message) => {
      await showParticipant({
        canRememberByName: true,
        nameMatchingIssue: issue,
      });
      expect(screen.getByText(message)).toBeInTheDocument();
      expect(
        screen.queryByRole("checkbox", { name: /Запомнить имя/ }),
      ).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));
      await waitFor(() =>
        expect(api.matchParticipant).toHaveBeenCalledWith({
          groupId: "g",
          eventId: "e1",
          participantKey: "p1",
          studentId: "s1",
          remember: false,
        }),
      );
    },
  );
  it("сохраняет прежний формат запроса для профиля", async () => {
    await showParticipant({ canRemember: true });
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Запомнить профиль" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));
    await waitFor(() =>
      expect(api.matchParticipant).toHaveBeenCalledWith({
        groupId: "g",
        eventId: "e1",
        participantKey: "p1",
        studentId: "s1",
        remember: true,
      }),
    );
  });
});
