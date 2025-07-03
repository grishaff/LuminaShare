# Настройка LuminaShare как Telegram Mini-App

## 1. Создание Telegram бота

1. Откройте [@BotFather](https://t.me/BotFather) в Telegram
2. Отправьте `/newbot`
3. Следуйте инструкциям для создания бота
4. Сохраните токен бота

## 2. Настройка Web App

1. В [@BotFather](https://t.me/BotFather) отправьте `/newapp`
2. Выберите ваш бот
3. Введите данные приложения:
   - **Title**: LuminaShare
   - **Description**: Платформа для благотворительности с криптовалютой TON
   - **Photo**: Загрузите иконку приложения
   - **Demo GIF**: (опционально)
   - **Web App URL**: `https://your-vercel-app.vercel.app`

## 3. Получение URL вашего Vercel приложения

Ваше приложение должно быть развернуто на Vercel. URL выглядит примерно так:
```
https://lumina-share-abcd1234.vercel.app
```

## 4. Настройка меню бота

В [@BotFather](https://t.me/BotFather):

1. Отправьте `/mybots`
2. Выберите ваш бот
3. Выберите **Bot Settings** → **Menu Button**
4. Отправьте текст кнопки: `🌟 Открыть LuminaShare`
5. Отправьте Web App URL

## 5. Настройка команд бота (опционально)

```
/start - Добро пожаловать в LuminaShare
/help - Помощь по использованию
/app - Открыть приложение
```

## 6. Тестирование

1. Найдите ваш бот в Telegram
2. Нажмите **Start**
3. Нажмите кнопку меню → **🌟 Открыть LuminaShare**
4. Приложение должно открыться как Web App

## 7. Переменные окружения для продакшена

Убедитесь, что в Vercel настроены переменные:

```bash
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
SUPABASE_ANON_KEY=your_anon_key
R2_ENDPOINT=your_r2_endpoint
R2_BUCKET=your_bucket_name
R2_KEY_ID=your_key_id
R2_SECRET=your_secret
R2_PUBLIC_URL=your_public_url
```

## 8. Дополнительные возможности

- **Inline режим**: Пользователи могут делиться объявлениями в чатах
- **Webhook**: Получение уведомлений о донатах
- **Deep linking**: Прямые ссылки на объявления

## Готово! 🎉

Теперь ваше приложение работает как полноценный Telegram Mini-App. 