# Design code

## Область и источник правды
- Глобальные токены и базовые стили: `src/styles/theme.css`, `src/index.css`, `tailwind.config.js`.
- Шрифты подключаются через `@fontsource-variable/manrope` в `src/main.tsx`.
- Страница курса/лендинг использует отдельную палитру и локальные стили в `src/pages/HomePage.tsx`.
- Таймлайн имеет собственные цвета, типографику и иконки в `src/pages/timeline/**`.
- Темы тестов задаются пресетами в `src/constants/themePresets.ts` и вычисляются в `src/utils/theme.ts`.
- Темы периодов (Period pages) — `src/theme/periods.ts`, фоновые изображения — `src/theme/backgrounds.ts`.

## Базовые токены
### Цвета (CSS variables)
- `--bg` #FAF7F0 — фон страницы (Tailwind `bg-bg`).
- `--fg` #111827 — основной текст (Tailwind `text-fg`).
- `--muted` #6B7280 — вторичный текст (Tailwind `text-muted`).
- `--border` #E7E2DA — границы (Tailwind `border-border`).
- `--card` #FFFFFF — фон карточек (Tailwind `bg-card`).
- `--card-2` #FDFBF7 — вторичный фон карточек (Tailwind `bg-card2`).
- `--accent` #2E7D32 — основной акцент (Tailwind `text-accent`, `bg-accent`).
- `--accent-600` #256D27 — hover/active акцент (исп. в `bg-accent-600`).
- `--accent-100` #E8F5E9 — светлый акцент (например, `blockquote`).
- `--mark` #FFF3B0 — подсветка `mark`.
- `--accent-rgb` 46 125 50 — используется для прозрачных наложений в `::selection` и `blockquote`.

### Радиус и тени
- `--radius` 16px — базовый скруглённый стиль (`rounded-2xl`).
- `--shadow-card` 0 22px 45px -24px rgba(17, 24, 39, 0.25) — базовая тень (`shadow-brand`).

### Типографика
- Базовый шрифт: `"Manrope Variable", "Inter", system-ui, -apple-system, "Segoe UI", sans-serif`.
- Текстовые блоки, формы и подписи в таймлайне используют `Georgia, serif` (см. `src/pages/timeline/components/TimelineCanvas.tsx`, `src/pages/timeline/components/TimelineEventForm.tsx`).
- Моноширинный текст встречается точечно (`font-mono`), напр. `src/components/profile/GeminiKeySection.tsx`.

### Глобальные эффекты
- `blockquote`, `img`, `video`, `iframe` имеют общий стиль в `src/styles/theme.css`.
- Цвет выделения текста перезаписывается в `src/index.css` на `rgba(59, 130, 246, 0.24/0.3)` (Tailwind blue-500), что перекрывает `::selection` из `src/styles/theme.css`.
- NProgress окрашен в `--accent` (см. `src/styles/theme.css`).

## Ключевые палитры по разделам
### Лэндинг (HomePage)
- Локальная палитра для маркетинговых блоков: `#4A5FA5`, `#6B7FB8`, `#3A4F95`, `#2C3E50`, `#7F8C8D`, `#F5F7FA`, `#E8EFF5`, `#F0F4F8`, `#E0E0E0`, `#FAFAFA`, `#F9F9F9`.
- Контекст: кнопки, заголовки, карточки и градиенты в `src/pages/HomePage.tsx`.

### Таймлайн
- Сферы жизни: пастельные цвета в `src/pages/timeline/constants.ts`.
- Периодизации: фоновые пастельные цвета в `src/pages/timeline/data/periodizations.ts`.
- Холст/линии/метки: ручные цвета `#e2e8f0`, `#475569`, `#93c5fd`, `#cbd5e1`, `#38bdf8`, `#0f172a`, `#0ea5e9`, `#3b82f6`, `#1d4ed8` в `src/pages/timeline/components/TimelineCanvas.tsx`.

### Периоды (Period pages)
- `src/theme/periods.ts`: набор `accent`/`accent100` для каждого возрастного периода.
- `src/theme/backgrounds.ts`: фоновые изображения по ключу периода.

### Тесты
- Градиенты и фоновые темы: `src/constants/themePresets.ts`.
- Автогенерация градиентов и расчёт контраста: `src/utils/theme.ts`, `src/utils/color.ts`.

### Разделы с Tailwind-цветами
- Многие экраны (Admin, Profile, Research, Notes, Tests) используют стандартные классы Tailwind (`blue-*`, `green-*`, `purple-*`, `gray-*`, `red-*`) для локальных акцентов.

