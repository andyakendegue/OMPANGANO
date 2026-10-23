import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  X, 
  Clock, 
  Check, 
  Sparkles, 
  Volume2, 
  Send, 
  Smartphone,
  CheckCircle2
} from 'lucide-react';
import { NotificationService } from '../services/notificationService';
import { AppNotification } from '../types';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose
}) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isPushGranted, setIsPushGranted] = useState(false);
  const [reminderTime, setReminderTime] = useState('18:30');
  const [isReminderActive, setIsReminderActive] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNotifications(NotificationService.getInAppNotifications());
      setIsPushGranted(NotificationService.getPermission() === 'granted');
      setReminderTime(NotificationService.getReminderTime());
      setIsReminderActive(NotificationService.isReminderEnabled());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRequestPush = async () => {
    const granted = await NotificationService.requestPermission();
    setIsPushGranted(granted);
    if (granted) {
      NotificationService.sendLocalNotification('Notifications Enenga Activées !', {
        body: 'Vous recevrez vos rappels d’apprentissage et alertes de validation.'
      });
      setNotifications(NotificationService.getInAppNotifications());
    } else {
      alert("La permission pour les notifications n'a pas été accordée dans votre navigateur.");
    }
  };

  const handleSaveReminder = () => {
    NotificationService.setReminderTime(reminderTime);
    NotificationService.setReminderEnabled(isReminderActive);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  };

  const handleSendTestNotification = () => {
    NotificationService.sendLocalNotification('Nkala App : Moment Enenga 🌅', {
      body: '5 minutes de parole aujourd’hui pour préserver les voix de nos lagunes !'
    });
    setNotifications(NotificationService.getInAppNotifications());
  };

  const handleMarkAllRead = () => {
    NotificationService.markAllAsRead();
    setNotifications(NotificationService.getInAppNotifications());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg warm-card-gradient border-2 border-[#d97706]/40 rounded-3xl p-6 shadow-2xl space-y-5 text-white max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#4a2412] pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl terracotta-gradient text-white shadow-md">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">Notifications & Rappels Quotidiens</h3>
              <p className="text-xs text-[#d4af94]">Gardez le lien régulier avec la langue Enenga</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-[#27150c] text-[#a8826d] hover:text-white"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Settings & Notifications */}
        <div className="overflow-y-auto space-y-5 pr-1 flex-1">
          {/* Push Permission Card */}
          <div className="p-4 bg-[#180d07] rounded-2xl border border-[#4a2412] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-[#fed7aa]">
                <Smartphone className="w-4 h-4 text-[#f59e0b]" />
                <span>Notifications Push du Navigateur</span>
              </div>
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                isPushGranted ? 'bg-[#15803d]/30 text-[#86efac]' : 'bg-[#991b1b]/30 text-[#fca5a5]'
              }`}>
                {isPushGranted ? 'Autorisées' : 'Non activées'}
              </span>
            </div>

            {!isPushGranted ? (
              <button
                onClick={handleRequestPush}
                className="w-full py-2.5 rounded-xl terracotta-gradient hover:opacity-90 text-white font-bold text-xs shadow-md active:scale-95 transition-all"
              >
                Activer les notifications du navigateur
              </button>
            ) : (
              <button
                onClick={handleSendTestNotification}
                className="w-full py-2 rounded-xl bg-[#2b170e] hover:bg-[#381e13] border border-[#d97706]/40 text-[#fed7aa] font-medium text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5 text-[#f59e0b]" />
                <span>Tester une notification maintenant</span>
              </button>
            )}
          </div>

          {/* Daily Reminder Time Picker */}
          <div className="p-4 bg-[#180d07] rounded-2xl border border-[#4a2412] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-[#fed7aa]">
                <Clock className="w-4 h-4 text-[#c85a32]" />
                <span>Rappel Quotidien Personnalisé</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isReminderActive}
                  onChange={(e) => setIsReminderActive(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-[#3f2113] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#c85a32]"></div>
              </label>
            </div>

            <p className="text-[11px] text-[#a8826d]">
              Une notification discrète vous invitera à valider 2 expressions et enregistrer votre voix pour maintenir votre série active.
            </p>

            <div className="flex items-center gap-3">
              <input
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                disabled={!isReminderActive}
                className="px-3 py-2 bg-[#27150c] border border-[#4a2412] rounded-xl text-white font-mono text-sm focus:outline-none focus:border-[#f59e0b] disabled:opacity-40"
              />
              <button
                onClick={handleSaveReminder}
                className="px-4 py-2 rounded-xl terracotta-gradient text-white text-xs font-bold shadow-md flex items-center gap-1.5 active:scale-95 transition-transform"
              >
                {justSaved ? <CheckCircle2 className="w-3.5 h-3.5 text-[#86efac]" /> : <Check className="w-3.5 h-3.5" />}
                <span>{justSaved ? 'Enregistré !' : 'Programmer'}</span>
              </button>
            </div>
          </div>

          {/* In-app Notification History */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#d4af94]">Historique des alertes</h4>
              {notifications.length > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-[11px] text-[#f59e0b] hover:underline"
                >
                  Tout marquer comme lu
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <p className="text-xs text-[#a8826d] text-center py-4 bg-[#180d07] rounded-xl border border-[#3b1d10]">
                Aucune alerte pour l'instant. Vos récompenses apparaîtront ici.
              </p>
            ) : (
              <div className="space-y-2">
                {notifications.map(notif => (
                  <div
                    key={notif.id}
                    className="p-3 bg-[#180d07] border border-[#3b1d10] rounded-xl text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">{notif.title}</span>
                      <span className="text-[10px] text-[#a8826d]">
                        {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[#d4af94] text-[11px] leading-relaxed">{notif.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
