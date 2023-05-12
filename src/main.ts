import * as THREE from "three";
import { ACESFilmicToneMapping, AxesHelper, EquirectangularReflectionMapping, PerspectiveCamera, Scene, WebGLRenderer } from "three";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';

let camera: PerspectiveCamera;
let scene: Scene;
let renderer: WebGLRenderer;
let boxes: THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial>[] = [];
let raycaster: THREE.Raycaster;
let box3: THREE.Box3[] = [];
let analyser: AnalyserNode;
let dataArray: Uint8Array;
let audio = document.getElementById("audio") as HTMLAudioElement;

init();
play("files/battements_de_coeur.mp3");
animate();

function play(e: string) {
  console.log(e);
  audio.src = e; // URL.createObjectURL(e);
  audio.load();
  audio.play();

  var context = new AudioContext();
  var src = context.createMediaElementSource(audio);
  analyser = context.createAnalyser();
  src.connect(analyser);
  analyser.connect(context.destination);
  analyser.fftSize = 512;
  var bufferLength = analyser.frequencyBinCount;
  dataArray = new Uint8Array(bufferLength);
}

function init() {
  const container = document.querySelector("#app") as HTMLElement;
  document.body.appendChild(container);

  camera = new PerspectiveCamera(73, window.innerWidth / window.innerHeight, 0.25, 1000);

  camera.position.set(10, 0, 0);

  scene = new Scene();
  // DEBUG
  // scene.add(new AxesHelper(5))


  new RGBELoader()
    .setPath('/assets/textures/')
    .load('venice_sunset_1k.hdr', (texture) => {

      // Pour afficher la pieuvre
      // let loader = new GLTFLoader().setPath('/assets/models/')
      // loader.load("pieuvre_anim.gltf", (gltf) => {
      //   gltf.scene.position.set(0,0,0)
      //   gltf.scene.scale.set(.1,.1,.1)
      //   scene.add(gltf.scene)
      // })

      texture.mapping = EquirectangularReflectionMapping;

      scene.background = texture;
      scene.environment = texture;

      raycaster = new THREE.Raycaster();

      var factor = 2;
      for (let l = 0; l < 3; l++) {
        let cube = addCube(
          Math.random() * factor,
          Math.random() * factor,
          Math.random() * factor
        )
        boxes.push(cube);
      }

      interaction();
    });

  // renderer
  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.addEventListener('change', render); // use if there is no animation loop
  controls.minDistance = 2;
  controls.maxDistance = 10;
  controls.target.set(0, 0, - 0.2);
  controls.update();

  window.addEventListener("click", setPickPosition);
  window.addEventListener('resize', onWindowResize);

}

function randomIntFromInterval(min, max, decimalPlaces) { // min and max included
  return (Math.random() * (max - min) + min).toFixed(decimalPlaces) * 1;
}

function avg(arr: any[]) {
  var total = arr.reduce(function (sum, b) { return sum + b; });
  return (total / arr.length);
}

function max(arr: any[]) {
  return arr.reduce(function (a, b) { return Math.max(a, b); })
}    

function interaction(){
  for(let i = 0; i < 20; i++) {
    let cube = addCube(randomIntFromInterval(-0.1, 0.1, 1), randomIntFromInterval(-0.1, 0.1, 1), randomIntFromInterval(-0.1, 0.1, 1));
    box3.push(new THREE.Box3().setFromObject(cube));
    boxes.push(cube);
}

}

function animate() {
  requestAnimationFrame(animate);
  const quaternion = new THREE.Quaternion();
  quaternion.setFromAxisAngle(new THREE.Vector3(2/100, 10/100, 3/100), Math.PI/90);
  analyser.getByteFrequencyData(dataArray); // calcul la fft
  var lowerHalfArray = dataArray.slice(0, (dataArray.length / 2) - 1);
  var upperHalfArray = dataArray.slice((dataArray.length / 2) - 1, dataArray.length - 1);

  for(var i = 0; i < box3.length; i++){
    for(var j = 0; j < box3.length ; j++){
      if((box3[i]!= box3[j]) && (box3[i].intersectsBox(box3[j]))){
        boxes[i].applyQuaternion(quaternion);
        boxes[i].scale.lerp(new THREE.Vector3(avg(lowerHalfArray), avg(lowerHalfArray), avg(lowerHalfArray)), 1);
        // boxes[i].position.x += avg([lowerHalfArray]);
        // boxes[i].position.y += avg([lowerHalfArray]);
        // boxes[i].position.z += avg([lowerHalfArray]);
        // box3[i].setFromObject(boxes[i])
        // boxes[i].position.x += randomIntFromInterval(-0.03, 0.03, 3)
        // boxes[i].position.y += randomIntFromInterval(-0.03, 0.03, 3)
        // boxes[i].position.z += randomIntFromInterval(-0.03, 0.03, 3)
        // box3[i].setFromObject(boxes[i])
      }
    }
  }

  renderer.render(scene, camera);
}

function addCube(px: number, py: number, pz: number) {
  var colorandom = new THREE.Color(0xffffff);
  colorandom.setHex(Math.random() * 0xffffff);
  var geometry = new THREE.BoxGeometry(0.3, 0.3, 0.3); //x,y,z
  var boxMaterial = new THREE.MeshBasicMaterial({ color: colorandom });
  var cube = new THREE.Mesh(geometry, boxMaterial);

  cube.position.set(px, py, pz);
  cube.geometry.computeBoundingBox(); // null sinon
  scene.add(cube);
  return cube;
}

function setPickPosition(event: { clientX: number; clientY: number; }) {
  const pos = { x: 0, y: 0 };
  pos.x = (event.clientX / window.innerWidth) * 2 - 1;
  pos.y = -(event.clientY / window.innerHeight) * 2 + 1;

  // cast a ray through the frustum
  raycaster.setFromCamera(pos, camera);
}

function onWindowResize() {

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

  render();

}

function render() {
  renderer.render(scene, camera);
}
