import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, RotateCcw, Volume2, CheckCircle2, AlertCircle } from 'lucide-react';

interface AudioRecorderProps {
  onRecordingComplete: (blob: Blob, dataUrl: string, duration: number) => void;
  onReset: () => void;
  initialAudioUrl?: string;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  onRecordingComplete,
  onReset,
  initialAudioUrl
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(initialAudioUrl || null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [audioLevels, setAudioLevels] = useState<number[]>([15, 25, 40, 20, 10]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  const startVisualizer = (stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 32;
      analyserRef.current = analyser;

      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateLevels = () => {
        if (!isRecording) return;
        analyser.getByteFrequencyData(dataArray);
        // Take 8 frequency samples
        const samples: number[] = [];
        for (let i = 0; i < 8; i++) {
          const val = dataArray[i * 2] || 0;
          samples.push(Math.max(10, Math.min(95, Math.round((val / 255) * 100))));
        }
        setAudioLevels(samples);
        animationFrameRef.current = requestAnimationFrame(updateLevels);
      };

      updateLevels();
    } catch (e) {
      console.warn('Visualizer non supporté:', e);
    }
  };

  const startRecording = async () => {
    setMicError(null);
    audioChunksRef.current = [];
    setRecordingDuration(0);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("L'accès au microphone n'est pas supporté par ce navigateur.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      const options = { mimeType: 'audio/webm' };
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, options);
      } catch {
        recorder = new MediaRecorder(stream);
      }

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          setAudioUrl(dataUrl);
          onRecordingComplete(audioBlob, dataUrl, recordingDuration);
        };
        reader.readAsDataURL(audioBlob);

        // Stop stream tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start(200);
      setIsRecording(true);
      startVisualizer(stream);

      timerIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Erreur micro:', err);
      setMicError(
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'Autorisation micro refusée. Veuillez autoriser le micro dans votre navigateur.'
          : 'Impossible d’accéder au microphone (' + (err.message || 'Erreur inconnue') + ').'
      );
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    }
  };

  const handleReset = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }
    setAudioUrl(null);
    setIsPlaying(false);
    setRecordingDuration(0);
    onReset();
  };

  const togglePlayback = () => {
    if (!audioPlayerRef.current || !audioUrl) return;
    if (isPlaying) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
    } else {
      audioPlayerRef.current.currentTime = 0;
      audioPlayerRef.current.play();
      setIsPlaying(true);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full bg-[#27150c] border border-[#d97706]/20 rounded-2xl p-4 sm:p-5 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#fed7aa]">
          <Volume2 className="w-4 h-4 text-[#c85a32]" />
          <span>Enregistrement de la prononciation</span>
        </div>
        {isRecording && (
          <div className="flex items-center gap-2 bg-[#991b1b]/30 text-[#fca5a5] px-2.5 py-0.5 rounded-full text-xs font-mono animate-pulse border border-[#ef4444]/40">
            <span className="w-2 h-2 rounded-full bg-[#ef4444]" />
            EN DIRECT • {formatTime(recordingDuration)}
          </div>
        )}
      </div>

      {micError && (
        <div className="mb-3 p-3 bg-[#7f1d1d]/40 border border-[#ef4444]/40 rounded-xl text-xs text-[#fecaca] flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-[#f87171] shrink-0 mt-0.5" />
          <div>{micError}</div>
        </div>
      )}

      {/* Visualizer / Waveform Display */}
      <div className="h-16 bg-[#180d07] rounded-xl flex items-center justify-center gap-1.5 px-4 mb-4 border border-[#3b1d10]">
        {!audioUrl && !isRecording && (
          <p className="text-xs text-[#a8826d] text-center">
            Appuyez sur le micro pour prononcer l’expression avec votre accent naturel
          </p>
        )}

        {isRecording && (
          <div className="flex items-center gap-1.5 h-10 w-full justify-center">
            {audioLevels.map((lvl, idx) => (
              <span
                key={idx}
                className="w-2.5 rounded-full bg-gradient-to-t from-[#c85a32] to-[#f59e0b] transition-all duration-75"
                style={{ height: `${Math.max(8, lvl)}%` }}
              />
            ))}
          </div>
        )}

        {audioUrl && !isRecording && (
          <div className="flex items-center justify-between w-full px-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#22c55e]" />
              <span className="text-xs font-medium text-[#fde047]">
                Voix capturée ({formatTime(recordingDuration || 3)})
              </span>
            </div>
            <div className="flex items-center gap-1">
              {[40, 70, 30, 85, 60, 45, 90, 35, 55, 75, 40].map((h, i) => (
                <span
                  key={i}
                  className={`w-1 rounded-full ${isPlaying ? 'bg-[#f59e0b]' : 'bg-[#c85a32]/60'}`}
                  style={{ height: `${h * 0.28}px` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Audio Element Hidden */}
      {audioUrl && (
        <audio
          ref={audioPlayerRef}
          src={audioUrl}
          onEnded={() => setIsPlaying(false)}
          className="hidden"
        />
      )}

      {/* Controls */}
      <div className="flex items-center justify-center gap-3">
        {!isRecording && !audioUrl && (
          <button
            onClick={startRecording}
            type="button"
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#c85a32] to-[#b84a28] hover:from-[#d6653c] hover:to-[#c85a32] text-white font-medium text-sm shadow-md active:scale-95 transition-transform"
          >
            <Mic className="w-4 h-4" />
            <span>Commencer l’enregistrement</span>
          </button>
        )}

        {isRecording && (
          <button
            onClick={stopRecording}
            type="button"
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#dc2626] hover:bg-[#b91c1c] text-white font-medium text-sm shadow-md active:scale-95 transition-transform animate-pulse"
          >
            <Square className="w-4 h-4" />
            <span>Terminer ({formatTime(recordingDuration)})</span>
          </button>
        )}

        {audioUrl && !isRecording && (
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlayback}
              type="button"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#451a03] hover:bg-[#78350f] text-[#fed7aa] border border-[#d97706]/40 font-medium text-xs sm:text-sm active:scale-95 transition-transform"
            >
              {isPlaying ? <Pause className="w-4 h-4 text-[#f59e0b]" /> : <Play className="w-4 h-4 text-[#f59e0b]" />}
              <span>{isPlaying ? 'Pause' : 'Écouter'}</span>
            </button>
            <button
              onClick={handleReset}
              type="button"
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#1c100a] hover:bg-[#2c170d] text-[#c49b82] border border-[#3f2214] font-medium text-xs active:scale-95 transition-transform"
              title="Réenregistrer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Réessayer</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
