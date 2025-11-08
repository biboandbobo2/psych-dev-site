import { useState, useEffect, useRef } from 'react';

const CONTROL =
  'h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-[15px] leading-none outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500';

function controlClass(hasError?: boolean, extra?: string) {
  return `${CONTROL} ${hasError ? '' : ''} ${extra ?? ''}`.trim();
}

const EMOJI_OPTIONS = [
  '😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😛','😜','🤪','😝','🤑','🤗','🤩','🤠','😎','🤓','🧐','😕','😟','🙁','☹️','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','☠️','🤡','👹','👺','👻','👽','🤖','🎃','😺','😸','😹','😻','😼','😽','🙀','😿','😾','👶','🧒','👦','👧','🧑','👨','👩','👱','🧔','👵','👴','👨‍⚕️','👩‍⚕️','👨‍🎓','👩‍🎓','👨‍🏫','👩‍🏫','👨‍💻','👩‍💻','👨‍🎤','👩‍🎤','👨‍🎨','👩‍🎨','👨‍🚀','👩‍🚀','👨‍🚒','👩‍🚒','🧑‍🍳','🧑‍🔬','🧑‍🎄','🧑‍🚀','🧑‍🎓','🧑‍⚖️','🧑‍🌾','🧑‍🏭','👮','🕵️','💂','👷','👳','👲','🧕','🤴','👸','🤵','👰','🤰','🤱','🧑‍🍼','🎅','🤶','🦸','🦹','🧙','🧚','🧛','🧜','🧝','🧞','🧟','🧌','💃','🕺','👯','🧖','🧗','🏃','🚶','🤸','⛹️','🤾','🧘','🏋️','🚴','🚣','🏄','🤽','🛀','🛌','🤹','🧍','🧎','💪','🤝','🙏','❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💫','✨','⭐️','🌟','🔥','⚡️','🌈','☀️','🌤️','🌙','☁️','❄️','☔️','🌊','🍎','🍇','🍉','🍓','🍒','🍑','🍍','🥝','🍅','🥑','🥦','🥕','🌶️','🥔','🥐','🥖','🧀','🍔','🍟','🍕','🌭','🥪','🌮','🍣','🍱','🍙','🍜','🍝','🍥','🥡','🍦','🍰','🧁','🍩','🎂','🍮','☕️','🍵','🍺','🍷','🍸','🥂','🥃','🧃','🧉','🍽️','🍴','🥄','🔔','🎵','🎶','🎹','🥁','🎷','🎺','🎸','🪗','🎻','🪕','🎧','📚','📰','🗂️','✏️','🖋️','🖊️','🖌️','🖍️','📝','📎','📌','📍','📏','📐','🧮','📊','📈','📉','🗃️','🗳️','💡','🔑','🗝️','🔨','🛠️','⚙️','🔧','🪛','🪚','🔗','🧲','💎','🪙','🧸','🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚚','🚜','✈️','🛩️','🚀','🛰️','⛵️','🚁','🏰','🗽','🏙️','🌆','🌉','🗻','🏞️','🌋','🛖','🏠','🏡','🏢','🏬','🏫','🏥','🏛️','⛪️','🕍','🕌','🛕','🏯','🕋'
];

interface EmojiPickerProps {
  value?: string;
  onChange: (emoji: string) => void;
  disabled?: boolean;
  placeholder?: string;
  inputId?: string;
}

export function EmojiPicker({
  value,
  onChange,
  disabled,
  placeholder,
  inputId,
}: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <div className="flex items-center gap-2">
        <input
          id={inputId}
          type="text"
          maxLength={4}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={controlClass(false)}
          disabled={disabled}
        />
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="flex h-11 w-11 items-center justify-center rounded-lg border border-zinc-300 bg-white text-xl shadow-sm outline-none transition hover:bg-zinc-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          disabled={disabled}
          aria-label="Выбрать эмодзи"
        >
          😊
        </button>
      </div>
      {open && (
        <div className="absolute z-20 mt-2 max-h-72 w-72 overflow-y-auto rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
          <div className="grid grid-cols-8 gap-1">
            {EMOJI_OPTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  onChange(emoji);
                  setOpen(false);
                }}
                className={`flex h-9 w-9 items-center justify-center rounded text-2xl hover:bg-gray-100 ${
                  value === emoji ? 'bg-blue-100' : ''
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
