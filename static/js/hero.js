/**
 * hero.js v2 — Smoother Three.js neural-net particle field
 */
(function () {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const W = () => canvas.parentElement?.offsetWidth || window.innerWidth;
  const H = () => canvas.parentElement?.offsetHeight || window.innerHeight;
  renderer.setSize(W(), H());

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, W() / H(), 0.1, 1000);
  camera.position.z = 90;

  // ── Particles ──
  const COUNT = 200;
  const positions = new Float32Array(COUNT * 3);
  const velocities = [];

  for (let i = 0; i < COUNT; i++) {
    positions[i * 3]     = (Math.random() - 0.5) * 180;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 110;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 70;
    velocities.push({
      x: (Math.random() - 0.5) * 0.05,
      y: (Math.random() - 0.5) * 0.05,
      z: (Math.random() - 0.5) * 0.02,
    });
  }

  const pGeom = new THREE.BufferGeometry();
  pGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const pMat = new THREE.PointsMaterial({
    size: 1.4, color: 0x00d4ff, transparent: true, opacity: 0.65, sizeAttenuation: true,
  });

  scene.add(new THREE.Points(pGeom, pMat));

  // ── Pre-allocate line geometry pool ──
  const MAX_LINES = 300;
  const linePositions = new Float32Array(MAX_LINES * 6);
  const lineGeom = new THREE.BufferGeometry();
  lineGeom.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
  lineGeom.setDrawRange(0, 0);

  const lineMat = new THREE.LineSegments(
    lineGeom,
    new THREE.LineBasicMaterial({ color: 0x7c3aed, transparent: true, opacity: 0.18, vertexColors: false })
  );
  scene.add(lineMat);

  // ── Floating Orbs ──
  const orbs = [
    { color: 0x7c3aed, x: -40, size: 3.5 },
    { color: 0x00d4ff, x: 0,   size: 2.5 },
    { color: 0x06b6d4, x: 40,  size: 3.0 },
  ].map(({ color, x, size }, i) => {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(size, 24, 24),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.1 })
    );
    mesh.position.set(x, Math.sin(i) * 8, -25 - i * 5);
    scene.add(mesh);
    return { mesh, baseY: mesh.position.y, speed: 0.25 + i * 0.15, phase: i * 2.1 };
  });

  // ── Grid plane ──
  const gridHelper = new THREE.GridHelper(200, 30, 0x7c3aed, 0x7c3aed);
  gridHelper.material.transparent = true;
  gridHelper.material.opacity = 0.04;
  gridHelper.position.y = -40;
  scene.add(gridHelper);

  // ── Mouse ──
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener('mousemove', e => {
    mouse.tx = (e.clientX / window.innerWidth  - 0.5) * 22;
    mouse.ty = -(e.clientY / window.innerHeight - 0.5) * 14;
  }, { passive: true });

  // ── Animation ──
  let frame = 0;
  function animate() {
    requestAnimationFrame(animate);
    frame++;

    // Smooth mouse lerp
    mouse.x += (mouse.tx - mouse.x) * 0.05;
    mouse.y += (mouse.ty - mouse.y) * 0.05;
    camera.position.x += (mouse.x - camera.position.x) * 0.04;
    camera.position.y += (mouse.y - camera.position.y) * 0.04;
    camera.lookAt(scene.position);

    // Update particle positions
    const pos = pGeom.attributes.position.array;
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3]     += velocities[i].x;
      pos[i * 3 + 1] += velocities[i].y;
      pos[i * 3 + 2] += velocities[i].z;
      if (Math.abs(pos[i * 3])     > 90)  velocities[i].x *= -1;
      if (Math.abs(pos[i * 3 + 1]) > 55)  velocities[i].y *= -1;
      if (Math.abs(pos[i * 3 + 2]) > 35)  velocities[i].z *= -1;
    }
    pGeom.attributes.position.needsUpdate = true;

    // Update lines every 6 frames
    if (frame % 6 === 0) {
      const MAX_DIST = 30;
      let lineCount = 0;
      for (let i = 0; i < COUNT && lineCount < MAX_LINES; i++) {
        for (let j = i + 1; j < COUNT && lineCount < MAX_LINES; j++) {
          const dx = pos[i*3]-pos[j*3], dy = pos[i*3+1]-pos[j*3+1], dz = pos[i*3+2]-pos[j*3+2];
          if (dx*dx+dy*dy+dz*dz < MAX_DIST*MAX_DIST) {
            const base = lineCount * 6;
            linePositions[base]   = pos[i*3];   linePositions[base+1] = pos[i*3+1]; linePositions[base+2] = pos[i*3+2];
            linePositions[base+3] = pos[j*3];   linePositions[base+4] = pos[j*3+1]; linePositions[base+5] = pos[j*3+2];
            lineCount++;
          }
        }
      }
      lineGeom.attributes.position.needsUpdate = true;
      lineGeom.setDrawRange(0, lineCount * 2);
    }

    // Orbs float
    orbs.forEach(o => {
      o.mesh.position.y = o.baseY + Math.sin(frame * 0.008 * o.speed + o.phase) * 7;
      o.mesh.rotation.y += 0.004;
      o.mesh.rotation.x += 0.002;
    });

    // Grid drift
    gridHelper.rotation.y = frame * 0.001;

    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener('resize', () => {
    const w = W(), h = H();
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });
})();
