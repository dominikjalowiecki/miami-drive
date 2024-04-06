export default class Game {
  #threeLoader;
  #gltfLoader;
  #skyGeoTexture;
  #cars = {
    'nissan-skyline-gtr-r-34': {
      model: null,
      speed: 2,
      steeringRatio: 6,
    },
    'volkswagen-golf-gti': {
      model: null,
      speed: 1,
      steeringRatio: 4,
    },
    'ferrari-enzo': {
      model: null,
      speed: 3,
      steeringRatio: 8,
    },
  };
  #highwayLanes = [-5.6, 0, 5.6];
  #highway;
  #highwayModel;
  #sounds;
  #scoreText;
  #handleGameStop;
  #gameDiv;

  #keydownListener;
  #resizeListener;

  #score;
  #obstacleReleaseInterval;
  #obstaclesPoolSize = 15;
  #currentLane;
  #selectedCar;

  #clock;
  #sceneWidth;
  #sceneHeight;
  #scene;
  #sky;
  #hero;
  #carSpeed;
  #highwayRotationFactor;
  #carSteeringRatio;
  #cylinderRadius = 24.5;
  #cylindricalHelper;
  #obstaclesPool;
  #obstaclesInPath;
  #camera;
  #renderer;
  #gameStarted = false;
  #frameRateMillis = 1000 / 60;
  #frameStartMillis;

  set score(value) {
    this.#score = value;
    this.#scoreText.innerHTML = this.#score;
  }

  constructor(sounds, scoreText, handleGameStop, gameDiv) {
    this.#threeLoader = new THREE.TextureLoader();
    this.#gltfLoader = new THREE.GLTF2Loader();
    this.#sounds = sounds;
    this.#scoreText = scoreText;
    this.#handleGameStop = handleGameStop;
    this.#gameDiv = gameDiv;
  }

  loadAssets() {
    const promises = [];
    if (this.#skyGeoTexture === undefined) {
      promises.push(
        new Promise((resolve, reject) => {
          this.#threeLoader.load(
            'assets/skyboxes/AllSkyFree_Sky_EpicGloriousPink_Equirect.png',
            (data) => {
              this.#skyGeoTexture = data;
              resolve();
            },
            undefined,
            (error) => reject(error)
          );
        })
      );
    }

    if (this.#cars['nissan-skyline-gtr-r-34'].model === null) {
      promises.push(
        new Promise((resolve, reject) => {
          this.#gltfLoader.load(
            'assets/objects/low_poly_nissan_skyline_gtr_r-34/scene.gltf',
            (data) => {
              const model = data.scene;
              model.traverse((child) => {
                if (child.isMesh) {
                  child.castShadow = true;
                  child.receiveShadow = true;
                }
              });
              model.scale.multiplyScalar(0.7);
              model.position.y = this.#cylinderRadius - 1;
              model.position.z = 13;
              model.rotation.x = THREE.Math.degToRad(30);
              model.rotation.y = THREE.Math.degToRad(-180);
              this.#cars['nissan-skyline-gtr-r-34'].model = model;
              resolve();
            },
            undefined,
            (error) => reject(error)
          );
        })
      );
    }

    if (this.#cars['ferrari-enzo'].model === null) {
      promises.push(
        new Promise((resolve, reject) => {
          this.#gltfLoader.load(
            'assets/objects/ferrari_enzo/scene.gltf',
            (data) => {
              const model = data.scene;
              model.traverse((child) => {
                if (child.isMesh) {
                  child.castShadow = true;
                  child.receiveShadow = true;
                }
              });
              model.scale.multiplyScalar(1.2);
              model.position.y = this.#cylinderRadius - 1;
              model.position.z = 13;
              model.rotation.x = THREE.Math.degToRad(30);
              model.rotation.y = THREE.Math.degToRad(0);
              this.#cars['ferrari-enzo'].model = model;
              resolve();
            },
            undefined,
            (error) => reject(error)
          );
        })
      );
    }

    if (this.#cars['volkswagen-golf-gti'].model === null) {
      promises.push(
        new Promise((resolve, reject) => {
          this.#gltfLoader.load(
            'assets/objects/wolf_gsx/scene.glb',
            (data) => {
              const model = data.scene;
              model.traverse((child) => {
                if (child.isMesh) {
                  child.castShadow = true;
                  child.receiveShadow = true;
                }
              });
              model.scale.multiplyScalar(2.2);
              model.position.y = this.#cylinderRadius - 2.2;
              model.position.z = 13;
              model.rotation.x = THREE.Math.degToRad(30);
              model.rotation.y = THREE.Math.degToRad(-180);
              this.#cars['volkswagen-golf-gti'].model = model;
              resolve();
            },
            undefined,
            (error) => reject(error)
          );
        })
      );
    }

    if (this.#highwayModel === undefined) {
      promises.push(
        new Promise((resolve, reject) => {
          this.#gltfLoader.load(
            'assets/objects/terrain.glb',
            (data) => {
              const model = data.scene;
              model.traverse((child) => {
                if (child.isMesh) {
                  child.castShadow = true;
                  child.receiveShadow = true;
                }
              });
              this.#highwayModel = model;
              resolve();
            },
            undefined,
            (error) => reject(error)
          );
        })
      );
    }

    return Promise.all(promises);
  }

  start(selectedCar) {
    this.#frameStartMillis = performance.now();
    this.score = 0;
    this.#currentLane = 1;
    this.#obstacleReleaseInterval = 3;
    this.#selectedCar = selectedCar;
    this.#obstaclesPool = [];
    this.#obstaclesInPath = [];
    this.#highway = this.#highwayModel.clone();
    this.#cylindricalHelper = new THREE.Cylindrical();

    this.#createScene();

    this.#keydownListener = (event) => this.#handleKeyDown(event);
    this.#resizeListener = (event) => this.#handleWindowResize(event);
    document.addEventListener('keydown', this.#keydownListener);
    window.addEventListener('resize', this.#resizeListener);

    this.#sounds.music.play();
    this.#sounds.carStarting.play();
    this.#sounds.carIdle.play();

    this.#gameStarted = true;
    this.#clock = new THREE.Clock();
    this.#clock.start();
    this.#update();
  }

  stop() {
    this.#renderer.dispose();
    this.#renderer.forceContextLoss();

    this.#clock.stop();
    this.#gameDiv.innerHTML = '';

    for (const soundName in this.#sounds) {
      if (soundName !== 'carCollision') {
        this.#sounds[soundName].pause();
      }
    }

    document.removeEventListener('keydown', this.#keydownListener);
    window.removeEventListener('resize', this.#resizeListener);

    this.#gameStarted = false;
  }

  #createScene() {
    this.#sceneWidth = window.innerWidth;
    this.#sceneHeight = window.innerHeight;
    this.#scene = new THREE.Scene();
    this.#scene.fog = new THREE.FogExp2(0xf0fff0, 0.0008);

    const skyGeo = new THREE.SphereGeometry(800, 24, 24);
    const skyGeoMaterial = new THREE.MeshPhongMaterial({
      map: this.#skyGeoTexture,
    });
    this.#sky = new THREE.Mesh(skyGeo, skyGeoMaterial);
    this.#sky.material.side = THREE.BackSide;
    this.#sky.rotation.x = THREE.Math.degToRad(-6);
    this.#sky.rotation.y = THREE.Math.degToRad(90);
    this.#sky.rotation.z = THREE.Math.degToRad(12);

    this.#scene.add(this.#sky);

    this.#camera = new THREE.PerspectiveCamera(
      65,
      this.#sceneWidth / this.#sceneHeight,
      0.1,
      1000
    );

    this.#camera.position.y = this.#cylinderRadius + 2;
    this.#camera.position.z = 32;
    this.#camera.rotation.x = THREE.Math.degToRad(5);

    this.#renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: true,
      precision: 'lowp',
      powerPreference: 'low-power',
    });
    this.#renderer.setClearColor(0xcdc1c5, 1);
    this.#renderer.shadowMap.enabled = true;
    this.#renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.#renderer.setPixelRatio(window.devicePixelRatio);
    this.#renderer.setSize(this.#sceneWidth, this.#sceneHeight);

    this.#gameDiv.appendChild(this.#renderer.domElement);

    this.#createObstaclesPool();

    this.#addWorld();

    this.#addHero();

    this.#addLight();
  }

  #createObstaclesPool() {
    for (let i = 0; i < this.#obstaclesPoolSize; i++) {
      const newObstacle = this.#createObstacle();
      this.#obstaclesPool.push(newObstacle);
    }
  }

  #createObstacle() {
    const obstacleCarModel = this.#cars['volkswagen-golf-gti'].model.clone();
    obstacleCarModel.position.x = 0;
    obstacleCarModel.position.y = 0;
    obstacleCarModel.position.z = 0;
    obstacleCarModel.rotation.y = THREE.Math.degToRad(180);
    obstacleCarModel.visible = false;

    return obstacleCarModel;
  }

  #addWorld() {
    this.#highway.castShadow = false;
    this.#highway.receiveShadow = true;

    this.#scene.add(this.#highway);
  }

  #addHero() {
    if (this.#selectedCar === 'volkswagen-golf-gti') {
      this.#hero = this.#cars['volkswagen-golf-gti'].model.clone();
    } else if (this.#selectedCar === 'ferrari-enzo') {
      this.#hero = this.#cars['ferrari-enzo'].model.clone();
    } else {
      this.#hero = this.#cars[this.#selectedCar].model;
    }
    this.#hero.castShadow = true;
    this.#hero.receiveShadow = true;
    this.#hero.position.x = this.#highwayLanes[this.#currentLane];

    this.#carSpeed = this.#cars[this.#selectedCar].speed;
    this.#highwayRotationFactor = Math.cbrt(this.#carSpeed);
    this.#carSteeringRatio = this.#cars[this.#selectedCar].steeringRatio;

    this.#scene.add(this.#hero);
  }

  #addLight() {
    const hemisphereLight = new THREE.HemisphereLight(0x000000, 0xcdc1c5, 2);
    this.#scene.add(hemisphereLight);

    const sunTarget = new THREE.Object3D();
    sunTarget.position.set(0, 20, 20);
    this.#scene.add(sunTarget);

    const sun = new THREE.DirectionalLight(0xcdc1c5, 0.3);
    sun.castShadow = true;
    sun.position.set(0, 90, -50);
    sun.target = sunTarget;

    this.#scene.add(sun);

    sun.shadow.camera.left = -20;
    sun.shadow.camera.right = 20;
    sun.shadow.camera.top = 20;
    sun.shadow.camera.bottom = -20;
    sun.shadow.mapSize.width = 256;
    sun.shadow.mapSize.height = 256;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 500;
  }

  #update() {
    const now = performance.now();
    if (now - this.#frameStartMillis < this.#frameRateMillis) {
      return window.requestAnimationFrame(() => this.#update());
    }

    this.#highway.rotation.x +=
      (0.05 / this.#obstacleReleaseInterval) * this.#highwayRotationFactor;

    const delta = this.#clock.getDelta();

    const interpolationFactor =
      delta < 0.25 ? delta * this.#carSteeringRatio : 1;
    this.#hero.position.x = THREE.Math.lerp(
      this.#hero.position.x,
      this.#highwayLanes[this.#currentLane],
      interpolationFactor
    );

    this.#camera.position.x = THREE.Math.lerp(
      this.#camera.position.x,
      this.#hero.position.x,
      1
    );

    if (this.#clock.getElapsedTime() > this.#obstacleReleaseInterval) {
      this.#clock.start();

      this.#addPathObstacle();
      this.score = this.#score + 1 * this.#carSpeed;

      if (this.#obstacleReleaseInterval > 1) {
        this.#obstacleReleaseInterval -= 0.05;
      }
    }
    this.#obstacleLogic();

    this.#render();

    if (this.#gameStarted) {
      this.#frameStartMillis = now;
      return window.requestAnimationFrame(() => this.#update());
    }
  }

  #addPathObstacle() {
    if (Math.random() > 0.3) {
      const lane1 = Math.floor(Math.random() * 3);
      this.#addObstacle(lane1);

      if (Math.random() > 0.5) {
        const lane2 = (lane1 + Math.floor(Math.random() * 2) + 1) % 3;
        this.#addObstacle(lane2);
      }
    }
  }

  #addObstacle(lane) {
    if (this.#obstaclesPool.length === 0) {
      return;
    }

    const newObstacle = this.#obstaclesPool.pop();

    this.#obstaclesInPath.push(newObstacle);
    this.#highway.add(newObstacle);

    this.#cylindricalHelper.set(
      this.#cylinderRadius + 1.4,
      -this.#highway.rotation.x + THREE.Math.degToRad(180),
      this.#highwayLanes[lane]
    );

    newObstacle.position.setFromCylindrical(this.#cylindricalHelper);
    const newObstaclePosition = newObstacle.position.clone();
    newObstacle.position.set(
      newObstaclePosition.y,
      newObstaclePosition.z,
      newObstaclePosition.x
    );
    newObstacle.rotation.x = -this.#highway.rotation.x;

    newObstacle.visible = true;
  }

  #obstacleLogic() {
    const obstaclePosition = new THREE.Vector3();
    const obstaclesToRemove = [];

    for (const obstacle of this.#obstaclesInPath) {
      obstaclePosition.setFromMatrixPosition(obstacle.matrixWorld);
      if (obstacle.visible) {
        if (obstaclePosition.z > 20) {
          obstaclesToRemove.push(obstacle);
        } else {
          if (obstaclePosition.distanceTo(this.#hero.position) < 3) {
            this.#handleGameStop();
            this.#sounds.carCollision.play();
          }
        }
      }
    }

    for (const obstacle of obstaclesToRemove) {
      const obstacleIndex = this.#obstaclesInPath.indexOf(obstacle);
      this.#obstaclesInPath.splice(obstacleIndex, 1);
      obstacle.visible = false;
      this.#obstaclesPool.push(obstacle);
    }
  }

  #render() {
    this.#renderer.render(this.#scene, this.#camera);
  }

  leftMove() {
    if (this.#currentLane > 0) {
      --this.#currentLane;
    }
  }

  rightMove() {
    if (this.#currentLane < 2) {
      ++this.#currentLane;
    }
  }

  #horn() {
    this.#sounds.carHorn.play();
  }

  #handleKeyDown(event) {
    const { keyCode } = event;
    switch (keyCode) {
      case 37: // Left arrow
        this.leftMove();
        break;
      case 39: // Right arrow
        this.rightMove();
        break;
      case 71: // G
        this.#horn();
        break;
      case 27: // Esc
        this.#handleGameStop();
        break;
    }
  }

  #handleWindowResize(event) {
    this.#sceneHeight = window.innerHeight;
    this.#sceneWidth = window.innerWidth;

    this.#renderer.setSize(this.#sceneWidth, this.#sceneHeight);
    this.#camera.aspect = this.#sceneWidth / this.#sceneHeight;
    this.#camera.updateProjectionMatrix();
  }
}
