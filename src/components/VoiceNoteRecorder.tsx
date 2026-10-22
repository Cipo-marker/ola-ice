import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Play, RotateCcw, Trash2 } from 'lucide-react';

const MAX_LENGTH_SECONDS = 60;
const MAX_FILE_BYTES = 8 * 1024 * 1024;

export const VoiceNoteRecorder: React.FC<{ onChange: (audio: Blob | null) => void }> = ({ onChange }) => {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | undefined>();
  const urlRef = useRef('');
  const [audio, setAudio] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState('');

  const releaseStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };
  const clearAudio = () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = '';
    setAudioUrl('');
    setAudio(null);
    onChange(null);
  };

  useEffect(() => () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    releaseStream();
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
  }, []);

  const stopRecording = () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  };

  const startRecording = async () => {
    setError('');
    clearAudio();
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError('Cet appareil ou navigateur ne permet pas l’enregistrement vocal. Vous pouvez continuer sans note vocale.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const preferredType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, preferredType ? { mimeType: preferredType } : undefined);
      chunksRef.current = [];
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = () => {
        if (timerRef.current) window.clearInterval(timerRef.current);
        setRecording(false);
        releaseStream();
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (!blob.size) return;
        if (blob.size > MAX_FILE_BYTES) {
          setError('La note dépasse la taille maximale de 8 Mo. Faites un enregistrement plus court.');
          return;
        }
        const url = URL.createObjectURL(blob);
        urlRef.current = url;
        setAudio(blob);
        setAudioUrl(url);
        onChange(blob);
      };
      recorder.start(250);
      setRecording(true);
      setSeconds(0);
      timerRef.current = window.setInterval(() => setSeconds((current) => {
        if (current + 1 >= MAX_LENGTH_SECONDS) window.setTimeout(stopRecording, 0);
        return Math.min(current + 1, MAX_LENGTH_SECONDS);
      }), 1000);
    } catch {
      setError('Accès au microphone refusé ou indisponible. Autorisez le microphone pour enregistrer votre repère.');
      releaseStream();
    }
  };

  const formatTime = (value: number) => `${Math.floor(value / 60).toString().padStart(2, '0')}:${(value % 60).toString().padStart(2, '0')}`;

  return (
    <div className="space-y-2 rounded-2xl border border-neutral-200 bg-neutral-50 p-3.5">
      <div>
        <p className="text-xs font-semibold text-neutral-800">Note vocale pour trouver la maison <span className="font-normal text-neutral-500">(facultatif)</span></p>
        <p className="mt-0.5 text-[11px] text-neutral-500">Expliquez au livreur comment repérer votre maison. 60 secondes maximum.</p>
      </div>
      {recording ? (
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-xs font-semibold text-rose-700"><span className="h-2 w-2 animate-pulse rounded-full bg-rose-600" />Enregistrement · {formatTime(seconds)} / 01:00</span>
          <button type="button" onClick={stopRecording} className="flex items-center gap-1.5 rounded-xl bg-neutral-900 px-3 py-2 text-xs font-bold text-white"><MicOff className="h-4 w-4" />Arrêter</button>
        </div>
      ) : audio && audioUrl ? (
        <div className="space-y-2">
          <audio controls src={audioUrl} className="h-10 w-full" />
          <div className="flex gap-2">
            <button type="button" onClick={startRecording} className="flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700"><RotateCcw className="h-3.5 w-3.5" />Recommencer</button>
            <button type="button" onClick={clearAudio} className="flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700"><Trash2 className="h-3.5 w-3.5" />Supprimer</button>
            <span className="ml-auto self-center text-[10px] text-neutral-400">{(audio.size / 1024 / 1024).toFixed(1)} Mo</span>
          </div>
        </div>
      ) : (
        <button type="button" onClick={startRecording} className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-3 py-2.5 text-xs font-bold text-rose-700 transition hover:bg-rose-50"><Mic className="h-4 w-4" />Enregistrer une note vocale</button>
      )}
      {error && <p role="alert" className="text-[11px] text-rose-700">{error}</p>}
      {!error && <p className="flex items-center gap-1 text-[10px] text-neutral-400"><Play className="h-3 w-3" />Votre note est envoyée avec la commande et visible par l’équipe de livraison.</p>}
    </div>
  );
};
