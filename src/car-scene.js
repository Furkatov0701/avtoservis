import * as THREE from "three";

/** A self-contained, asset-free studio car. Returns a complete teardown. */
export function initCarScene(container) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
  } catch {
    container.dataset.webgl = "unavailable";
    return () => {};
  }

  container.dataset.webgl = "ready";
  // A group preserves the interactive canvas in the accessibility tree.
  container.setAttribute("role", "group");
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.22;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute(
    "aria-label",
    "3D avtomobil. Aylantirish uchun chap va o‘ng yo‘nalish tugmalaridan foydalaning.",
  );
  renderer.domElement.setAttribute("role", "slider");
  renderer.domElement.setAttribute("aria-valuemin", "0");
  renderer.domElement.setAttribute("aria-valuemax", "359");
  renderer.domElement.setAttribute("aria-valuenow", "0");
  renderer.domElement.setAttribute("aria-valuetext", "0 daraja");
  renderer.domElement.setAttribute("aria-orientation", "horizontal");
  renderer.domElement.style.outlineOffset = "-7px";
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  camera.zoom = 1.65;
  camera.position.set(6.2, 3.15, 7.8);
  camera.lookAt(0, 0.65, 0);

  // Large illuminated studio panels provide real reflections without downloads.
  const studio = new THREE.Scene();
  studio.background = new THREE.Color(0x565b5e);
  const card = (color, intensity, width, height, position, target) => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      new THREE.MeshBasicMaterial({
        color,
        toneMapped: false,
        side: THREE.DoubleSide,
      }),
    );
    mesh.material.color.multiplyScalar(intensity);
    mesh.position.set(...position);
    mesh.lookAt(...target);
    studio.add(mesh);
  };
  card(0xffffff, 4, 5, 8, [-5, 5, 1], [0, 0, 0]);
  card(0xf4faff, 3, 2, 9, [4, 4, -2], [0, 0, 0]);
  card(0xffffff, 3.5, 8, 2, [0, 7, 0], [0, 0, 0]);
  card(0xc8ffcf, 0.6, 4, 2, [0, 1, -7], [0, 0, 0]);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(studio, 0.04);
  scene.environment = environment.texture;
  scene.environmentIntensity = 1.15;
  studio.traverse((object) => {
    object.geometry?.dispose();
    object.material?.dispose();
  });
  pmrem.dispose();

  scene.add(new THREE.HemisphereLight(0xe7f2ff, 0x1a2024, 2.1));
  const key = new THREE.DirectionalLight(0xffffff, 4.5);
  key.position.set(-3, 7, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -5;
  key.shadow.camera.right = 5;
  key.shadow.camera.top = 5;
  key.shadow.camera.bottom = -5;
  key.shadow.normalBias = 0.035;
  key.shadow.bias = -0.0005;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xd8e5ff, 2.8);
  rim.position.set(5, 4, -4);
  scene.add(rim);
  const fill = new THREE.DirectionalLight(0xf2ffe9, 1.5);
  fill.position.set(3, 2, 5);
  scene.add(fill);

  const paint = new THREE.MeshPhysicalMaterial({
    color: 0x9babad,
    metalness: 0.88,
    roughness: 0.23,
    clearcoat: 1,
    clearcoatRoughness: 0.18,
    side: THREE.DoubleSide,
  });
  const trim = new THREE.MeshStandardMaterial({
    color: 0x101416,
    metalness: 0.55,
    roughness: 0.3,
  });
  const rubber = new THREE.MeshStandardMaterial({
    color: 0x101214,
    metalness: 0.03,
    roughness: 0.91,
  });
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x05090d,
    metalness: 0.12,
    roughness: 0.22,
    clearcoat: 0.06,
    specularIntensity: 0.08,
    envMapIntensity: 0.12,
    side: THREE.DoubleSide,
  });
  const chrome = new THREE.MeshStandardMaterial({
    color: 0xb2bcc0,
    metalness: 0.95,
    roughness: 0.19,
  });
  const darkMetal = new THREE.MeshStandardMaterial({
    color: 0x343c40,
    metalness: 0.9,
    roughness: 0.33,
  });
  const brake = new THREE.MeshStandardMaterial({
    color: 0xc8ff5f,
    metalness: 0.4,
    roughness: 0.36,
  });
  const light = new THREE.MeshStandardMaterial({
    color: 0xf3fffc,
    emissive: 0xb8fff1,
    emissiveIntensity: 4,
    metalness: 0.15,
    roughness: 0.15,
  });
  const redLight = new THREE.MeshStandardMaterial({
    color: 0xf63335,
    emissive: 0xff1025,
    emissiveIntensity: 2.1,
    roughness: 0.25,
  });

  const car = new THREE.Group();
  scene.add(car);
  const add = (geometry, material, position = [0, 0, 0], parent = car) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const box = (w, h, d, material, position, parent = car) =>
    add(new THREE.BoxGeometry(w, h, d), material, position, parent);
  const path = (points, material, radius = 0.006, parent = car) => {
    const curve = new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(...p)),
    );
    return add(
      new THREE.TubeGeometry(
        curve,
        Math.max(24, points.length * 5),
        radius,
        6,
        false,
      ),
      material,
      [0, 0, 0],
      parent,
    );
  };
  const surface = (uSegments, vSegments, position, material, parent = car) => {
    const vertices = [],
      indices = [];
    for (let v = 0; v <= vSegments; v++) {
      for (let u = 0; u <= uSegments; u++)
        vertices.push(...position(u / uSegments, v / vSegments));
    }
    for (let v = 0; v < vSegments; v++) {
      for (let u = 0; u < uSegments; u++) {
        const a = v * (uSegments + 1) + u,
          b = a + uSegments + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return add(geo, material, [0, 0, 0], parent);
  };

  const widthAt = (z) =>
    1.015 -
    0.115 * (Math.abs(z) / 2.17) ** 3 +
    0.032 * Math.exp(-(((z + 1.12) / 0.48) ** 2));
  const hoodAt = (z) =>
    0.91 -
    0.2 * Math.max(0, (z - 0.7) / 1.47) +
    0.015 * Math.exp(-(((z + 1.1) / 0.7) ** 2));
  const archAt = (z) =>
    Math.max(
      ...[1.31, -1.29].map((wz) => {
        const distance = Math.abs(z - wz);
        return distance < 0.49
          ? 0.47 + Math.sqrt(0.49 ** 2 - distance ** 2)
          : 0.31;
      }),
    );
  const shoulderAt = (z) => Math.max(hoodAt(z) - 0.115, archAt(z) + 0.065);

  // Smooth compound-curved body shell, with actual open wheel arches.
  surface(
    28,
    100,
    (u, v) => {
      const z = 2.17 - v * 4.34;
      const t = u * 2 - 1;
      const side = shoulderAt(z),
        middle = hoodAt(z);
      return [
        t * widthAt(z),
        THREE.MathUtils.lerp(middle, side, Math.abs(t) ** 2.5) +
          0.035 * Math.sin(Math.abs(t) * Math.PI),
        z,
      ];
    },
    paint,
  );
  for (const side of [-1, 1]) {
    surface(
      100,
      8,
      (u, v) => {
        const z = side * (2.17 - u * 4.34);
        const bottom = archAt(z);
        const top = shoulderAt(z);
        return [
          side * (widthAt(z) - 0.035 * Math.sin(v * Math.PI)),
          THREE.MathUtils.lerp(top, bottom, v),
          z,
        ];
      },
      paint,
    );
    // Sills tuck under the doors; wheel-arch trim follows the cutout.
    box(0.085, 0.09, 1.65, trim, [side * 0.982, 0.31, 0.01]);
    for (const wz of [-1.29, 1.31]) {
      const points = [];
      for (let i = 0; i <= 32; i++) {
        const angle = (i / 32) * Math.PI;
        const z = wz + Math.cos(angle) * 0.49;
        points.push([
          side * (widthAt(z) + 0.005),
          0.47 + Math.sin(angle) * 0.49,
          z,
        ]);
      }
      path(points, trim, 0.013);
    }
  }
  // Rounded front/rear faces close the shell.
  for (const front of [true, false]) {
    const z = front ? 2.17 : -2.17;
    surface(
      32,
      8,
      (u, v) => {
        const t = (front ? u : 1 - u) * 2 - 1;
        const top = THREE.MathUtils.lerp(
          hoodAt(z),
          shoulderAt(z),
          Math.abs(t) ** 2.5,
        );
        return [
          t * widthAt(z),
          THREE.MathUtils.lerp(top, 0.31, v),
          z +
            (front ? 1 : -1) *
              0.045 *
              Math.sin(u * Math.PI) *
              Math.sin(v * Math.PI),
        ];
      },
      paint,
    );
  }
  box(1.64, 0.13, 3.9, trim, [0, 0.3, -0.03]);

  // Four deeply dished alloy wheels, ventilated disks and lime brake calipers.
  for (const side of [-1, 1]) {
    for (const z of [-1.29, 1.31]) {
      const wheel = new THREE.Group();
      wheel.position.set(side * 1.012, 0.465, z);
      car.add(wheel);
      const tire = add(
        new THREE.TorusGeometry(0.342, 0.108, 18, 64),
        rubber,
        [0, 0, 0],
        wheel,
      );
      tire.rotation.y = Math.PI / 2;
      const sidewall = add(
        new THREE.CylinderGeometry(0.376, 0.376, 0.19, 64),
        rubber,
        [0, 0, 0],
        wheel,
      );
      sidewall.rotation.z = Math.PI / 2;
      const barrel = add(
        new THREE.CylinderGeometry(0.316, 0.316, 0.197, 48),
        darkMetal,
        [side * 0.006, 0, 0],
        wheel,
      );
      barrel.rotation.z = Math.PI / 2;
      const disk = add(
        new THREE.CylinderGeometry(0.255, 0.255, 0.02, 48),
        chrome,
        [side * 0.092, 0, 0],
        wheel,
      );
      disk.rotation.z = Math.PI / 2;
      box(0.047, 0.16, 0.075, brake, [side * 0.117, 0.045, -0.21], wheel);
      const lip = add(
        new THREE.TorusGeometry(0.298, 0.013, 8, 64),
        chrome,
        [side * 0.12, 0, 0],
        wheel,
      );
      lip.rotation.y = Math.PI / 2;
      for (let spoke = 0; spoke < 5; spoke++) {
        for (const split of [-1, 1]) {
          const angle = (spoke / 5) * Math.PI * 2 + split * 0.105;
          const spokeMesh = box(
            0.033,
            0.264,
            0.025,
            chrome,
            [side * 0.127, Math.cos(angle) * 0.145, Math.sin(angle) * 0.145],
            wheel,
          );
          spokeMesh.rotation.x = angle;
        }
      }
      const hub = add(
        new THREE.CylinderGeometry(0.067, 0.067, 0.034, 24),
        trim,
        [side * 0.145, 0, 0],
        wheel,
      );
      hub.rotation.z = Math.PI / 2;
      for (let bolt = 0; bolt < 5; bolt++) {
        const angle = (bolt / 5) * Math.PI * 2;
        const stud = add(
          new THREE.SphereGeometry(0.01, 6, 6),
          chrome,
          [side * 0.168, Math.cos(angle) * 0.046, Math.sin(angle) * 0.046],
          wheel,
        );
        stud.scale.x = 0.4;
      }
      // Fine sidewall concentric molding catches the rim light.
      const molding = add(
        new THREE.TorusGeometry(0.397, 0.0035, 4, 64),
        darkMetal,
        [side * 0.078, 0, 0],
        wheel,
      );
      molding.rotation.y = Math.PI / 2;
    }
  }

  // Low panoramic cabin. Separate glazing and pillars retain a believable silhouette.
  const windshield = (u, v) => {
    const t = u * 2 - 1;
    const z = THREE.MathUtils.lerp(0.69, 0.01, v);
    return [
      t * THREE.MathUtils.lerp(0.81, 0.656, v),
      THREE.MathUtils.lerp(0.949, 1.445, v) + 0.035 * (1 - t * t),
      z + 0.06 * (1 - t * t) * Math.sin(v * Math.PI),
    ];
  };
  surface(24, 16, windshield, glass);
  surface(
    24,
    20,
    (u, v) => {
      const t = u * 2 - 1,
        z = 0.015 - v * 0.75;
      return [
        t * (0.656 + 0.025 * Math.sin(v * Math.PI)),
        1.445 + 0.065 * Math.sin(v * Math.PI) + 0.038 * (1 - t * t) - v * 0.045,
        z,
      ];
    },
    paint,
  );
  surface(
    24,
    16,
    (u, v) => {
      const t = u * 2 - 1;
      return [
        t * THREE.MathUtils.lerp(0.665, 0.845, v),
        THREE.MathUtils.lerp(1.4, 0.94, v) + 0.035 * (1 - t * t),
        -0.735 - v * 0.72,
      ];
    },
    glass,
  );
  for (const side of [-1, 1]) {
    // A single curved glass sheet on each side, framed by narrow painted pillars.
    const vertices = [
      [side * 0.817, 0.96, 0.665],
      [side * 0.659, 1.442, 0.008],
      [side * 0.673, 1.4, -0.735],
      [side * 0.85, 0.951, -1.435],
    ];
    surface(
      20,
      12,
      (u, v) => {
        const lower = new THREE.Vector3(...vertices[0]).lerp(
          new THREE.Vector3(...vertices[3]),
          u,
        );
        const upper = new THREE.Vector3(...vertices[1]).lerp(
          new THREE.Vector3(...vertices[2]),
          u,
        );
        const point = lower.lerp(upper, v);
        point.x += side * 0.017 * Math.sin(u * Math.PI) * Math.sin(v * Math.PI);
        return point.toArray();
      },
      glass,
    );
    path(
      [
        vertices[0],
        vertices[1],
        [side * 0.681, 1.465, -0.35],
        vertices[2],
        vertices[3],
      ],
      paint,
      0.031,
    );
    path([vertices[0], [side * 0.86, 0.947, -0.35], vertices[3]], paint, 0.024);
    path(
      [
        [side * 0.679, 1.421, -0.62],
        [side * 0.84, 0.955, -0.72],
      ],
      trim,
      0.022,
    );
    // Door shut line, flush handle, aerodynamic mirror and shoulder contour.
    path(
      [
        [side * 0.829, 0.948, 0.57],
        [side * 1.012, 0.767, 0.58],
        [side * 0.996, 0.41, 0.51],
        [side * 0.992, 0.39, -0.68],
        [side * 1.023, 0.79, -0.82],
      ],
      trim,
      0.004,
    );
    box(0.015, 0.024, 0.145, darkMetal, [side * 1.033, 0.815, -0.51]);
    const mirrorStem = box(0.135, 0.025, 0.035, trim, [
      side * 0.919,
      0.996,
      0.47,
    ]);
    mirrorStem.rotation.z = side * 0.13;
    const mirror = add(new THREE.SphereGeometry(1, 24, 12), paint, [
      side * 1.054,
      1.015,
      0.48,
    ]);
    mirror.scale.set(0.146, 0.061, 0.104);
    const mirrorGlass = add(new THREE.SphereGeometry(1, 16, 8), glass, [
      side * 1.052,
      1.016,
      0.408,
    ]);
    mirrorGlass.scale.set(0.114, 0.043, 0.025);
    path(
      [
        [side * 0.64, 0.925, 0.66],
        [side * 0.62, 0.869, 1.2],
        [side * 0.56, 0.793, 1.88],
      ],
      trim,
      0.005,
    );
  }
  // Fine windshield surround and realistic wipers.
  path(
    Array.from({ length: 20 }, (_, i) => windshield(i / 19, 0)),
    trim,
    0.012,
  );
  path(
    [
      [-0.55, 0.971, 0.69],
      [-0.16, 0.999, 0.711],
      [0.01, 0.992, 0.703],
    ],
    trim,
    0.009,
  );
  path(
    [
      [0.05, 0.993, 0.71],
      [0.42, 0.982, 0.701],
      [0.56, 0.969, 0.691],
    ],
    trim,
    0.009,
  );

  // Recessed LED headlamp housings sit in the sculpted front fenders.
  for (const side of [-1, 1]) {
    const housing = add(new THREE.SphereGeometry(1, 32, 16), trim, [
      side * 0.727,
      0.797,
      1.938,
    ]);
    housing.scale.set(0.185, 0.052, 0.232);
    housing.rotation.x = 0.2;
    for (const offset of [-0.037, 0.042]) {
      path(
        [
          [side * 0.587, 0.81, 1.973 + offset],
          [side * 0.72, 0.838, 1.996 + offset],
          [side * 0.853, 0.819, 1.938 + offset],
        ],
        light,
        0.014,
      );
    }
    box(0.335, 0.135, 0.049, trim, [side * 0.664, 0.469, 2.177]);
    for (let louver = 0; louver < 3; louver++) {
      box(0.31, 0.012, 0.052, darkMetal, [
        side * 0.664,
        0.423 + louver * 0.043,
        2.207,
      ]);
    }
  }
  box(0.61, 0.145, 0.045, trim, [0, 0.465, 2.211]);
  for (let fin = 0; fin < 15; fin++)
    box(0.008, 0.125, 0.012, darkMetal, [-0.276 + fin * 0.0395, 0.465, 2.238]);
  path(
    [
      [-0.907, 0.329, 2.12],
      [-0.6, 0.305, 2.23],
      [0, 0.3, 2.25],
      [0.6, 0.305, 2.23],
      [0.907, 0.329, 2.12],
    ],
    trim,
    0.027,
  );
  // Tiny shield emblem on the bonnet.
  const emblem = add(
    new THREE.SphereGeometry(0.025, 12, 8),
    chrome,
    [0, 0.758, 1.97],
  );
  emblem.scale.set(0.65, 0.15, 1);

  // Continuous rear light signature, deck vents, diffuser, and twin exhausts.
  path(
    [
      [-0.86, 0.776, -2.177],
      [-0.62, 0.8, -2.214],
      [0, 0.813, -2.228],
      [0.62, 0.8, -2.214],
      [0.86, 0.776, -2.177],
    ],
    redLight,
    0.018,
  );
  for (let vent = 0; vent < 9; vent++)
    box(0.63, 0.014, 0.014, trim, [
      0,
      0.933 - vent * 0.001,
      -1.51 - vent * 0.045,
    ]);
  box(1.5, 0.13, 0.06, trim, [0, 0.385, -2.185]);
  for (const side of [-1, 1]) {
    const exhaust = add(
      new THREE.CylinderGeometry(0.075, 0.075, 0.13, 24, 1, true),
      chrome,
      [side * 0.69, 0.377, -2.214],
    );
    exhaust.rotation.x = Math.PI / 2;
    const exhaustInside = add(new THREE.CircleGeometry(0.063, 24), trim, [
      side * 0.69,
      0.377,
      -2.26,
    ]);
    exhaustInside.rotation.y = Math.PI;
  }

  // Transparent contact shadow keeps the studio continuous with the page.
  const shadowCanvas = document.createElement("canvas");
  shadowCanvas.width = 128;
  shadowCanvas.height = 128;
  const ctx = shadowCanvas.getContext("2d");
  const gradient = ctx.createRadialGradient(64, 64, 12, 64, 64, 64);
  gradient.addColorStop(0, "rgba(0,0,0,0.68)");
  gradient.addColorStop(0.55, "rgba(0,0,0,0.36)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
  const contact = new THREE.Mesh(
    new THREE.PlaneGeometry(4.6, 6.8),
    new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      depthWrite: false,
      opacity: 0.95,
    }),
  );
  contact.rotation.x = -Math.PI / 2;
  contact.position.y = 0.018;
  scene.add(contact);
  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 30),
    new THREE.ShadowMaterial({ opacity: 0.26 }),
  );
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.receiveShadow = true;
  scene.add(shadowPlane);

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  let pointerX = 0,
    pointerY = 0,
    rotation = 0,
    dragging = false,
    startX = 0;
  let visible = true,
    frame = null,
    disposed = false;
  const startedAt = performance.now();
  const updateAccessibleRotation = () => {
    const degrees =
      Math.round((THREE.MathUtils.radToDeg(rotation) % 360) + 360) % 360;
    renderer.domElement.setAttribute("aria-valuenow", String(degrees));
    renderer.domElement.setAttribute("aria-valuetext", `${degrees} daraja`);
  };
  const requestRender = () => {
    if (frame === null && visible && !document.hidden && !disposed)
      frame = requestAnimationFrame(animate);
  };
  const syncActivity = () => {
    if (!visible || document.hidden) {
      cancelAnimationFrame(frame);
      frame = null;
    } else requestRender();
  };
  function animate() {
    frame = null;
    if (disposed || !visible || document.hidden) return;
    const time = (performance.now() - startedAt) / 1000;
    const targetRotation =
      rotation +
      (reduced.matches ? 0 : Math.sin(time * 0.25) * 0.055 + pointerX * 0.3);
    car.rotation.y = reduced.matches
      ? rotation
      : THREE.MathUtils.lerp(car.rotation.y, targetRotation, 0.055);
    camera.position.y = reduced.matches
      ? 3.15
      : THREE.MathUtils.lerp(camera.position.y, 3.15 + pointerY * 0.3, 0.035);
    camera.lookAt(0, 0.65, 0);
    renderer.render(scene, camera);
    // Reduced motion renders only on explicit input/resize; hidden scenes do no work.
    if (!reduced.matches) requestRender();
  }
  const onMove = (event) => {
    const rect = container.getBoundingClientRect();
    pointerX = (event.clientX - rect.left) / rect.width - 0.5;
    pointerY = (event.clientY - rect.top) / rect.height - 0.5;
    if (dragging) {
      rotation += (event.clientX - startX) * 0.008;
      startX = event.clientX;
      updateAccessibleRotation();
    }
    if (dragging || !reduced.matches) requestRender();
  };
  const onDown = (event) => {
    if (event.button !== 0) return;
    dragging = true;
    startX = event.clientX;
    renderer.domElement.setPointerCapture?.(event.pointerId);
    container.classList.add("is-dragging");
  };
  const onUp = () => {
    dragging = false;
    container.classList.remove("is-dragging");
  };
  const onLeave = () => {
    pointerX = 0;
    pointerY = 0;
  };
  const onKeyDown = (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    if (event.key === "Home") rotation = 0;
    else if (event.key === "End") rotation = THREE.MathUtils.degToRad(359);
    else rotation += ((event.key === "ArrowLeft" ? -1 : 1) * Math.PI) / 12;
    updateAccessibleRotation();
    requestRender();
  };
  const onFocus = () => {
    if (renderer.domElement.matches(":focus-visible"))
      renderer.domElement.style.outline = "2px solid #b9f279";
  };
  const onBlur = () => {
    renderer.domElement.style.outline = "none";
  };
  renderer.domElement.style.touchAction = "pan-y";
  renderer.domElement.addEventListener("pointermove", onMove);
  renderer.domElement.addEventListener("pointerdown", onDown);
  renderer.domElement.addEventListener("pointerup", onUp);
  renderer.domElement.addEventListener("pointercancel", onUp);
  renderer.domElement.addEventListener("pointerleave", onLeave);
  renderer.domElement.addEventListener("keydown", onKeyDown);
  renderer.domElement.addEventListener("focus", onFocus);
  renderer.domElement.addEventListener("blur", onBlur);
  document.addEventListener("visibilitychange", syncActivity);
  reduced.addEventListener("change", requestRender);

  const resize = () => {
    const { width, height } = container.getBoundingClientRect();
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.fov = camera.aspect < 1.2 ? 40 : 34;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    requestRender();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  const intersection = new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    syncActivity();
  });
  intersection.observe(container);
  resize();

  return () => {
    disposed = true;
    cancelAnimationFrame(frame);
    observer.disconnect();
    intersection.disconnect();
    renderer.domElement.removeEventListener("pointermove", onMove);
    renderer.domElement.removeEventListener("pointerdown", onDown);
    renderer.domElement.removeEventListener("pointerup", onUp);
    renderer.domElement.removeEventListener("pointercancel", onUp);
    renderer.domElement.removeEventListener("pointerleave", onLeave);
    renderer.domElement.removeEventListener("keydown", onKeyDown);
    renderer.domElement.removeEventListener("focus", onFocus);
    renderer.domElement.removeEventListener("blur", onBlur);
    document.removeEventListener("visibilitychange", syncActivity);
    reduced.removeEventListener("change", requestRender);
    const geometries = new Set(),
      materials = new Set();
    scene.traverse((object) => {
      if (object.geometry) geometries.add(object.geometry);
      if (object.material) materials.add(object.material);
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    shadowTexture.dispose();
    environment.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };
}
