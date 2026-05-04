export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'ahora';
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) {
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return dayNames[new Date(timestamp).getDay()];
  }
  const d = new Date(timestamp);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

export function normalizePhone(phone: string): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

export function getAvatarColor(name: string) {
  const colors = [
    'bg-[#005c4b]', 
    'bg-[#FF6B00]', 
    'bg-[#3B82F6]', 
    'bg-[#8b5cf6]', 
    'bg-[#ec4899]', 
    'bg-[#eab308]', 
    'bg-[#10b981]'
  ];
  let hash = 0;
  for (let i = 0; i < (name || "").length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}
