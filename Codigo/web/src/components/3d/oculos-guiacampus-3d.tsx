'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export type GlassesPart = 'sensor' | 'motor' | 'esp' | 'imu' | null;

export const GLASSES_PARTS_ORDER: Exclude<GlassesPart, null>[] = ['sensor', 'motor', 'esp', 'imu'];

export const GLASSES_PARTS_INFO: Record<
  Exclude<GlassesPart, null> | 'overview',
  { code: string; name: string; short: string; title: string; description: string }
> = {
  sensor: {
    code: 'Sensor ToF',
    name: 'VL53L0X',
    short: 'Medição frontal a laser',
    title: 'Sensor de distância VL53L0X',
    description:
      'Mede por tempo de voo a distância até obstáculos frontais na altura da cabeça e dispara o alerta quando o objeto entra no limiar de 50 cm (I2C 0x29).',
  },
  motor: {
    code: 'Atuador háptico',
    name: 'Coin Motor 1027',
    short: 'Alerta tátil na haste',
    title: 'Motor de vibração Coin 1027',
    description:
      'Microatuador háptico preso à haste via transistor no GPIO 3. Aciona localmente com PWM 160/255 sempre que a distância válida for menor ou igual a 50 cm.',
  },
  esp: {
    code: 'Microcontrolador',
    name: 'ESP32-C3 Mini',
    short: 'Lógica local e rádio BLE',
    title: 'ESP32-C3 SuperMini',
    description:
      'Microcontrolador na lateral inferior esquerda, com conector USB-C voltado para baixo. Lê os sensores via I2C, controla o motor e envia pacotes BLE de 20 bytes.',
  },
  imu: {
    code: 'Sensor inercial',
    name: 'MPU6500 (6 eixos)',
    short: 'Inclinação pitch e roll',
    title: 'Unidade inercial MPU6500',
    description:
      'Acelerômetro e giroscópio montados sobre o ESP32-C3 (I2C 0x68). Fornece aceleração, giroscópio e inclinação 2D (pitch e roll) no pacote BLE.',
  },
  overview: {
    code: 'Protótipo',
    name: 'Visão geral',
    short: 'Modelo completo',
    title: 'Visão geral dos óculos GuiaCampus-01',
    description:
      'Arraste para girar, aproxime com o scroll ou pinça, toque em uma peça no 3D ou mova o controle para simular um obstáculo.',
  },
};

type CameraPose = { th: number; ph: number; r: number; tx: number; ty: number; tz: number };

const HOME_BASE: CameraPose = { th: 0.55, ph: 1.28, r: 27, tx: 0, ty: 0, tz: 0 };

