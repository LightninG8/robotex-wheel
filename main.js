(async () => {
  // ========== DOM элементы ==========
  // Кнопки
  const spinButtonElem = document.querySelector(".spin-btn");
  const prizeButtonElem = document.querySelector(".prize-btn");
  const refuseButtonElem = document.querySelector(".refuse-btn");

  // Колесо
  const wheelWrapperElem = document.querySelector(".page__wheel");
  const wheelBodyElem = document.querySelector(".wheel__body");

  // Попап
  const popupWrapperElem = document.querySelector(".page__popup");
  const popupImageElem = document.querySelector(".popup__image img");
  const popupNameElem = document.querySelector(".popup__name");
  const popupPrizeElem = document.querySelector(".popup__prize");
  const popupFormElem = document.querySelector(".popup__form");

  const formInputNameElem = document.querySelector(".input-name");
  const formInputEmailElem = document.querySelector(".input-email");
  const formInputPhoneElem = document.querySelector(".input-phone");
  // Прелоадер
  const preloaderElem = document.querySelector(".page__preloader");

  // ========== LOCAL STORAGE ==========
  localStorage.getItem("availableSpins")
    ? localStorage.getItem("availableSpins")
    : localStorage.setItem("availableSpins", 1);
  localStorage.getItem("dealSpins")
    ? localStorage.getItem("dealSpins")
    : localStorage.setItem("dealSpins", 0);

  localStorage.getItem("droppedPrizeIndex")
    ? localStorage.getItem("droppedPrizeIndex")
    : localStorage.setItem("droppedPrizeIndex", -1);

  // ========== ПОЛУЧЕНИЕ ПЕРЕМЕННЫХ ==========
  // Переменные пользователя
  let availableSpins = +localStorage.getItem("availableSpins");
  let dealSpins = +localStorage.getItem("dealSpins");
  let droppedPrizeIndex = +localStorage.getItem("droppedPrizeIndex");

  // Переменные приложения
  let isLoading = true;
  const isInfiniteSpins = false;

  // ========== ИЗМЕНЕНИЕ ПЕРЕМЕННЫХ ==========
  function setAvailableSpins(value) {
    availableSpins = value;
    localStorage.setItem("availableSpins", availableSpins);
  }

  function setDealSpins(value) {
    dealSpins = value;
    localStorage.setItem("dealSpins", dealSpins);
  }

  function setDroppedPrizeIndex(value) {
    droppedPrizeIndex = value;
    localStorage.setItem("droppedPrizeIndex", droppedPrizeIndex);
  }

  function setIsPageLoading(value) {
    isLoading = value;

    if (isLoading) {
      preloaderElem.classList.add("active");
    } else {
      preloaderElem.classList.remove("active");
    }
  }

  function saveSpinsCount() {
    setAvailableSpins(availableSpins - 1);
    setDealSpins(dealSpins + 1);

    if (availableSpins <= 0 && !isInfiniteSpins) {
      spinButtonElem.style.pointerEvents = "none";
    }
  }

  // ========== СЕРВИСНЫЕ ФУНКЦИИ ==========
  function debounce(func, timeout = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        func.apply(this, args);
      }, timeout);
    };
  }

  let audioCache = {};

  function doSound(audioPath, time, loop, volume) {
    let audio = audioCache[audioPath];
    if (!audio) {
      audio = new Audio();
      audio.preload = "auto";
      audio.src = audioPath;
      audio.loop = loop;
      audio.volume = volume;
      audioCache[audioPath] = audio;
    }

    if (audio.paused) {
      audio.play();
    } else {
      audio.currentTime = time;
    }
  }

  const doClickSound = () => {
    doSound(
      "https://fs01.getcourse.ru/fileservice/file/download/a/176948/sc/65/h/8913d21d6ae251b423d89ada59677669.mp3",
      0.033,
      false,
      0.2
    );
  };

  // ========== DOM ==========
  if (!localStorage.getItem("email")) {
    preloaderElem.classList.remove("active");
    showFormPopup();
  }

  // ========== СПИСОК ПРИЗОВ ==========
  function getPrizes() {
    return fetch(
      "https://script.google.com/macros/s/AKfycbwgLJePywZKmA2G6h1OrRn5QxHerS0qyBn6t6G1iyxMgo55PDz7UY-3YZAhOB8lU1gV/exec"
    )
      .then((body) => body.json())
      .then((json) => {
        return json.map((el) => ({
          id: el[0],
          title: el[1],
          dropChance: el[3] <= 0 ? 0 : el[2],
        }));
      });
  }

  const prizes = await getPrizes();
  setIsPageLoading(false);

  // ========== ПОПАП ==========
  function showPrizePopup(index) {
    const prize = prizes[index];

    popupFormElem.classList.remove("active");
    popupPrizeElem.classList.add("active");
    popupWrapperElem.classList.add("active");
    popupNameElem.textContent = prize.title;
    popupImageElem.src = `./img/prize_${index}.png`;
  }

  function showFormPopup() {
    popupFormElem.classList.add("active");
    popupPrizeElem.classList.remove("active");
    popupWrapperElem.classList.add("active");
  }

  // ========== КОЛЕСО ==========
  // ---------- Переменные колеса ----------
  // угловой размер сектора
  const prizeSlice = 360 / prizes.length;
  const sliceOffset = 180 / prizeSlice;

  // Переменная с индексом выпавшего приза
  let prizeIndex;
  // переменная для анимации
  let wheelTickerAnim;
  // угол вращения
  let rotation = 0;
  // текущий сектор
  let currentSlice = 0;
  // флаг состояния вращения
  let isSpinning = false;

  function getElemRotationAngle(elem) {
    const wheelSpinnerStyles = window.getComputedStyle(elem);

    const values = wheelSpinnerStyles.transform
      .split("(")[1]
      .split(")")[0]
      .split(",");
    const a = values[0];
    const b = values[1];
    let rad = Math.atan2(b, a);

    if (rad < 0) rad += 2 * Math.PI;

    const angle = Math.round(rad * (180 / Math.PI));

    return angle;
  }

  // Шанс дропа
  function lerp(min, max, value) {
    return (1 - value) * min + value * max;
  }

  function dropPrize(items) {
    const total = items.reduce(
      (accumulator, item) => accumulator + item.dropChance,
      0
    );
    const chance = lerp(0, total, Math.random());

    let current = 0;
    for (let i = 0; i < items.length; i++) {
      item = items[i];

      if (current <= chance && chance < current + item.dropChance) {
        return i;
      }

      current += item.dropChance;
    }

    return current;
  }

  // ---------- Функции анимации ----------
  // определяем количество оборотов, которое сделает наше колесо
  const spinertia = (min, max) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  function runwheelTickerAnimation() {
    // взял код анимации отсюда: https://css-tricks.com/get-value-of-css-rotation-through-javascript/
    const angle = getElemRotationAngle(wheelBodyElem);
    const slice = Math.floor((angle + prizeSlice / 2) / prizeSlice);

    // если появился новый сектор
    if (currentSlice !== slice) {
      doClickSound();

      // после того, как язычок прошёл сектор - делаем его текущим
      currentSlice = slice;
    }

    // запускаем анимацию
    wheelTickerAnim = requestAnimationFrame(runwheelTickerAnimation);
  }

  // ========== ОБРАБОТЧИКИ СОБЫТИЙ ==========
  function onSpinButtonClick() {
    if (isSpinning) {
      return;
    }

    wheelBodyElem.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    isSpinning = true;

    const angle = getElemRotationAngle(wheelBodyElem);
    wheelBodyElem.classList.remove("anim");
    wheelBodyElem.style.setProperty("--rotate", angle);

    setTimeout(() => {
      document.body.classList.add("is-spinning");

      // задаём начальное вращение колеса
      prizeIndex = dropPrize(prizes);

      rotation =
        Math.floor(prizeIndex * -prizeSlice + spinertia(10, 15) * 360) +
        prizeSlice / 2 -
        sliceOffset / 2 -
        Math.random() * (prizeSlice - sliceOffset);

      // через CSS говорим секторам, как им повернуться
      wheelBodyElem.style.setProperty("--rotate", rotation);

      // запускаем анимацию вращения
      runwheelTickerAnimation();

      // Засчитываем результат
      saveSpinsCount();

      // Показываем попап
      setDroppedPrizeIndex(prizeIndex);

      fetch(
        "https://script.google.com/macros/s/AKfycbwgLJePywZKmA2G6h1OrRn5QxHerS0qyBn6t6G1iyxMgo55PDz7UY-3YZAhOB8lU1gV/exec?" +
          new URLSearchParams({
            name: localStorage.getItem("name"),
            email: localStorage.getItem("email"),
            phone: localStorage.getItem("phone"),
            prize: prizes[prizeIndex].id,
          }).toString(),
        {
          method: "POST",
        }
      );

      setTimeout(() => {
        showPrizePopup(prizeIndex);
      }, 6000);
    }, 0);
  }

  function onWheelAnimationEnd() {
    if (!isSpinning) {
      return;
    }

    // останавливаем отрисовку вращения
    cancelAnimationFrame(runwheelTickerAnimation);

    // получаем текущее значение поворота колеса
    rotation %= 360;

    // убираем класс, который отвечает за вращение
    document.body.classList.remove("is-spinning");
    // отправляем в CSS новое положение поворота колеса
    wheelBodyElem.style.setProperty("--rotate", rotation);
    // делаем кнопку снова активной
    isSpinning = false;
  }

  // ---------- Обработчики событий ----------
  // Начало анимации
  spinButtonElem.addEventListener("click", onSpinButtonClick);

  // Конец вращения
  wheelBodyElem.addEventListener("transitionend", onWheelAnimationEnd);

  popupFormElem.addEventListener("submit", (e) => {
    e.preventDefault();

    const name = formInputNameElem.value;
    const email = formInputEmailElem.value;
    const phone = formInputPhoneElem.value;

    console.log(name, email, phone);

    localStorage.setItem("name", name);
    localStorage.setItem("email", email);
    localStorage.setItem("phone", phone);

    popupWrapperElem.classList.remove("active");
  });

  // ========== ПЕРВИЧНАЯ НАСТРОЙКА DOM ==========
  if (droppedPrizeIndex != -1 && !isInfiniteSpins) {
    spinButtonElem.style.pointerEvents = "none";
    wheelBodyElem.classList.remove("anim");
    showPrizePopup(droppedPrizeIndex);
  }
})();