## Иконография таймлайна (система пиктограмм событий)
### Где находится код
- Исходные PNG: `public/icons/events/*.png`.
- Метаданные: `public/icons/icons.json`.
- Типы и карта: `src/data/eventIcons.ts` (автогенерация).
- Data URL для экспорта: `src/data/eventIconDataUrls.ts` (автогенерация).
- Рендер в UI: `src/components/Icon.tsx` и `src/pages/timeline/components/IconPickerButton.tsx`.
- Использование на холсте: `src/pages/timeline/components/TimelineCanvas.tsx` (SVG `<image>` + `data-icon-id`).
- Экспорт PNG/PDF: `src/pages/timeline/utils/exporters/svgRenderer.ts` (встраивание data URL).
- Генератор: `scripts/generate_event_icons.py`.

### Можно ли использовать для оформления других элементов?
Да, но сейчас система жёстко привязана к событиям таймлайна.
- Плюсы повторного использования:
  - Единый визуальный язык (фиксированный набор PNG).
  - Типобезопасность через `EventIconId`.
  - Готовая инфраструктура экспортов (SVG/PDF/PNG).
- Ограничения:
  - `Icon` и `EventIconId` привязаны к `public/icons/events`.
  - Экспортный map (`EVENT_ICON_DATA_URL_MAP`) тяжёлый и грузится только для экспорта.
  - Имена/смысл иконок ориентированы на события таймлайна, а не на глобальные UI-элементы.
- Если нужно масштабировать:
  - Вынести общий `IconRegistry` (наборы по домену) и параметризовать `Icon` базовым путём.
  - Разделить домены (`timeline`, `ui`, `marketing`), чтобы не смешивать значения.
  - Оставить `EVENT_ICON_DATA_URL_MAP` только для экспортных сценариев.

## Emoji (исчерпывающий список по фронтенду)
Ниже — все эмодзи, найденные в `src/**/*.ts(x|js|json)`.
Формат: `путь: эмодзи`.

