const {
  WebGLRenderer, Scene, PerspectiveCamera, Mesh, Color,
  Vector3, SplineCurve, Path, Object3D, MeshBasicMaterial, ShapeGeometry,
  FontLoader } =
THREE;

const getRandomFloat = (min, max) => Math.random() * (max - min) + min;
const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/* --------------------------- */
/* ----------- CORE ---------- */
let windowWidth = window.innerWidth;
let windowHeight = window.innerHeight;
class Webgl {
  constructor(w, h) {
    this.meshCount = 0;
    this.meshListeners = [];
    this.renderer = new WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.scene = new Scene();
    this.camera = new PerspectiveCamera(50, w / h, 1, 1000);
    this.camera.position.set(0, 0, 10);
    this.dom = this.renderer.domElement;
    this.update = this.update.bind(this);
    this.resize = this.resize.bind(this);
    this.resize(w, h); // set render size
  }
  add(mesh) {
    this.scene.add(mesh);
    if (!mesh.update) return;
    this.meshListeners.push(mesh.update);
    this.meshCount++;
  }
  remove(mesh) {
    const idx = this.meshListeners.indexOf(mesh.update);
    if (idx < 0) return;
    this.scene.remove(mesh);
    this.meshListeners.splice(idx, 1);
    this.meshCount--;

  }
  update() {
    let i = this.meshCount;
    while (--i >= 0) {
      this.meshListeners[i].apply(this, null);
    }
    this.renderer.render(this.scene, this.camera);
  }
  resize(w, h) {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }}

const webgl = new Webgl(windowWidth, windowHeight);
document.body.appendChild(webgl.dom);
/* --------- CORE END -------- */
/* --------------------------- */

/* --------------------------- */
/* ------ CREATING ZONE ------ */
const COLORS = [
'#4062BB',
'#52489C',
'#59C3C3',
'#F45B69'];


class WindLine extends Mesh {
  constructor({
    nbrOfPoints = getRandomFloat(3, 5),
    length = getRandomFloat(5, 8),
    disruptedOrientation = getRandomFloat(-0.2, 0.2),
    speed = 0.003,
    color = new Color('#000000') } =
  {}) {

    // Create the points of the line
    const points = [];
    const segmentLength = length / nbrOfPoints;
    points.push(new Vector3(0, 0, 0));
    for (let i = 0; i < nbrOfPoints; i++) {
      const pos = segmentLength * i;
      points.push(new Vector3(
      pos - getRandomFloat(-2.1, 2.1),
      pos + segmentLength * i,
      0));

    }

    // Intance the geometry
    const curve = new SplineCurve(points);
    const path = new Path(curve.getPoints(50));
    const geometry = path.createPointsGeometry(50);

    const line = new MeshLine();
    line.setGeometry(geometry);

    // Material
    const dashArray = 2;
    const dashRatio = 0.99;
    const dashOffsetRight = 1.01;
    const dashOffsetLeft = dashArray * dashRatio;
    super(line.geometry, new MeshLineMaterial({
      lineWidth: 0.05,
      dashArray,
      dashRatio,
      dashOffset: dashOffsetLeft,
      opacity: 0,
      transparent: true,
      depthWrite: false,
      color }));


    this.position.set(
    getRandomFloat(-10, 10),
    getRandomFloat(-6, 5),
    getRandomFloat(-2, 10));


    this.speed = speed;
    this.dying = dashOffsetRight;
    this.update = this.update.bind(this);
  }

  update() {
    this.material.uniforms.dashOffset.value -= this.speed;

    const opacityTargeted = this.material.uniforms.dashOffset.value > this.dying + 0.25 ? 1 : 0;
    this.material.uniforms.opacity.value += (opacityTargeted - this.material.uniforms.opacity.value) * 0.08;
  }

  isDied() {
    return this.material.uniforms.dashOffset.value < this.dying;
  }}

class Wind extends Object3D {
  constructor() {
    super();

    this.lines = [];
    this.lineNbr = -1;

    this.update = this.update.bind(this);
  }

