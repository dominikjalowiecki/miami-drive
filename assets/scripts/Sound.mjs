export default class Sound {
  #sound;

  set volume(value) {
    this.#sound.volume = value;
  }

  constructor(src, loop = false, volume = 1.0) {
    this.#sound = document.createElement('audio');
    this.#sound.src = src;
    if (loop) {
      this.#sound.setAttribute('loop', true);
    }
    this.#sound.setAttribute('preload', 'auto');
    this.#sound.setAttribute('controls', 'none');
    this.#sound.volume = volume;
    this.#sound.style.display = 'none';

    document.body.appendChild(this.#sound);
  }

  play() {
    this.#sound.currentTime = 0;
    this.#sound.play();
  }

  pause() {
    this.#sound.pause();
  }
}