```
src/components/AddAdminModal.tsx: ✕
src/components/CombinedSearchDrawer.tsx: ✕
src/components/CreateLessonModal.tsx: 👶 🧠 📚
src/components/EmojiPicker.tsx: 😀 😃 😄 😁 😆 😅 😂 🤣 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😗 😙 😚 😋 😛 😜 🤪 😝 🤑 🤗 🤩 🤠 😎 🤓 🧐 😕 😟 🙁 ☹️ 😮 😯 😲 😳 🥺 😦 😧 😨 😰 😥 😢 😭 😱 😖 😣 😞 😓 😩 😫 🥱 😤 😡 😠 🤬 😈 👿 💀 ☠️ 🤡 👹 👺 👻 👽 🤖 🎃 😺 😸 😹 😻 😼 😽 🙀 😿 😾 👶 🧒 👦 👧 🧑 👨 👩 👱 🧔 👵 👴 👨‍⚕️ 👩‍⚕️ 👨‍🎓 👩‍🎓 👨‍🏫 👩‍🏫 👨‍💻 👩‍💻 👨‍🎤 👩‍🎤 👨‍🎨 👩‍🎨 👨‍🚀 👩‍🚀 👨‍🚒 👩‍🚒 🧑‍🍳 🧑‍🔬 🧑‍🎄 🧑‍🚀 🧑‍🎓 🧑‍⚖️ 🧑‍🌾 🧑‍🏭 👮 🕵️ 💂 👷 👳 👲 🧕 🤴 👸 🤵 👰 🤰 🤱 🧑‍🍼 🎅 🤶 🦸 🦹 🧙 🧚 🧛 🧜 🧝 🧞 🧟 🧌 💃 🕺 👯 🧖 🧗 🏃 🚶 🤸 ⛹️ 🤾 🧘 🏋️ 🚴 🚣 🏄 🤽 🛀 🛌 🤹 🧍 🧎 💪 🤝 🙏 ❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💫 ✨ ⭐️ 🌟 🔥 ⚡️ 🌈 ☀️ 🌤️ 🌙 ☁️ ❄️ ☔️ 🌊 🍎 🍇 🍉 🍓 🍒 🍑 🍍 🥝 🍅 🥑 🥦 🥕 🌶️ 🥔 🥐 🥖 🧀 🍔 🍟 🍕 🌭 🥪 🌮 🍣 🍱 🍙 🍜 🍝 🍥 🥡 🍦 🍰 🧁 🍩 🎂 🍮 ☕️ 🍵 🍺 🍷 🍸 🥂 🥃 🧃 🧉 🍽️ 🍴 🥄 🔔 🎵 🎶 🎹 🥁 🎷 🎺 🎸 🪗 🎻 🪕 🎧 📚 📰 🗂️ ✏️ 🖋️ 🖊️ 🖌️ 🖍️ 📝 📎 📌 📍 📏 📐 🧮 📊 📈 📉 🗃️ 🗳️ 💡 🔑 🗝️ 🔨 🛠️ ⚙️ 🔧 🪛 🪚 🔗 🧲 💎 🪙 🧸 🚗 🚕 🚙 🚌 🚎 🏎️ 🚓 🚑 🚒 🚚 🚜 ✈️ 🛩️ 🚀 🛰️ ⛵️ 🚁 🏰 🗽 🏙️ 🌆 🌉 🗻 🏞️ 🌋 🛖 🏠 🏡 🏢 🏬 🏫 🏥 🏛️ ⛪️ 🕍 🕌 🛕 🏯 🕋
src/components/ExportNotesButton.tsx: 💾 📝 📄
src/components/LoginModal.tsx: 🚫
src/components/NotesFilter.tsx: 📅 🔽 🔼 👶 📊 ✓
src/components/QuestionEditor.tsx: 👁️
src/components/QuestionPreview.tsx: ✅
src/components/SaveNoteAsEventButton.tsx: 🔵 ✅ ❌ 📍 ✕ ✓
src/components/SuperAdminBadge.tsx: ⭐
src/components/TelegramOpenInBrowser.tsx: ⚠️
src/components/TestHistory.tsx: 🟡 🔵 ✅ ❌ 📊 🎯 📋 🏆 ⏱️
src/components/TopicSelector.tsx: ⏳ ✅ 💡 📚
src/components/UserMenu.tsx: 🔎 ☰ 📝 🤖 ✏️ ⚙️ ✕ 👤 🚪
src/components/__tests__/SaveNoteAsEventButton.test.tsx: 📍
src/components/profile/GeminiKeySection.tsx: 🔑
src/components/profile/SearchHistorySection.tsx: 📚 🔬 🤖 📖 🔍
src/components/questions/editor/QuestionMediaUploader.tsx: 🖼️ ✕ ⏳ 🔊 🎬 ⚠️
src/components/questions/editor/QuestionTextEditor.tsx: ⌘
src/components/tests/TestCard.tsx: 📖 📋 🔥 🔒
src/components/tests/TestIntroScreen.tsx: 📋
src/components/tests/TestQuestionScreen.tsx: 👤 ✅
src/components/tests/TestResultsScreen.tsx: 🏆 🌟 👍 📚 💪
src/components/tests/editor/TestAppearanceEditor.tsx: 📖 🔥 💡
src/components/tests/editor/TestImportExport.tsx: 📤 📥 ⚠️ 💡
src/components/tests/editor/TestPolicyEditor.tsx: 💡
src/components/tests/editor/TestQuestionsManager.tsx: 📄 📥 ⚠️
src/components/tests/editor/hooks/useTestSave.ts: ✅
src/components/tests/modal/components/TestsListHeader.tsx: ➕ 📥 📄
src/components/tests/modal/components/TestsListTable.tsx: 🔍 🗑️
src/components/theme/ThemePicker.tsx: ⚠️
src/data/defaultHomePageContent.ts: 🔄 📺 🧠 📈 🎥 📊 📚 📝 📋 📅 📖 🤰 👶 🧒 🎨 🎮 🎸 🎓 💼 👔 🏡 🌳 🌟 🎯 👩‍🏫 👩‍🎓 ⏰ 💻 📹 👥
src/data/tests/development-19-22-test.json: 🎓 🚀
src/data/tests/development-22-27-test.json: 💼 🌱
src/data/tests/development-28-40-test.json: 🏗️ 🏆
src/data/tests/general-3-test.json: 👁️ 🧠
src/data/tests/general-4-test.json: 🔦 🎯
src/features/contentSearch/components/ContentSearchDrawer.tsx: ✕
src/features/contentSearch/components/ContentSearchResults.tsx: 👶 🧠 📚 📝
src/features/periods/components/SelfQuestionsSection.tsx: 📖
src/features/researchSearch/components/AiAssistantBlock.tsx: ⬇️
src/features/researchSearch/components/AiAssistantDrawer.tsx: ✕
src/features/researchSearch/components/ResearchSearchDrawer.tsx: ✕
src/hooks/useNotes.ts: ✅
src/hooks/useReorderLessons.ts: ⚠️
src/hooks/useTimeline.ts: 🔵 ✅ ❌
src/hooks/useTopics.ts: ✅
src/lib/firebase.ts: 🔍
src/lib/testResults.ts: 🔵 ✅
src/lib/tests.ts: 🔵 ✅ ❌
src/pages/Admin.tsx: ✅ ❌ 🔍 🔄 📊 👥 📝 📚
src/pages/AdminContent.tsx: 👶 🧠 📚 ✨ ✏️ 🏠 ➕ 📝 💡
src/pages/AdminContentEdit.tsx: ✨
src/pages/AdminHomePage.tsx: ✓
src/pages/AdminTopics.tsx: ✅ 📚 🗑️ ➕ 📝 ⚠️
src/pages/ContentEditor.tsx: 📝 📄 📚
src/pages/DynamicTest.tsx: ❌
src/pages/HomePage.tsx: 👥 📞 📧 💬
src/pages/MigrateTopics.tsx: ✅ ❌ ⚠️ 🚀
src/pages/Notes.tsx: ❌
src/pages/PeriodPage.tsx: 🔍
src/pages/Profile.tsx: 👶 🧠 📚 📝 📊 🗺️ 🎓 👤 ⭐ 👑 ✉️ 📅
src/pages/TestsPage.tsx: 👶 🧠 📚 🌱 🎯 ❤️ 📝 📊 🔵 🔓 ❌ 💡 📋 ⏱️
src/pages/UploadAsset.tsx: ❌ 🔍 👑 ⏰ 🚀 🔑 🧱 ❓ 📦 ⬆️ ✅ 🔗
src/pages/admin/content-editor/components/ContentActionsBar.tsx: 🗑️ 💾
src/pages/admin/content-editor/components/ContentAuthorsSection.tsx: 👤
src/pages/admin/content-editor/components/ContentConceptsSection.tsx: 💡
src/pages/admin/content-editor/components/ContentLiteratureSection.tsx: 📚 📖 🎬 🎲 ✏️ 🔗
src/pages/admin/content-editor/components/ContentMetadataForm.tsx: 📋
src/pages/admin/content-editor/components/ContentThemeEditor.tsx: 🎨
src/pages/admin/content-editor/components/ContentVideoSection.tsx: 🎥
src/pages/admin/content-editor/components/EditableList.tsx: 🗑️
src/pages/admin/content-editor/components/SimpleList.tsx: 🗑️
src/pages/admin/content-editor/components/VideoPlaylistEditor.tsx: 🗑️
src/pages/admin/content-editor/hooks/useContentSaver.ts: ✅ ❌ ⚠️ 🗑️
src/pages/notes/components/NotesEmpty.tsx: 🔍 📝
src/pages/notes/components/NotesHeader.tsx: 📝 🔍 ✕ 📊
src/pages/notes/components/NotesList.tsx: 💭 ✏️ 🗑️ 📚
src/pages/timeline/components/BulkEventCreator.tsx: 📍 ✕ ⚠️ ✓ 💡
src/pages/timeline/components/PeriodBoundaryModal.tsx: 📖 ⚠️
src/pages/timeline/components/SaveEventAsNoteButton.tsx: ✅ ⚠️ ❌ 🔵 🔘 ✕ ✓
src/pages/timeline/components/TimelineBranchEditor.tsx: ✓ 🗑️
src/pages/timeline/components/TimelineCanvas.tsx: 👶
src/pages/timeline/components/TimelineEventForm.tsx: ✕ 🗑️ 📝
src/pages/timeline/components/TimelineHelpModal.tsx: ✕ 🎯 📝 🎨 ⚠️
src/pages/timeline/components/TimelineLeftPanel.tsx: ✕
src/pages/timeline/constants.ts: 🎓 💼 ❤️ 💪 🤝 🏠 💰 🎨 ⭐
src/pages/timeline/data/periodizations.ts: 📘
src/scripts/migrateTopics.ts: 🚀 ✅ 🎉 ❌
src/utils/periodConfig.ts: 📖 🤰 👧 👶 👦 🧒 🎒 📚 🧑‍🎓 💼 👔 🧠 🌿 👴 📝
src/utils/testAppearance.test.ts: 🚀 🎨
src/utils/testAppearance.ts: 📝
src/utils/testChainHelpers.ts: 🎓 📖
src/utils/testImportExport.ts: 🎯 🏆
```