  addWindLine() {
    const line = new WindLine({ color: new Color(COLORS[getRandomInt(0, COLORS.length - 1)]) });
    this.lines.push(line);
    this.add(line);
    this.lineNbr++;
  }

  removeWindLine() {
    this.remove(this.lines[0]);
    this.lines[0] = null;
    this.lines.shift();
    this.lineNbr--;
  }

  update() {
    if (Math.random() < 0.65) {
      this.addWindLine();
    }

    let i;
    for (i = this.lineNbr; i >= 0; i--) {
      this.lines[i].update();

      if (this.lines[i].isDied()) {
        this.removeWindLine();
      }
    }
  }}

class AnimatedText extends Object3D {
  constructor(text, font, { size = 0.3, letterSpacing = 0.03, color = '#000000' } = {}) {
    super();

    this.basePosition = 0;
    this.size = size;

    const letters = Array.from(text);
    letters.forEach(letter => {
      if (letter === ' ') {
        this.basePosition += size * 0.5;
      } else {
        const shape = font.generateShapes(letter, size, 1);
        const geom = new ShapeGeometry(shape);
        geom.mergeVertices();
        geom.computeBoundingBox();
        const mat = new MeshBasicMaterial({
          color,
          opacity: 0,
          transparent: true });

        const mesh = new Mesh(geom, mat);
        mesh.position.x = this.basePosition;
        this.basePosition += geom.boundingBox.max.x + letterSpacing;
        this.add(mesh);
      }
    });
  }
  show(duration = 0.6) {
    const tm = new TimelineLite();
    tm.set({}, {}, `+=${duration * 1.1}`);
    this.children.forEach(letter => {
      const data = {
        opacity: 0,
        position: -0.5 };

      tm.to(data, duration, { opacity: 1, position: 0, ease: Back.easeOut.config(2), onUpdate: () => {
          letter.material.opacity = data.opacity;
          letter.position.y = data.position;
          letter.position.z = data.position * 2;
          letter.rotation.x = data.position * 2;
        } }, `-=${duration - 0.03}`);
    });
  }}


// START
// load font
// https://gero3.github.io/facetype.js/
const fontLoader = new FontLoader();
const fontAsset = fontLoader.parse(fontFile);

setTimeout(() => {
  const text = new AnimatedText('Animated Dashed Lines', fontAsset);
  text.position.x -= text.basePosition * 0.5;
  text.position.y -= 0.5;
  webgl.add(text);
  text.show();
}, 1000);

const windLines = new Wind();
webgl.add(windLines);

// animate lines

/* ---- CREATING ZONE END ---- */
/* --------------------------- */

/* --------------------------- */
/* ------- CORE FOOTER ------- */
class CameraMouseControl {
  constructor(camera) {
    this.camera = camera;
    this.lookAt = new Vector3();
    this.position = { x: 0, y: 0 };
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.update = this.update.bind(this);
    document.body.addEventListener('mousemove', this.handleMouseMove);
  }
  handleMouseMove(event) {
    this.position.x = -(event.clientX / window.innerWidth - 0.5) * 8;
    this.position.y = (event.clientY / window.innerHeight - 0.5) * 4;
  }
  update() {
    this.camera.position.x += (this.position.x - this.camera.position.x) * 0.05;
    this.camera.position.y += (this.position.y - this.camera.position.y) * 0.05;
    this.camera.lookAt(this.lookAt);
  }}

const cameraControl = new CameraMouseControl(webgl.camera);
function _onResize() {
  windowWidth = window.innerWidth;
  windowHeight = window.innerHeight;
  webgl.resize(windowWidth, windowHeight);
}
window.addEventListener('resize', _onResize);
window.addEventListener('orientationchange', _onResize);
/* ---- LOOP ---- */
function _loop() {
  webgl.update();
  cameraControl.update();
  requestAnimationFrame(_loop);
}
_loop();
/* ----- CORE FOOTER END ----- */
/* --------------------------- */