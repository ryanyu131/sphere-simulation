import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

console.clear();

let scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
let camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 1, 1000);
camera.position.set(15, 70, 30);
let renderer = new THREE.WebGLRenderer();
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);
//create black background scene, perspective camera, and WebGL renderer

window.addEventListener("resize", (event) => {
  camera.aspect = innerWidth / innerHeight;
  renderer.setSize(innerWidth, innerHeight);
  camera.updateProjectionMatrix();
}); //dynamically maintains aspect ratio when window is resized

let controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = true;
//enables a smooth interactive camera

let gu = {
  time: { value: 0 },
};

let sizes = [];
let shift = [];
let pushShift = () => {
  shift.push(
    Math.random() * Math.PI,
    Math.random() * Math.PI * 2,
    (Math.random() * 1 + 0.1) * Math.PI * 0.1,
    Math.random() * 1 + 0.1
  );
};

let pts = new Array(50000).fill().map((p) => {
  sizes.push(Math.random() * 2 + 0.5);
  pushShift();
  return new THREE.Vector3()
  .randomDirection()
  .multiplyScalar(Math.random() * 0.5 + 25);
}); //creates a large number of points with random positions to be stored in an array

let g = new THREE.BufferGeometry().setFromPoints(pts);
g.setAttribute("sizes", new THREE.Float32BufferAttribute(sizes, 1));
g.setAttribute("shift", new THREE.Float32BufferAttribute(shift, 4)); //setting buffers and attributes
let m = new THREE.PointsMaterial({
  size: 0.25,
  transparent: true,
  depthTest: false,
  blending: THREE.AdditiveBlending,
  onBeforeCompile: (shader) => { //all shader properties
    shader.uniforms.time = gu.time;
    shader.vertexShader = `
      uniform float time;
      attribute float sizes;
      attribute vec4 shift;
      varying vec3 vColor;
      ${shader.vertexShader}
      `
      .replace(`gl_PointSize = size;`, `gl_PointSize = size * sizes;`)
      .replace(
        `#include <color_vertex>`,
        `#include <color_vertex>
        float d = length(abs(position) / vec3(40., 100., 40));
        d = clamp(d, 0., 1.);
        vColor = mix(vec3(227., 50., 0.), vec3(0., 50., 255.), d) / 255.;
        `
      )
      .replace(
        `#include <begin_vertex>`,
        `#include <begin_vertex>
        float t = time;
        float moveT = mod(shift.x + shift.z * t, PI2);
        float moveS = mod(shift.y + shift.z * t, PI2);
        transformed += vec3(cos(moveS) * sin(moveT), cos(moveT), sin(moveS) * sin(moveT)) * shift.w;
        `
      );
    console.log(shader.vertexShader);
    shader.fragmentShader = `
    varying vec3 vColor;
    ${shader.fragmentShader}
    `
      .replace(
        `#include <clipping_planes_fragment>`,
        `#include <clipping_planes_fragment>
        float d = length(gl_PointCoord.xy - 0.5);
        //if (d > 0.5) discard;
        `
      )
      .replace(
        `vec4 diffuseColor = vec4( diffuse, opacity );`,
        `vec4 diffuseColor = vec4( vColor, smoothstep(0.5, 0.1, d));`
      );
  },
});

let p = new THREE.Points(g, m);
let clock = new THREE.Clock();

scene.add(p);

renderer.setAnimationLoop(() => {
  controls.update();
  let t = clock.getElapsedTime() * 0.5;
  gu.time.value = t * Math.PI;
  p.rotation.y = t * 0.05;
  renderer.render(scene, camera); //loop: update camera/time properties and renders the scene each frame
});