
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const app = document.getElementById('app');
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 0.2, 3.25);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
app.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.enablePan = false;
controls.minDistance = 1.65;
controls.maxDistance = 6.5;
controls.rotateSpeed = 0.55;
controls.zoomSpeed = 0.75;

// Lighting
scene.add(new THREE.AmbientLight(0x9bb8d5, 0.8));

const sun = new THREE.DirectionalLight(0xffffff, 3.2);
sun.position.set(4, 2.8, 4);
scene.add(sun);

const rim = new THREE.DirectionalLight(0x4ea3ff, 1.25);
rim.position.set(-4, 1.2, -3);
scene.add(rim);

// Globe group
const globe = new THREE.Group();
scene.add(globe);

const loader = new THREE.TextureLoader();
const worldTexture = loader.load('./assets/shipping-lanes-world.jpg');
worldTexture.colorSpace = THREE.SRGBColorSpace;
worldTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

// Planet
const earthGeometry = new THREE.SphereGeometry(1, 128, 128);
const earthMaterial = new THREE.MeshStandardMaterial({
  map: worldTexture,
  roughness: 0.84,
  metalness: 0.0
});
const earth = new THREE.Mesh(earthGeometry, earthMaterial);
earth.rotation.y = -Math.PI * 0.5;
globe.add(earth);

// Atmospheric glow
const atmosphere = new THREE.Mesh(
  new THREE.SphereGeometry(1.022, 128, 128),
  new THREE.ShaderMaterial({
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      glowColor: { value: new THREE.Color(0x4aa9ff) }
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vWorldPosition;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform vec3 glowColor;
      varying vec3 vNormal;
      varying vec3 vWorldPosition;
      void main() {
        vec3 viewDir = normalize(cameraPosition - vWorldPosition);
        float rim = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 3.0);
        gl_FragColor = vec4(glowColor, rim * 0.58);
      }
    `
  })
);
globe.add(atmosphere);

// Procedural cloud layer (no external cloud texture needed)
const cloudMaterial = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  uniforms: {
    time: { value: 0 },
    opacity: { value: 0.55 }
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vNormal;
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    varying vec3 vNormal;
    uniform float time;
    uniform float opacity;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }
    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f*f*(3.0-2.0*f);
      return mix(mix(hash(i), hash(i+vec2(1.,0.)), f.x),
                 mix(hash(i+vec2(0.,1.)), hash(i+vec2(1.,1.)), f.x), f.y);
    }
    float fbm(vec2 p) {
      float v = 0.0;
      float a = 0.5;
      for (int i=0; i<5; i++) {
        v += a * noise(p);
        p *= 2.03;
        a *= 0.5;
      }
      return v;
    }

    void main() {
      vec2 uv = vUv;
      uv.x += time * 0.006;
      float n = fbm(uv * vec2(8.0, 4.3));
      n = smoothstep(0.54, 0.72, n);
      float bands = 0.72 + 0.28 * sin((uv.y * 22.0) + fbm(uv*6.0)*4.0);
      float a = n * bands * opacity;
      vec3 c = vec3(0.95, 0.97, 1.0);
      gl_FragColor = vec4(c, a);
    }
  `
});

const clouds = new THREE.Mesh(
  new THREE.SphereGeometry(1.012, 128, 128),
  cloudMaterial
);
clouds.rotation.y = earth.rotation.y;
globe.add(clouds);

// Latitude/longitude grid
const grid = new THREE.Group();
const gridMat = new THREE.LineBasicMaterial({
  color: 0xffffff,
  transparent: true,
  opacity: 0.17
});

function latLine(latDeg) {
  const lat = THREE.MathUtils.degToRad(latDeg);
  const r = Math.cos(lat) * 1.006;
  const y = Math.sin(lat) * 1.006;
  const pts = [];
  for (let i = 0; i <= 180; i++) {
    const a = (i / 180) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
  }
  return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gridMat);
}

function lonLine(lonDeg) {
  const lon = THREE.MathUtils.degToRad(lonDeg);
  const pts = [];
  for (let i = 0; i <= 180; i++) {
    const lat = -Math.PI/2 + (i/180) * Math.PI;
    const cl = Math.cos(lat);
    pts.push(new THREE.Vector3(
      cl * Math.cos(lon) * 1.006,
      Math.sin(lat) * 1.006,
      cl * Math.sin(lon) * 1.006
    ));
  }
  return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gridMat);
}

[-60,-30,0,30,60].forEach(v => grid.add(latLine(v)));
for (let v = 0; v < 360; v += 30) grid.add(lonLine(v));
grid.rotation.y = earth.rotation.y;
globe.add(grid);

// Starfield
const starCount = 2400;
const starPositions = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
  const r = 18 + Math.random() * 25;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  starPositions[i*3]     = r * Math.sin(phi) * Math.cos(theta);
  starPositions[i*3 + 1] = r * Math.cos(phi);
  starPositions[i*3 + 2] = r * Math.sin(phi) * Math.sin(theta);
}
const starGeo = new THREE.BufferGeometry();
starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
const stars = new THREE.Points(
  starGeo,
  new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.035,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.85
  })
);
scene.add(stars);

// Initial tilt
globe.rotation.x = THREE.MathUtils.degToRad(-4);

document.getElementById('resetBtn').addEventListener('click', () => {
  camera.position.set(0, 0.2, 3.25);
  controls.target.set(0, 0, 0);
  globe.rotation.set(THREE.MathUtils.degToRad(-4), 0, 0);
  controls.update();
});

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();
  cloudMaterial.uniforms.time.value = t;
  clouds.rotation.y += 0.00018;
  controls.update();
  renderer.render(scene, camera);
}
animate();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
