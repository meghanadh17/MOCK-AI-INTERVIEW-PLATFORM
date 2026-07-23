import React, { useRef, useEffect, useState } from 'react';
import { Mic, MicOff, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface AnswerTextareaProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  maxLength?: number;
  isDisabled?: boolean;
}

export function AnswerTextarea({
  value,
  onChange,
  onSubmit,
  placeholder = 'Type your response here...',
  maxLength = 1000,
  isDisabled = false
}: AnswerTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any | null>(null);

  // Auto-resize handler
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [value]);

  // Initialize Web Speech API
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsListening(true);
        toast.info('Speech recognition active. Start speaking!');
      };

      rec.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          onChange(value ? `${value.trim()} ${finalTranscript}` : finalTranscript);
        }
      };

      rec.onerror = (err: any) => {
        console.error('Speech recognition error:', err);
        setIsListening(false);
        if (err.error === 'not-allowed') {
          toast.error('Microphone access denied.');
        }
      };

      rec.onend = () => {
        setIsListening(false);
      };

      setRecognition(rec);
    }
  }, [value, onChange]);

  const toggleVoiceInput = () => {
    if (!recognition) {
      toast.error('Web Speech API is not supported in your browser.');
      return;
    }

    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      if (value.trim() && !isDisabled) {
        onSubmit();
      }
    }
  };

  const handlePaste = () => {
    toast.warning('Cheating Detection: Text pasting detected. Recruiter scoring penalties may apply.');
  };

  const charCount = value.length;
  const isOver90 = charCount >= maxLength * 0.9;
  const isOver100 = charCount >= maxLength;

  const getCounterColor = () => {
    if (isOver100) return 'text-red-500 font-extrabold';
    if (isOver90) return 'text-amber-500 font-bold';
    return 'text-text-muted';
  };

  return (
    <div className="space-y-3 text-left">
      <div className="relative rounded-2xl border border-zinc-950 overflow-hidden focus-within:border-zinc-850 transition-colors neo-sunken">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={placeholder}
          disabled={isDisabled}
          rows={5}
          className="w-full bg-transparent p-4 pr-14 text-xs text-text-prim placeholder-text-disabled outline-none resize-none leading-relaxed font-sans min-h-[120px]"
        />

        {/* Floating Controls inside Textarea */}
        <div className="absolute right-3 bottom-3 flex items-center gap-2">
          {isListening && (
            <span className="flex size-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
          )}
          <button
            type="button"
            onClick={toggleVoiceInput}
            disabled={isDisabled}
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              isListening
                ? 'bg-zinc-900 border border-zinc-700 text-zinc-100 shadow-inner'
                : 'text-text-muted hover:text-text-prim neo-raised hover:scale-105 active:scale-95'
            }`}
            title={isListening ? 'Stop Speech-to-Text' : 'Start Speech-to-Text'}
          >
            {isListening ? <MicOff className="size-3.5" /> : <Mic className="size-3.5" />}
          </button>
        </div>
      </div>

      <div className="flex justify-between items-center text-[10px] font-mono select-none">
        <span className="text-text-disabled flex items-center gap-1">
          <AlertCircle className="size-3" />
          Press Ctrl + Enter to submit
        </span>
        <span className={getCounterColor()}>
          {charCount} / {maxLength} characters
        </span>
      </div>
    </div>
  );
}