const PART_VIEWS: Record<Exclude<GlassesPart, null>, CameraPose> = {
  sensor: { th: 0.14, ph: 1.32, r: 10.5, tx: 0, ty: 1.85, tz: 6.3 },
  motor: { th: -1.42, ph: 1.38, r: 9.5, tx: -7.25, ty: 1.55, tz: -5.0 },
  esp: { th: -1.52, ph: 1.56, r: 10.8, tx: -7.4, ty: -0.45, tz: -0.4 },
  imu: { th: -1.44, ph: 1.38, r: 10.5, tx: -7.4, ty: 0.78, tz: -0.4 },
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function OculosGuiaCampus3D({
  selectedPart,
  onSelectPart,
}: {
  selectedPart: GlassesPart;
  onSelectPart: (part: GlassesPart) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const selectedPartRef = useRef<GlassesPart>(selectedPart);
  const onSelectPartRef = useRef(onSelectPart);
  const [distance, setDistance] = useState(45);
  const distanceRef = useRef(distance);
  const [webglError, setWebglError] = useState<string | null>(null);

  const sceneHooksRef = useRef<{
    focusPart: (part: GlassesPart) => void;
    updateObstacle: (cm: number) => void;
  } | null>(null);

  useEffect(() => {
    selectedPartRef.current = selectedPart;
    sceneHooksRef.current?.focusPart(selectedPart);
  }, [selectedPart]);

  useEffect(() => {
    onSelectPartRef.current = onSelectPart;
  }, [onSelectPart]);

  useEffect(() => {
    distanceRef.current = distance;
    sceneHooksRef.current?.updateObstacle(distance);
  }, [distance]);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
    } catch {
      setWebglError('Seu navegador não conseguiu iniciar o WebGL para exibir o modelo 3D.');
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(35, 1, 0.1, 300);
    scene.add(new THREE.HemisphereLight(0xf6fbff, 0x5c738f, 1.05));

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.15);
    keyLight.position.set(8, 12, 16);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xdceeff, 0.55);
    fillLight.position.set(-12, 6, 8);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xc4dcff, 0.7);
    rimLight.position.set(-8, 5, -14);
    scene.add(rimLight);

    const doubleSide = THREE.DoubleSide;
    const std = (color: number, roughness: number, metalness = 0, extra?: THREE.MeshStandardMaterialParameters) =>
      new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });

    const materials = {
      lens: new THREE.MeshPhysicalMaterial({
        color: 0xe8f3ff,
        transparent: true,
        opacity: 0.24,
        roughness: 0.06,
        metalness: 0.05,
        side: doubleSide,
        depthWrite: false,
      }),
      rim: new THREE.MeshStandardMaterial({
        color: 0xf4f9ff,
        transparent: true,
        opacity: 0.78,
        roughness: 0.2,
        depthWrite: false,
      }),
      frame: std(0x161920, 0.34, 0.14),
      frameSoft: std(0x232833, 0.42, 0.12),
      smoke: std(0x242832, 0.28, 0.08, { transparent: true, opacity: 0.84, side: doubleSide }),
      vent: std(0x11141a, 0.55, 0.05),
      pod: std(0x1b1f28, 0.38, 0.12),
      bezel: std(0x10131a, 0.48, 0.15),
      metal: std(0xb4bbc4, 0.28, 0.85),
      metal2: std(0x636b76, 0.36, 0.72),
      board: std(0x1d438a, 0.42, 0.08),
      pcbk: std(0x141923, 0.44, 0.08),
      imu: std(0x1d4ed8, 0.4, 0.08),
      gold: std(0xdcb23c, 0.26, 0.85),
      ic: std(0x0f1218, 0.32, 0.22),
      usb: std(0xd0d6de, 0.22, 0.9),
      chip: std(0xc8ced6, 0.26, 0.58, { emissive: 0xf2b705, emissiveIntensity: 0 }),
    };

    const g = new THREE.Group();
    g.position.z = 5;
    scene.add(g);

    const picks: THREE.Mesh[] = [];
    const partsMap: Record<Exclude<GlassesPart, null>, THREE.Mesh[]> = {
      sensor: [],
      motor: [],
      esp: [],
      imu: [],
    };

    const tag = (meshObj: THREE.Mesh, part: Exclude<GlassesPart, null>) => {
      meshObj.material = (meshObj.material as THREE.MeshStandardMaterial).clone();
      meshObj.userData.part = part;
      picks.push(meshObj);
      partsMap[part].push(meshObj);
      return meshObj;
    };

    const addMesh = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      g.add(m);
      return m;
    };

    const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
    const roundedRectShape = (w: number, h: number, r: number) => {
      const hw = w / 2;
      const hh = h / 2;
      const rad = Math.min(r, hw, hh);
      const s = new THREE.Shape();
      s.moveTo(-hw + rad, -hh);
      s.lineTo(hw - rad, -hh);
      s.quadraticCurveTo(hw, -hh, hw, -hh + rad);
      s.lineTo(hw, hh - rad);
      s.quadraticCurveTo(hw, hh, hw - rad, hh);
      s.lineTo(-hw + rad, hh);
      s.quadraticCurveTo(-hw, hh, -hw, hh - rad);
      s.lineTo(-hw, -hh + rad);
      s.quadraticCurveTo(-hw, -hh, -hw + rad, -hh);
      return s;
    };

    const cz = -7;

    // 1. Curved polycarbonate visor with real open nose cutout
    const lensRadius = 8;
    const lensTop = 2.18;
    const lensBottom = -2.25;
    const noseRadius = 1.4;
    const noseAngle = Math.asin(noseRadius / lensRadius);
    const thetas: number[] = [];
    const pushRange = (start: number, end: number, steps: number, includeStart: boolean) => {
      for (let i = includeStart ? 0 : 1; i <= steps; i++) {
        thetas.push(start + ((end - start) * i) / steps);
      }
    };
    pushRange(-1.0, -noseAngle, 28, true);
    pushRange(-noseAngle, noseAngle, 32, false);
    pushRange(noseAngle, 1.0, 28, false);

    const lensPositions: number[] = [];
    const lensNormals: number[] = [];
    const lensIndices: number[] = [];
    const topOutline: THREE.Vector3[] = [];
    const bottomOutline: THREE.Vector3[] = [];

    thetas.forEach((th, i) => {
      const sinT = Math.sin(th);
      const cosT = Math.cos(th);
      const x = lensRadius * sinT;
      const z = cz + lensRadius * cosT;
      const yBot =
        Math.abs(x) < noseRadius ? lensBottom + Math.sqrt(Math.max(0, noseRadius * noseRadius - x * x)) : lensBottom;

      lensPositions.push(x, lensTop, z, x, yBot, z);
      lensNormals.push(sinT, 0, cosT, sinT, 0, cosT);
      topOutline.push(new THREE.Vector3(x, lensTop, z));
      bottomOutline.push(new THREE.Vector3(x, yBot, z));

      if (i > 0) {
        const prev = (i - 1) * 2;
        const curr = i * 2;
        lensIndices.push(prev, prev + 1, curr, curr, prev + 1, curr + 1);
      }
    });

    const lensGeo = new THREE.BufferGeometry();
    lensGeo.setAttribute('position', new THREE.Float32BufferAttribute(lensPositions, 3));
    lensGeo.setAttribute('normal', new THREE.Float32BufferAttribute(lensNormals, 3));
    lensGeo.setIndex(lensIndices);
    const lens = addMesh(lensGeo, materials.lens, 0, 0, 0);
    lens.renderOrder = 2;

    const outlinePts = [...topOutline, ...bottomOutline.slice().reverse()];
    const lensEdges = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(outlinePts),
      new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.78 }),
    );
    g.add(lensEdges);

    // 2. Sculpted solid curved brow frame (real thickness + bevels wrapping into corner hinges)
    const browShape = new THREE.Shape();
    const browOut = 8.26;
    const browIn = 7.72;
    const browSpan = 1.02;
    const browSegs = 48;
    for (let i = 0; i <= browSegs; i++) {
      const th = -browSpan + (2 * browSpan * i) / browSegs;
      const bx = browOut * Math.sin(th);
      const by = cz + browOut * Math.cos(th);
      if (i === 0) browShape.moveTo(bx, by);
      else browShape.lineTo(bx, by);
    }
    for (let i = browSegs; i >= 0; i--) {
      const th = -browSpan + (2 * browSpan * i) / browSegs;
      const bx = browIn * Math.sin(th);
      const by = cz + browIn * Math.cos(th);
      browShape.lineTo(bx, by);
    }
    browShape.closePath();

    const browGeo = new THREE.ExtrudeGeometry(browShape, {
      depth: 0.62,
      bevelEnabled: true,
      bevelThickness: 0.08,
      bevelSize: 0.07,
      bevelSegments: 3,
      curveSegments: 24,
    });
    const browMesh = addMesh(browGeo, materials.frame, 0, 2.46, 0);
    browMesh.rotation.x = Math.PI / 2;

    // 3. Flush curved white nose-bridge cushion along the visor cutout
    const noseArchPts: THREE.Vector3[] = [];
    for (let i = 0; i <= 28; i++) {
      const a = (i / 28) * Math.PI;
      const nx = noseRadius * Math.cos(a);
      const ny = lensBottom + noseRadius * Math.sin(a);
      const nz = cz + Math.sqrt(lensRadius * lensRadius - nx * nx);
      noseArchPts.push(new THREE.Vector3(nx, ny, nz));
    }
    const noseCurve = new THREE.CatmullRomCurve3(noseArchPts);
    const nose = addMesh(new THREE.TubeGeometry(noseCurve, 32, 0.15, 12, false), materials.rim, 0, 0, 0);
    nose.renderOrder = 2;

    // 4. Unified corner hinges, beveled organic side shields, and sculpted tapered temple arms
    const buildSide = (s: 1 | -1) => {
      // Corner hinge housing joining brow bar, visor edge, side shield, and temple
      const hingeGeo = new THREE.ExtrudeGeometry(roundedRectShape(0.68, 0.92, 0.22), {
        depth: 0.56,
        bevelEnabled: true,
        bevelThickness: 0.06,
        bevelSize: 0.05,
        bevelSegments: 2,
      });
      hingeGeo.center();
      addMesh(hingeGeo, materials.frame, s * 6.84, 2.02, -2.62);

      // Beveled curved side shield seated flush against visor & hinge
      const shieldShape = new THREE.Shape();
      shieldShape.moveTo(0, -2.18);
      shieldShape.lineTo(0, 2.08);
      shieldShape.lineTo(5.1, 1.88);
      shieldShape.quadraticCurveTo(6.9, 1.75, 7.25, 0.92);
      shieldShape.quadraticCurveTo(7.35, 0.35, 6.7, -0.25);
      shieldShape.quadraticCurveTo(4.6, -1.25, 1.6, -2.05);
      shieldShape.closePath();

      const shieldGeo = new THREE.ExtrudeGeometry(shieldShape, {
        depth: 0.16,
        bevelEnabled: true,
        bevelThickness: 0.04,
        bevelSize: 0.04,
        bevelSegments: 2,
      });
      const shield = addMesh(shieldGeo, materials.smoke, s > 0 ? 6.66 : -6.82, 0, -2.42);
      shield.rotation.y = Math.PI / 2;

      // Subtle recessed ventilation louvers (only on right side or clean on both)
      for (let i = 0; i < 5; i++) {
        addMesh(box(0.06, 1.25, 0.14), materials.vent, s * 6.84, 0.35, -4.2 - 0.52 * i);
      }

      // Sculpted ergonomic tapered temple arm (beveled profile, curved rubber ear hook)
      const templeShape = new THREE.Shape();
      templeShape.moveTo(0, 2.28);
      templeShape.lineTo(6.8, 2.08);
      templeShape.quadraticCurveTo(10.6, 1.85, 12.2, 0.72);
      templeShape.quadraticCurveTo(13.1, 0.05, 13.35, -0.78);
      templeShape.quadraticCurveTo(13.38, -1.08, 13.06, -1.06);
      templeShape.quadraticCurveTo(12.76, -1.02, 12.56, -0.58);
      templeShape.quadraticCurveTo(11.95, 0.52, 10.1, 1.15);
      templeShape.quadraticCurveTo(7.4, 1.48, 0, 1.54);
      templeShape.closePath();

      const templeGeo = new THREE.ExtrudeGeometry(templeShape, {
        depth: 0.28,
        bevelEnabled: true,
        bevelThickness: 0.07,
        bevelSize: 0.05,
        bevelSegments: 3,
      });
      const temple = addMesh(templeGeo, materials.frame, s > 0 ? 6.82 : -7.1, 0, -2.55);
      temple.rotation.y = Math.PI / 2;

      // Subtle inner temple accent pad near ear hook
      const tipGeo = new THREE.ExtrudeGeometry(roundedRectShape(1.5, 0.36, 0.15), {
        depth: 0.32,
        bevelEnabled: true,
        bevelThickness: 0.04,
        bevelSize: 0.03,
        bevelSegments: 2,
      });
      tipGeo.center();
      const tip = addMesh(tipGeo, materials.frameSoft, s * 6.96, 1.45, -12.6);
      tip.rotation.y = Math.PI / 2;
      tip.rotation.x = 0.42;
    };
    buildSide(1);
    buildSide(-1);

    // 5. Integrated front VL53L0X central sensor pod (molded into brow center at x = 0)
    const sensorPodGeo = new THREE.ExtrudeGeometry(roundedRectShape(2.1, 1.24, 0.28), {
      depth: 0.38,
      bevelEnabled: true,
      bevelThickness: 0.08,
      bevelSize: 0.08,
      bevelSegments: 3,
    });
    sensorPodGeo.center();
    tag(addMesh(sensorPodGeo, materials.pod, 0, 1.9, 1.06), 'sensor');

    const sensorBezelGeo = new THREE.ExtrudeGeometry(roundedRectShape(1.32, 0.72, 0.16), {
      depth: 0.08,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 2,
    });
    sensorBezelGeo.center();
    tag(addMesh(sensorBezelGeo, materials.bezel, 0, 1.9, 1.3), 'sensor');
    tag(addMesh(box(1.02, 0.48, 0.05), materials.board, 0, 1.9, 1.34), 'sensor');
    const chip = addMesh(box(0.36, 0.28, 0.07), materials.chip, 0, 1.9, 1.38);

    // 6. Integrated left-temple electronics housing (ESP32-C3 Mini + MPU6500)
    const podZ = -5.45;
    const podFaceX = -7.42;
    const elecPodGeo = new THREE.ExtrudeGeometry(roundedRectShape(3.55, 3.15, 0.42), {
      depth: 0.56,
      bevelEnabled: true,
      bevelThickness: 0.09,
      bevelSize: 0.08,
      bevelSegments: 3,
    });
    elecPodGeo.center();
    const elecPod = addMesh(elecPodGeo, materials.pod, -7.06, 0.16, podZ);
    elecPod.rotation.y = Math.PI / 2;

    // Molded retaining collar tying the pod cleanly to the upper temple arm
    const collarGeo = new THREE.ExtrudeGeometry(roundedRectShape(3.1, 0.56, 0.18), {
      depth: 0.64,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.05,
      bevelSegments: 2,
    });
    collarGeo.center();
    const collar = addMesh(collarGeo, materials.frameSoft, -7.02, 1.72, podZ);
    collar.rotation.y = Math.PI / 2;

    // MPU6500 IMU inset cleanly on upper half of the left pod
    tag(addMesh(box(0.09, 1.18, 1.65), materials.imu, podFaceX, 0.86, podZ), 'imu');
    tag(addMesh(box(0.1, 0.44, 0.44), materials.ic, podFaceX - 0.06, 0.94, podZ), 'imu');
    for (let i = 0; i < 8; i++) {
      tag(addMesh(box(0.08, 0.09, 0.11), materials.gold, podFaceX - 0.05, 0.36, podZ - 0.58 + i * 0.165), 'imu');
    }

    // ESP32-C3 Mini inset cleanly on lower half of the left pod with downward USB-C port
    tag(addMesh(box(0.09, 1.24, 1.72), materials.pcbk, podFaceX, -0.58, podZ), 'esp');
    tag(addMesh(box(0.11, 0.68, 0.88), materials.usb, podFaceX - 0.06, -0.46, podZ), 'esp');
    const usbPortGeo = new THREE.ExtrudeGeometry(roundedRectShape(0.76, 0.28, 0.1), {
      depth: 0.34,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.02,
      bevelSegments: 2,
    });
    usbPortGeo.center();
    const usbPort = tag(addMesh(usbPortGeo, materials.usb, -7.24, -1.46, podZ), 'esp');
    usbPort.rotation.x = Math.PI / 2;
    usbPort.rotation.z = Math.PI / 2;
    addMesh(box(0.14, 0.06, 0.5), materials.ic, -7.24, -1.62, podZ);
    [-0.54, 0.54].forEach(offset => {
      tag(addMesh(box(0.11, 0.18, 0.24), materials.metal2, podFaceX - 0.06, -0.96, podZ + offset), 'esp');
    });

    // Sleek routed cable channel from electronics pod to rear motor cradle
    (
      [
        [0xd23a2a, 0],
        [0x151820, 0.12],
      ] as const
    ).forEach(([color, offset]) => {
      const wirePts: [number, number, number][] = [
        [-7.26, 1.48 + offset, -7.15],
        [-7.28, 1.62 + offset, -8.35],
        [-7.24, 1.56 + offset, -9.55],
      ];
      const curve = new THREE.CatmullRomCurve3(wirePts.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
      addMesh(new THREE.TubeGeometry(curve, 24, 0.045, 8, false), std(color, 0.45), 0, 0, 0);
    });

    // 7. Integrated Coin Motor 1027 cradle mounted flush on the left temple arm
    const motorZ = -9.95;
    const motorCradle = addMesh(
      new THREE.CylinderGeometry(0.74, 0.78, 0.34, 32),
      materials.pod,
      -7.18,
      1.55,
      motorZ,
    );
    motorCradle.rotation.z = Math.PI / 2;
    const motor = tag(
      addMesh(new THREE.CylinderGeometry(0.56, 0.56, 0.24, 32), materials.metal, -7.36, 1.55, motorZ),
      'motor',
    );
    motor.rotation.z = Math.PI / 2;
    const cap = addMesh(
      new THREE.CylinderGeometry(0.32, 0.32, 0.26, 24),
      materials.metal2,
      -7.38,
      1.55,
      motorZ,
    );
    cap.rotation.z = Math.PI / 2;

    // Expanding vibration rings around the motor (--gc-alert)
    const rings = [0, 1, 2].map(() => {
      const mat = new THREE.MeshBasicMaterial({ color: 0xd92d20, transparent: true, opacity: 0, depthWrite: false });
      const ring = addMesh(new THREE.TorusGeometry(0.92, 0.038, 6, 40), mat, -7.68, 1.55, motorZ);
      ring.rotation.y = Math.PI / 2;
      return ring;
    });

    // ToF laser cone (--gc-sky) and obstacle plane
    const beamGeo = new THREE.ConeGeometry(1, 1, 32, 1, true);
    beamGeo.translate(0, -0.5, 0);
    beamGeo.rotateX(-Math.PI / 2);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x5bb5f5,
      transparent: true,
      opacity: 0.4,
      side: doubleSide,
      depthWrite: false,
    });
    const beam = addMesh(beamGeo, beamMat, 0, 1.9, 1.4);
    beam.renderOrder = 3;

    const wall = addMesh(
      box(11, 7, 0.15),
      new THREE.MeshStandardMaterial({ color: 0xf1ede4, transparent: true, opacity: 0.24, depthWrite: false }),
      0,
      1.9,
      20,
    );
    const wallEdgesMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
    const wallEdges = new THREE.LineSegments(new THREE.EdgesGeometry(wall.geometry), wallEdgesMat);
    wall.add(wallEdges);
    wall.renderOrder = 3;

    // Orbital camera state
    const home: CameraPose = { ...HOME_BASE };
    const st: CameraPose = { ...HOME_BASE };
    const go: CameraPose = { ...HOME_BASE };

    let lw = 0;
    let lh = 0;
    let idle = true;
    let hov: GlassesPart = null;
    let vibrationIntensity = 0;

    const place = () => {
      cam.position.set(
        st.tx + st.r * Math.sin(st.ph) * Math.sin(st.th),
        st.ty + st.r * Math.cos(st.ph),
        st.tz + st.r * Math.sin(st.ph) * Math.cos(st.th),
      );
      cam.lookAt(st.tx, st.ty, st.tz);
    };

    const resize = () => {
      const w = Math.max(1, cv.clientWidth || 600);
      const h = Math.max(1, cv.clientHeight || 360);
      lw = cv.clientWidth;
      lh = cv.clientHeight;
      renderer.setSize(w, h, false);
      cam.aspect = w / h;
      cam.updateProjectionMatrix();
      home.r = 26.5 * Math.max(1, 1.15 / cam.aspect);
      if (!selectedPartRef.current) go.r = home.r;
    };

    const updateObstacle = (cm: number) => {
      const active = cm <= 50;
      vibrationIntensity = active ? 1 : 0;
      const len = 2 + cm * 0.14;
      beam.scale.set(len * 0.2, len * 0.2, len);
      wall.position.z = 1.4 + len;
      beamMat.opacity = active ? 0.52 : 0.26;
      wallEdgesMat.color.setHex(active ? 0xd92d20 : 0xffffff);
      wallEdgesMat.opacity = active ? 0.88 : 0.85;
    };

    const focusPart = (part: GlassesPart) => {
      idle = false;
      Object.assign(go, part ? PART_VIEWS[part] : home);
    };

    sceneHooksRef.current = { focusPart, updateObstacle };

    const ray = new THREE.Raycaster();
    const mv = new THREE.Vector2();
    const ptrs = new Map<number, { x: number; y: number }>();
    let moved = 0;
    let pinch = 0;

    const pick = (e: PointerEvent): GlassesPart => {
      const r = cv.getBoundingClientRect();
      if (!r.width || !r.height) return null;
      mv.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(mv, cam);
      const hit = ray.intersectObjects(picks, false)[0];
      return (hit?.object.userData.part as GlassesPart) ?? null;
    };

    const onPointerDown = (e: PointerEvent) => {
      try {
        cv.setPointerCapture(e.pointerId);
      } catch {
        // Ignore synthetic pointer events without an active capture target
      }
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      moved = 0;
      idle = false;
    };

    const onPointerMove = (e: PointerEvent) => {
      const p = ptrs.get(e.pointerId);
      if (!p) {
        hov = pick(e);
        cv.style.cursor = hov ? 'pointer' : 'grab';
        return;
      }
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      p.x = e.clientX;
      p.y = e.clientY;
      moved += Math.abs(dx) + Math.abs(dy);
      if (ptrs.size === 1) {
        go.th -= dx * 0.006;
        go.ph = clamp(go.ph - dy * 0.006, 0.25, 2.9);
      } else if (ptrs.size === 2) {
        const activePtrs = [...ptrs.values()];
        const dd = Math.hypot(activePtrs[0].x - activePtrs[1].x, activePtrs[0].y - activePtrs[1].y);
        if (pinch && dd > 0) go.r = clamp((go.r * pinch) / dd, 6, 70);
        pinch = dd;
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      const countBefore = ptrs.size;
      ptrs.delete(e.pointerId);
      if (ptrs.size < 2) pinch = 0;
      if (e.type === 'pointerup' && countBefore === 1 && moved < 6) {
        const picked = pick(e);
        if (picked) {
          onSelectPartRef.current(picked);
        }
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      idle = false;
      go.r = clamp(go.r * (1 + e.deltaY * 0.001), 6, 70);
    };

    cv.addEventListener('pointerdown', onPointerDown);
    cv.addEventListener('pointermove', onPointerMove);
    cv.addEventListener('pointerup', onPointerUp);
    cv.addEventListener('pointercancel', onPointerUp);
    cv.addEventListener('wheel', onWheel, { passive: false });

    const observer = new ResizeObserver(() => resize());
    observer.observe(cv);

    let t = 0;
    let last = performance.now();
    let rafId = 0;

    resize();
    Object.assign(st, selectedPartRef.current ? PART_VIEWS[selectedPartRef.current] : home);
    Object.assign(go, st);
    updateObstacle(distanceRef.current);
    place();
    renderer.render(scene, cam);

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;

      if (idle && !reduce) go.th += dt * 0.16;
      if (cv.clientWidth !== lw || cv.clientHeight !== lh) resize();
      if (!Number.isFinite(st.r + st.th + st.ph + st.tx + st.ty + st.tz)) {
        Object.assign(st, home);
        Object.assign(go, home);
      }

      const ease = 1 - Math.pow(0.001, dt);
      (Object.keys(st) as (keyof CameraPose)[]).forEach(key => {
        st[key] += (go[key] - st[key]) * ease;
      });
      place();

      const activeSel = selectedPartRef.current;
      (Object.keys(partsMap) as Exclude<GlassesPart, null>[]).forEach(partKey => {
        const emissiveHex = partKey === activeSel ? 0x9c7600 : partKey === hov ? 0x523e00 : 0x000000;
        partsMap[partKey].forEach(meshItem => {
          (meshItem.material as THREE.MeshStandardMaterial).emissive.setHex(emissiveHex);
        });
      });

      const shake = reduce ? 0 : vibrationIntensity;
      motor.position.y = 1.55 + Math.sin(t * 90) * 0.04 * shake;
      motor.position.x = -7.36 + Math.cos(t * 77) * 0.025 * shake;
      cap.position.set(motor.position.x - 0.02, motor.position.y, motor.position.z);

      rings.forEach((ring, i) => {
        const ph = (t * 2.1 + i / 3) % 1;
        ring.scale.setScalar(1 + ph * 1.6);
        (ring.material as THREE.MeshBasicMaterial).opacity = shake > 0 ? (1 - ph) * 0.72 : 0;
      });

      materials.chip.emissiveIntensity = 0.6 + 0.4 * Math.sin(t * 6);
      renderer.render(scene, cam);
      rafId = window.requestAnimationFrame(frame);
    };

    rafId = window.requestAnimationFrame(frame);

    return () => {
      window.cancelAnimationFrame(rafId);
      observer.disconnect();
      cv.removeEventListener('pointerdown', onPointerDown);
      cv.removeEventListener('pointermove', onPointerMove);
      cv.removeEventListener('pointerup', onPointerUp);
      cv.removeEventListener('pointercancel', onPointerUp);
      cv.removeEventListener('wheel', onWheel);
      scene.traverse(obj => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Line) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach(mat => mat.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
      renderer.dispose();
    };
  }, []);

  const activeInfo = GLASSES_PARTS_INFO[selectedPart ?? 'overview'];
  const alertActive = distance <= 50;

  return (
    <section className="lp-plinth" id="modelo-3d" aria-label="Protótipo 3D interativo dos óculos">
      <div className="lp-plinth-head">
        <span>Modelo 3D interativo</span>
        <span className={`lp-plinth-status ${alertActive ? 'is-alert' : 'is-clear'}`}>
          {alertActive ? 'Obstáculo próximo (<= 50 cm)' : 'Caminho livre (> 50 cm)'}
        </span>
      </div>

      <div className="lp-canvas-wrap">
        {webglError ? (
          <div className="lp-webgl-error" role="alert">
            <strong>Visualização 3D indisponível neste navegador</strong>
            <p>{webglError}</p>
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            className="lp-canvas"
            aria-label="Modelo 3D interativo dos óculos GuiaCampus. Arraste para girar, aproxime com a roda do mouse ou toque em um componente."
          />
        )}
      </div>

      <div className="lp-plinth-controls">
        <div className="lp-part-readout" aria-live="polite" aria-atomic="true">
          <div className="lp-part-readout-top">
            <strong>{activeInfo.title}</strong>
            {selectedPart !== null && (
              <button type="button" className="lp-reset-btn" onClick={() => onSelectPart(null)}>
                Visão geral
              </button>
            )}
          </div>
          <p>{activeInfo.description}</p>
        </div>

        <div className="lp-sim-control">
          <div className="lp-sim-header">
            <label htmlFor="lp-obstacle-range">Simular distância do obstáculo (ilustrativo)</label>
            <span className="lp-threshold-note">Limiar real: 50 cm</span>
          </div>
          <input
            id="lp-obstacle-range"
            className="lp-range"
            type="range"
            min={10}
            max={200}
            step={5}
            value={distance}
            aria-valuetext={`${distance} centímetros — ${alertActive ? 'alerta háptico ativo' : 'acima do limiar de 50 centímetros'}`}
            onChange={e => setDistance(Number(e.target.value))}
          />
          <output className={`lp-sim-output ${alertActive ? 'is-alert' : ''}`} htmlFor="lp-obstacle-range">
            {alertActive
              ? `Simulação: ${distance} cm · vibração ativa (<= 50 cm, PWM 160/255)`
              : `Simulação: ${distance} cm · acima de 50 cm (motor em espera)`}
          </output>
        </div>
      </div>
    </section>
  );
}
