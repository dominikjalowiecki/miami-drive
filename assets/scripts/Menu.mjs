import Game from './Game.mjs';
import Sound from './Sound.mjs';
import Utils from './Utils.mjs';

export default class Menu {
  #menu;
  #menuItems;
  #gameLoadingSpinners;
  #volumeControl;
  #carSelect;
  #mainMenuBtn;
  #mobileLeftDirection;
  #mobileRightDirection;
  #scoreText;
  #finalScoreText;
  #bestScoreText;

  #sounds = {
    music: null,
    carCollision: null,
    carHorn: null,
    carStarting: null,
    carIdle: null,
  };

  #game;
  #gameDiv;
  #volume = 0.5;
  #selectedCar = 'volkswagen-golf-gti';
  #availableLevels = ['morning', 'day', 'night'];

  #gameLoading = false;

  set gameLoading(value) {
    this.#gameLoading = value;
    if (this.#gameLoading) {
      this.#gameLoadingSpinners.forEach(
        (gameLoadingSpinner) =>
          (gameLoadingSpinner.style.display = 'inline-block')
      );
    } else {
      this.#gameLoadingSpinners.forEach(
        (gameLoadingSpinner) => (gameLoadingSpinner.style.display = 'none')
      );
    }
  }

  constructor() {
    this.#menu = Utils.getElement('#menu');
    this.#menuItems = Utils.getAllElements('.menu-item');
    this.#gameLoadingSpinners = Utils.getAllElements('.game-loading-spinner');
    this.#volumeControl = Utils.getElement('#volume-control');
    this.#carSelect = Utils.getElement('#car-select');
    this.#mainMenuBtn = Utils.getElement('#main-menu-btn');
    this.#mobileLeftDirection = Utils.getElement('#left-direction');
    this.#mobileRightDirection = Utils.getElement('#right-direction');
    this.#scoreText = Utils.getElement('#score-text');
    this.#finalScoreText = Utils.getElement('#final-score-text');
    this.#bestScoreText = Utils.getElement('#best-score-text');
    this.#gameDiv = Utils.getElement('#game');

    this.#volumeControl.value = this.#volume;
    this.#sounds = {
      music: new Sound(
        'assets/sounds/miami-drive-ost-Filip-Bury.mp3',
        true,
        this.#volume
      ),
      carCollision: new Sound(
        'assets/sounds/car-explosion.wav',
        false,
        this.#volume
      ),
      carHorn: new Sound('assets/sounds/car-horn.wav', false, this.#volume),
      carStarting: new Sound(
        'assets/sounds/car-starting.wav',
        false,
        this.#volume
      ),
      carIdle: new Sound('assets/sounds/car-idle.wav', true, this.#volume),
    };

    this.#menu.addEventListener('click', (event) =>
      this.#handleMenuClick(event)
    );
    this.#volumeControl.addEventListener('change', (event) =>
      this.#handleVolumeControlChange(event)
    );
    this.#carSelect.addEventListener('change', (event) =>
      this.#handleCarSelectChange(event)
    );
    this.#mainMenuBtn.addEventListener('click', (event) =>
      this.#handleMainMenuBtnClick(event)
    );
    this.#mobileLeftDirection.addEventListener('click', (event) =>
      this.#handleMobileLeftDirectionClick(event)
    );
    this.#mobileRightDirection.addEventListener('click', (event) =>
      this.#handleMobileRightDirectionClick(event)
    );

    this.#handleUnlockCars();
  }

  #navigateMenu(destination) {
    const targetMenuItem = this.#menuItems.find(
      (menuItem) => menuItem.id === destination
    );

    if (targetMenuItem !== undefined) {
      for (const menuItem of this.#menuItems) {
        menuItem.style.display = 'none';
      }
      targetMenuItem.style.display = 'flex';
    }
  }

  #handleMenuClick(event) {
    const target = event.target;
    if (target.tagName === 'BUTTON' && target.classList.contains('menu-btn')) {
      const destination = target.getAttribute('data-destination');
      switch (destination) {
        case 'start-game':
          if (!this.#gameLoading) {
            this.gameLoading = true;
            if (this.#game === undefined) {
              this.#game = new Game(
                this.#sounds,
                this.#scoreText,
                () => this.#handleGameStop(),
                this.#gameDiv
              );
            }

            this.#game
              .loadAssets()
              .then(() => {
                const selectedLevel =
                  this.#availableLevels[Math.floor(Math.random() * 3)];
                this.#game.start(this.#selectedCar, selectedLevel);
                this.#menu.style.display = 'none';
                this.gameLoading = false;
              })
              .catch((error) => {
                console.error(error);
              });
          }
        default:
          this.#navigateMenu(destination);
      }
    }
  }

  #handleVolumeControlChange(event) {
    const target = event.target;
    this.#volume = target.value;

    Object.values(this.#sounds).forEach(
      (sound) => (sound.volume = this.#volume)
    );
  }

  #handleCarSelectChange(event) {
    const target = event.target;
    this.#selectedCar = target.value;
  }

  #handleMainMenuBtnClick(event) {
    this.#handleGameStop();
  }

  #handleGameStop() {
    this.#game.stop();

    const scoreText = this.#scoreText.innerHTML;
    const score = Number(scoreText);
    let bestScore = localStorage.getItem('miamiDriveBestScore');
    if (!isNaN(score) && (bestScore === null || Number(bestScore) < score)) {
      localStorage.setItem('miamiDriveBestScore', score);
      bestScore = score;
    }

    this.#finalScoreText.innerHTML = score;
    this.#bestScoreText.innerHTML = bestScore ?? 0;
    this.#menu.style.display = 'flex';
    this.#navigateMenu('menu-result');

    this.#handleUnlockCars();
  }

  #handleMobileLeftDirectionClick(event) {
    this.#game.leftMove();
  }

  #handleMobileRightDirectionClick(event) {
    this.#game.rightMove();
  }

  #unlockCar(carId, carText) {
    const car = this.#carSelect.querySelector(`#${carId}`);
    car.disabled = false;
    car.innerHTML = carText;
  }

  #handleUnlockCars() {
    let bestScore = localStorage.getItem('miamiDriveBestScore');

    if (bestScore !== null) {
      bestScore = Number(bestScore);

      if (bestScore >= 30) {
        this.#unlockCar('nissan-skyline-gtr-r-34', 'Nissan Skyline GTR R-34');
      }

      if (bestScore >= 50) {
        this.#unlockCar('ferrari-enzo', 'Ferrari Enzo');
      }
    }
  }
}
