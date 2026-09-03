/**
 * UI copy, Russian-first.
 *
 * Content rules from the design system are baked in here rather than left to
 * each component: neutral third person (the service never says «мы»), sentence
 * case, «вы» never «ты», no exclamation marks, no emoji, and empty states that
 * name the fact first and the next step second.
 *
 * A second language is a second object with the same keys plus a locale-aware
 * `useDictionary()`; nothing else in the app needs to change.
 */
export const dictionary = {
  brand: {
    name: "Evade Films",
    tagline: "Смотрите иначе",
  },

  nav: {
    home: "Главная",
    movies: "Фильмы",
    series: "Сериалы",
    search: "Поиск",
    notifications: "Уведомления",
  },

  action: {
    watch: "Смотреть",
    continue: "Продолжить",
    details: "Подробнее",
    trailer: "Трейлер",
    bookmark: "В избранное",
    all: "Все",
    retry: "Повторить",
    reset: "Сбросить",
    back: "Назад",
    more: "Показать ещё",
    toCatalog: "В каталог",
  },

  home: {
    heroOverline: "Смотрите иначе",
    continueWatching: "Продолжить просмотр",
    continueWatchingOverline: "Вы остановились",
    newMovies: "Новое в кино",
    newSeries: "Новые сериалы",
    movies: "Фильмы",
    series: "Сериалы",
    allTitles: "Весь каталог",
    inCatalog: "В каталоге",
    similar: "Похожее",
  },

  catalog: {
    moviesTitle: "Фильмы",
    seriesTitle: "Сериалы",
    searchTitle: "Поиск",
    searchPlaceholder: "Фильмы, сериалы",
    found: (n: number) => `Найдено ${n}`,
    titles: (n: number) => `${n} ${plural(n, "тайтл", "тайтла", "тайтлов")}`,
    filters: "Фильтры",
    anyRating: "Любой возраст",
    anyCountry: "Любая страна",
    anyYear: "Любой год",
    sort: "Сортировка",
    sortNew: "Сначала новые",
    sortOld: "Сначала старые",
    sortAz: "По алфавиту",
    sortYear: "По году",
  },

  title: {
    overview: "Обзор",
    episodes: "Эпизоды",
    details: "Детали",
    director: "Страна",
    country: "Страна",
    year: "Год",
    duration: "Длительность",
    ageRating: "Возраст",
    original: "Оригинальное название",
    voiceover: "Озвучка",
    subtitles: "Субтитры",
    seasonN: (n: number) => `Сезон ${n}`,
    episodeN: (n: number) => `Эпизод ${n}`,
    seasons: (n: number) => `${n} ${plural(n, "сезон", "сезона", "сезонов")}`,
    episodesCount: (n: number) => `${n} ${plural(n, "эпизод", "эпизода", "эпизодов")}`,
    minutes: (n: number) => `${n} мин`,
    noSubtitles: "Нет",
    noVoiceover: "Оригинальная дорожка",
  },

  player: {
    title: "Просмотр",
    season: "Сезон",
    episode: "Эпизод",
    voiceover: "Озвучка",
    loading: "Загрузка потока",
    linkExpired: "Ссылка на поток истекла.",
    linkExpiredHint: "Обновите страницу, чтобы получить новую.",
  },

  empty: {
    catalog: "Пока ничего нет.",
    catalogHint: "Каталог наполняется — загляните позже.",
    search: "Ничего не найдено.",
    searchHint: "Измените запрос или сбросьте фильтры.",
    episodes: "Эпизодов пока нет.",
    episodesHint: "Они появятся здесь, как только выйдут.",
    playback: "Видео пока недоступно.",
    playbackHint: "Файл ещё обрабатывается — вернитесь позже.",
  },

  auth: {
    signIn: "Войти",
    signUp: "Регистрация",
    signOut: "Выйти",
    signInTitle: "Вход",
    signUpTitle: "Новый аккаунт",
    signInHint: "Оценки, закладки и прогресс просмотра сохраняются в аккаунте.",
    signUpHint: "Хватит почты и пароля — остальное можно заполнить позже.",
    email: "Почта",
    password: "Пароль",
    passwordRepeat: "Пароль ещё раз",
    username: "Имя пользователя",
    usernameHint: "Под ним вас видят в комментариях. Можно оставить пустым.",
    toSignUp: "Ещё нет аккаунта",
    toSignIn: "Уже есть аккаунт",
    submitSignIn: "Войти",
    submitSignUp: "Создать аккаунт",
    signedInAs: (name: string) => `Вы вошли как ${name}`,
    signedOut: "Вы вышли из аккаунта",
    required: "Заполните поле",
    passwordMismatch: "Пароли не совпадают",
    needAccount: "Нужен аккаунт",
    needAccountHint: "Войдите, чтобы продолжить.",
  },

  account: {
    title: "Аккаунт",
    profile: "Профиль",
    watchlist: "Закладки",
    ratings: "Оценки",
    comments: "Комментарии",
    history: "История",
    joined: (date: string) => `С нами с ${date}`,
    displayName: "Отображаемое имя",
    firstName: "Имя",
    lastName: "Фамилия",
    bio: "О себе",
    birthDate: "Дата рождения",
    language: "Язык",
    languageRu: "Русский",
    languageEn: "English",
    save: "Сохранить",
    saved: "Изменения сохранены",
    changePassword: "Смена пароля",
    currentPassword: "Текущий пароль",
    newPassword: "Новый пароль",
    passwordChanged: "Пароль изменён",
    commentBanned: "Комментарии для этого аккаунта закрыты.",
    commentBannedHint: "Читать, оценивать и смотреть по-прежнему можно.",
    staff: "Сотрудник",
    noRatings: "Вы ещё ничего не оценили.",
    noRatingsHint: "Оценка ставится на странице фильма или сериала.",
    noComments: "Вы ещё не оставляли комментариев.",
    noCommentsHint: "Обсуждение открыто под каждым тайтлом.",
  },

  rating: {
    title: "Оценка",
    yours: "Ваша оценка",
    average: "Средняя оценка",
    none: "Пока не оценивали",
    votes: (n: number) => `${n} ${plural(n, "оценка", "оценки", "оценок")}`,
    rate: "Оценить",
    clear: "Убрать оценку",
    scoreOf: (value: number) => `Оценка ${value} из 10`,
    signInToRate: "Войдите, чтобы поставить оценку.",
  },

  watchlist: {
    title: "Закладки",
    add: "В закладки",
    added: "В закладках",
    remove: "Убрать из закладок",
    favorite: "В избранное",
    unfavorite: "Убрать из избранного",
    status: "Статус",
    planned: "Буду смотреть",
    watching: "Смотрю",
    completed: "Посмотрел",
    dropped: "Бросил",
    onlyFavorites: "Только избранное",
    anyStatus: "Любой статус",
    empty: "В закладках пусто.",
    emptyHint: "Добавьте тайтл со страницы фильма или сериала.",
  },

  comments: {
    title: "Комментарии",
    count: (n: number) => `${n} ${plural(n, "комментарий", "комментария", "комментариев")}`,
    placeholder: "Что скажете о тайтле",
    replyPlaceholder: "Ответ",
    submit: "Отправить",
    reply: "Ответить",
    edit: "Изменить",
    save: "Сохранить",
    cancel: "Отмена",
    remove: "Удалить",
    removed: "Комментарий удалён",
    deletedBody: "Комментарий удалён",
    edited: "изменён",
    spoiler: "Спойлер",
    spoilerHidden: "Спойлер. Нажмите, чтобы прочитать.",
    like: "Нравится",
    dislike: "Не нравится",
    ownReaction: "Свой комментарий нельзя оценить.",
    sortNew: "Сначала новые",
    sortOld: "Сначала старые",
    sortTop: "Популярные",
    empty: "Комментариев пока нет.",
    emptyHint: "Будьте первым, кто скажет о тайтле.",
    signInHint: "Войдите, чтобы оставить комментарий.",
    repliesCount: (n: number) => `${n} ${plural(n, "ответ", "ответа", "ответов")}`,
  },

  history: {
    title: "История просмотров",
    empty: "История пуста.",
    emptyHint: "Всё, что вы запустите, появится здесь.",
    finished: "Досмотрено",
    unfinished: "Не досмотрено",
    all: "Всё",
    resume: "Продолжить",
    watchedAt: "Просмотр",
    progress: (percent: number) => `${percent}%`,
  },

  profile: {
    title: "Профиль",
    notFound: "Профиль не найден.",
    notFoundHint: "Проверьте имя пользователя.",
  },

  error: {
    title: "Что-то пошло не так.",
    hint: "Попробуйте обновить страницу.",
    offline: "Сервис недоступен.",
    offlineHint: "Проверьте соединение и повторите попытку.",
    notFoundTitle: "Страница не найдена.",
    notFoundHint: "Проверьте адрес или вернитесь в каталог.",
  },
} as const;

/** Russian plural rules — used only for the counts above. */
function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

export type Dictionary = typeof dictionary;
