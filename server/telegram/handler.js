// Pure update handler: no database writes, no account creation, no logging of user data.
export function replyForUpdate(update, config) {
  if (!Number.isSafeInteger(update?.update_id) || update.update_id < 0) return null;
  const message = update.message;
  if (message?.chat?.type !== 'private' || message.from?.is_bot !== false || !Number.isSafeInteger(message.from?.id) || message.from.id <= 0 || message.chat.id !== message.from.id) return null;
  if (typeof message.text !== 'string') return null;
  const match = /^\/(start|help)(?:@([a-zA-Z0-9_]+))?(?:\s|$)/.exec(message.text);
  if (!match || (match[2] && match[2].toLowerCase() !== config.username.toLowerCase())) return null;
  return {
    method: 'sendMessage', chat_id: message.chat.id,
    text: match[1] === 'start'
      ? 'Avto xizmatiga xush kelibsiz! Kabinetni ochish uchun quyidagi tugmani bosing.'
      : '«Kabinetni ochish» tugmasi orqali Avto ilovasiga kirasiz. Kabinet hozir tayyorlanmoqda. Alohida parol yaratish talab qilinmaydi.',
    reply_markup: { inline_keyboard: [[{ text: 'Kabinetni ochish', web_app: { url: config.miniAppUrl } }]] },
  };
}
