import * as THREE from 'https://unpkg.com/three@0.128.0/build/three.module.js';

const canvas = document.getElementById('splash-canvas');

const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
camera.position.set(0, 0, 8);

function resize(){
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);

const WHITE = 0xffffff;

// ---- Central emblem: nested wireframe polyhedra, slowly rotating ----
const centerGroup = new THREE.Group();
scene.add(centerGroup);

const outerGeo = new THREE.IcosahedronGeometry(2.1, 0);
const outerEdges = new THREE.EdgesGeometry(outerGeo);
const outerMat = new THREE.LineBasicMaterial({ color: WHITE, transparent: true, opacity: 0.85 });
const outerMesh = new THREE.LineSegments(outerEdges, outerMat);
centerGroup.add(outerMesh);

const midGeo = new THREE.OctahedronGeometry(1.35, 0);
const midEdges = new THREE.EdgesGeometry(midGeo);
const midMat = new THREE.LineBasicMaterial({ color: WHITE, transparent: true, opacity: 0.55 });
const midMesh = new THREE.LineSegments(midEdges, midMat);
centerGroup.add(midMesh);

const innerGeo = new THREE.TetrahedronGeometry(0.75, 0);
const innerEdges = new THREE.EdgesGeometry(innerGeo);
const innerMat = new THREE.LineBasicMaterial({ color: WHITE, transparent: true, opacity: 0.4 });
const innerMesh = new THREE.LineSegments(innerEdges, innerMat);
centerGroup.add(innerMesh);

// Thin outer rings, like a compass or seal
const ring1Geo = new THREE.TorusGeometry(2.7, 0.008, 8, 96);
const ring1Mat = new THREE.MeshBasicMaterial({ color: WHITE, transparent: true, opacity: 0.3 });
const ring1 = new THREE.Mesh(ring1Geo, ring1Mat);
ring1.rotation.x = Math.PI / 2;
scene.add(ring1);

const ring2Geo = new THREE.TorusGeometry(3.05, 0.006, 8, 96);
const ring2Mat = new THREE.MeshBasicMaterial({ color: WHITE, transparent: true, opacity: 0.18 });
const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
ring2.rotation.x = Math.PI / 2;
ring2.rotation.y = 0.3;
scene.add(ring2);

// ---- Orbiting faint shapes drifting in the background ----
const orbiters = [];
const orbiterGeoTypes = [
  () => new THREE.OctahedronGeometry(0.3, 0),
  () => new THREE.TetrahedronGeometry(0.28, 0),
];
for (let i = 0; i < 10; i++){
  const geo = orbiterGeoTypes[i % orbiterGeoTypes.length]();
  const edges = new THREE.EdgesGeometry(geo);
  const mat = new THREE.LineBasicMaterial({ color: WHITE, transparent: true, opacity: 0.12 + Math.random() * 0.15 });
  const mesh = new THREE.LineSegments(edges, mat);
  const radius = 4.2 + Math.random() * 2.5;
  const angle = Math.random() * Math.PI * 2;
  const height = (Math.random() - 0.5) * 3;
  mesh.position.set(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
  scene.add(mesh);
  orbiters.push({ mesh, angle, radius, height, speed: 0.05 + Math.random() * 0.08 });
}

resize();

const clock = new THREE.Clock();

function animate(){
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();

  centerGroup.rotation.y = t * 0.18;
  centerGroup.rotation.x = Math.sin(t * 0.12) * 0.2;

  midMesh.rotation.y = -t * 0.28;
  innerMesh.rotation.x = t * 0.35;

  ring1.rotation.z = t * 0.05;
  ring2.rotation.z = -t * 0.035;

  for (const o of orbiters){
    o.angle += o.speed * 0.01;
    o.mesh.position.x = Math.cos(o.angle) * o.radius;
    o.mesh.position.z = Math.sin(o.angle) * o.radius;
    o.mesh.rotation.x += 0.004;
    o.mesh.rotation.y += 0.003;
  }

  renderer.render(scene, camera);
}
animate();
