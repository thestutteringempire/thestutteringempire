import * as THREE from 'https://unpkg.com/three@0.128.0/build/three.module.js';

const canvas = document.getElementById('emblem-canvas');

if (canvas){
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(0, 0, 11);

  function resize(){
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);

  const WHITE = 0xffffff;

  // A field of faceted wireframe shapes drifting quietly through the banner.
  const shapes = [];
  const geoTypes = [
    () => new THREE.OctahedronGeometry(1, 0),
    () => new THREE.IcosahedronGeometry(0.85, 0),
    () => new THREE.TetrahedronGeometry(0.95, 0),
  ];

  const COUNT = 14;
  for (let i = 0; i < COUNT; i++){
    const geo = geoTypes[i % geoTypes.length]();
    const edges = new THREE.EdgesGeometry(geo);
    const opacity = 0.14 + Math.random() * 0.32;
    const mat = new THREE.LineBasicMaterial({ color: WHITE, transparent: true, opacity });
    const mesh = new THREE.LineSegments(edges, mat);

    const scale = 0.35 + Math.random() * 0.85;
    mesh.scale.setScalar(scale);

    mesh.position.set(
      (Math.random() - 0.5) * 16,
      (Math.random() - 0.5) * 6.5,
      (Math.random() - 0.5) * 8
    );

    mesh.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );

    scene.add(mesh);

    shapes.push({
      mesh,
      rotSpeed: new THREE.Vector3(
        (Math.random() - 0.5) * 0.0035,
        (Math.random() - 0.5) * 0.0035,
        (Math.random() - 0.5) * 0.0035
      ),
      driftSpeed: (Math.random() - 0.5) * 0.005,
      baseY: mesh.position.y,
      bobOffset: Math.random() * Math.PI * 2,
      bobSpeed: 0.3 + Math.random() * 0.3
    });
  }

  // A faint particle haze for depth
  const particleCount = 100;
  const particleGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++){
    positions[i * 3] = (Math.random() - 0.5) * 20;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 8;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 10 - 3;
  }
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const particleMat = new THREE.PointsMaterial({ color: WHITE, size: 0.028, transparent: true, opacity: 0.3 });
  const particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);

  resize();

  const clock = new THREE.Clock();
  let rafId = null;
  let stopped = false;

  function animate(){
    if (stopped) return;
    rafId = requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    for (const s of shapes){
      s.mesh.rotation.x += s.rotSpeed.x;
      s.mesh.rotation.y += s.rotSpeed.y;
      s.mesh.rotation.z += s.rotSpeed.z;

      s.mesh.position.x += s.driftSpeed;
      s.mesh.position.y = s.baseY + Math.sin(t * s.bobSpeed + s.bobOffset) * 0.28;

      if (s.mesh.position.x > 9) s.mesh.position.x = -9;
      if (s.mesh.position.x < -9) s.mesh.position.x = 9;
    }

    particles.rotation.y += 0.0003;

    renderer.render(scene, camera);
  }
  animate();

  // On navigation away (including a rapid nav-bar click), stop rendering
  // and release the WebGL context immediately rather than letting a
  // half-torn-down render loop keep running into the next page load.
  function teardown(){
    if (stopped) return;
    stopped = true;
    if (rafId !== null) cancelAnimationFrame(rafId);
    window.removeEventListener('resize', resize);
    renderer.dispose();
  }

  window.addEventListener('pagehide', teardown);
  window.addEventListener('beforeunload', teardown);
}
