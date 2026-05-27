import { useEffect, useRef } from "react";
import type { GameState, PlayerState, TeamId, WeaponId } from "@ai-browser-fps/shared";
import { WEAPON_SPREAD } from "@ai-browser-fps/shared";
import * as THREE from "three";
import { playHitSound, playReloadSound, playShotSound, setMasterVolume } from "../audio/soundEngine";
import { colliders, mapBounds, playerStart, zones } from "./gameMap";

type FpsSceneProps = {
  gameState: GameState | null;
  onEquipWeapon: (weapon: WeaponId) => void;
  onPlayerPosition: (position: { x: number; y: number; z: number }) => void;
  onShoot: (origin: { x: number; y: number; z: number }, direction: { x: number; y: number; z: number }, weapon: WeaponId) => void;
  overviewMode: boolean;
  sensitivity: number;
  uiLocked: boolean;
  volume: number;
};

const playerHeight = 1.7;
const playerRadius = 0.35;
const maxMoveSpeed = 7.4;
const acceleration = 28;
const friction = 14;
const airControl = 0.35;
const botMeshNamePrefix = "bot:";

type ActionState = {
  kind: "idle" | "walk" | "run" | "strafe-left" | "strafe-right" | "crouch" | "jump" | "shoot" | "reload" | "knife" | "plant" | "defuse" | "death" | "hit";
  startedAt: number;
};

export function FpsScene({ gameState, onEquipWeapon, onPlayerPosition, onShoot, overviewMode, sensitivity, uiLocked, volume }: FpsSceneProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef<GameState | null>(gameState);
  const onPlayerPositionRef = useRef(onPlayerPosition);
  const onShootRef = useRef(onShoot);
  const onEquipWeaponRef = useRef(onEquipWeapon);
  const sensitivityRef = useRef(sensitivity);
  const uiLockedRef = useRef(uiLocked);
  const overviewModeRef = useRef(overviewMode);
  const debugAiRef = useRef(false);
  const debugPanelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    stateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    onPlayerPositionRef.current = onPlayerPosition;
  }, [onPlayerPosition]);

  useEffect(() => {
    onShootRef.current = onShoot;
    onEquipWeaponRef.current = onEquipWeapon;
  }, [onEquipWeapon, onShoot]);

  useEffect(() => {
    sensitivityRef.current = sensitivity;
  }, [sensitivity]);

  useEffect(() => {
    uiLockedRef.current = uiLocked;
    if (uiLocked && document.pointerLockElement) {
      document.exitPointerLock();
    }
  }, [uiLocked]);

  useEffect(() => {
    overviewModeRef.current = overviewMode;
  }, [overviewMode]);

  useEffect(() => {
    setMasterVolume(volume);
  }, [volume]);

  useEffect(() => {
    const mount = mountRef.current;

    if (!mount) {
      return;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x06090d);
    scene.fog = new THREE.Fog(0x07100d, 18, 82);

    const camera = new THREE.PerspectiveCamera(75, mount.clientWidth / mount.clientHeight, 0.1, 120);
    camera.position.set(playerStart.x, playerHeight, playerStart.z);

    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      powerPreference: "high-performance",
      preserveDrawingBuffer: true
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = false;
    mount.appendChild(renderer.domElement);

    const ambient = new THREE.HemisphereLight(0xa9c6d8, 0x132014, 1.15);
    scene.add(ambient);

    const moon = new THREE.DirectionalLight(0xb9d6ff, 1.55);
    moon.position.set(-12, 18, 8);
    scene.add(moon);

    const fireGlow = new THREE.PointLight(0xff7c32, 1.65, 28, 1.9);
    fireGlow.position.set(2, 2.8, 4);
    scene.add(fireGlow);

    addForestTownMap(scene);

    let currentWeapon: WeaponId = "pistol";
    let weapon = createWeapon(currentWeapon);
    camera.add(weapon);
    scene.add(camera);

    const raycaster = new THREE.Raycaster();
    const botMeshes = new Map<string, THREE.Group>();
    const botShotSeen = new Map<string, number>();
    const keys = new Set<string>();
    const velocity = new THREE.Vector3();
    const wishVelocity = new THREE.Vector3();
    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();
    const shotMarks: THREE.Mesh[] = [];
    const particles: THREE.Mesh[] = [];
    let yaw = 0;
    let pitch = 0;
    let lastTime = performance.now();
    let lastPositionSentAt = 0;
    let hitFlashUntil = 0;
    let hitMarkerUntil = 0;
    let shakeUntil = 0;
    let shakeStrength = 0;
    let action: ActionState = { kind: "idle", startedAt: performance.now() };
    let lastAlive = true;
    let lastRoundNumber = stateRef.current?.match.roundNumber ?? 1;
    let lastMatchStartedAt = stateRef.current?.match.startedAt ?? 0;
    let lastLocalTeam = stateRef.current?.match.selectedTeam ?? "CT";
    let wasOverviewMode = overviewModeRef.current;
    const tracers: THREE.Line[] = [];

    const debugPanel = document.createElement("div");
    debugPanel.className = "ai-debug-panel";
    debugPanel.hidden = true;
    mount.appendChild(debugPanel);
    debugPanelRef.current = debugPanel;

    const onKeyDown = (event: KeyboardEvent) => {
      if (uiLockedRef.current || !isLocalPlayerAlive(stateRef.current)) {
        return;
      }
      keys.add(event.code);
      if (event.code === "KeyR") {
        action = { kind: "reload", startedAt: performance.now() };
        playReloadSound();
      }
      if (event.code === "ControlLeft" || event.code === "ControlRight") {
        action = { kind: "crouch", startedAt: performance.now() };
      }
      if (event.code === "Space") {
        action = { kind: "jump", startedAt: performance.now() };
      }
      if (event.code === "Digit1") {
        const primary = stateRef.current?.players.find((player) => player.id === "player")?.loadout.primary;
        if (primary) onEquipWeaponRef.current(primary);
        action = { kind: "reload", startedAt: performance.now() };
      }
      if (event.code === "Digit2") {
        onEquipWeaponRef.current("pistol");
        action = { kind: "reload", startedAt: performance.now() };
      }
      if (event.code === "Digit3") {
        onEquipWeaponRef.current("knife");
        action = { kind: "reload", startedAt: performance.now() };
      }
      if (event.code === "KeyL") {
        debugAiRef.current = !debugAiRef.current;
        if (debugPanelRef.current) {
          debugPanelRef.current.hidden = !debugAiRef.current;
        }
      }
    };
    const onKeyUp = (event: KeyboardEvent) => keys.delete(event.code);
    const onMouseMove = (event: MouseEvent) => {
      if (document.pointerLockElement !== renderer.domElement) {
        return;
      }
      if (!isLocalPlayerAlive(stateRef.current)) {
        return;
      }

      const mouseSensitivity = 0.0014 + sensitivityRef.current * 0.0026;
      yaw -= event.movementX * mouseSensitivity;
      pitch = THREE.MathUtils.clamp(pitch - event.movementY * mouseSensitivity, -1.35, 1.35);
      camera.rotation.set(pitch, yaw, 0, "YXZ");
    };
    const onClick = () => {
      if (uiLockedRef.current) {
        return;
      }
      if (!isLocalPlayerAlive(stateRef.current)) {
        return;
      }
      if (document.pointerLockElement !== renderer.domElement) {
        renderer.domElement.requestPointerLock();
        return;
      }

      const weaponId = getLocalWeapon(stateRef.current);
      action = { kind: weaponId === "knife" ? "knife" : "shoot", startedAt: performance.now() };
      playShotSound(weaponId);
      shakeUntil = performance.now() + (weaponId === "knife" ? 70 : 140);
      shakeStrength = weaponId === "knife" ? 0.004 : weaponId === "sniper" ? 0.018 : weaponId === "rifle" ? 0.012 : 0.008;
      const spread = WEAPON_SPREAD[weaponId];
      const direction = new THREE.Vector3(
        (Math.random() - 0.5) * spread,
        (Math.random() - 0.5) * spread * 0.6,
        -1
      )
        .applyQuaternion(camera.quaternion)
        .normalize();
      onShootRef.current(
        { x: camera.position.x, y: camera.position.y, z: camera.position.z },
        { x: direction.x, y: direction.y, z: direction.z },
        weaponId
      );

      if (weaponId === "knife") {
        return;
      }

      raycaster.set(camera.position, direction);
      const targets = [...botMeshes.values()].filter((mesh) => mesh.visible);
      const [hit] = raycaster.intersectObjects(targets, true);
      const tracerEnd = hit?.point ?? camera.position.clone().add(direction.clone().multiplyScalar(22));
      addTracer(scene, tracers, camera.position, tracerEnd);

      if (hit) {
        hitFlashUntil = performance.now() + 120;
        hitMarkerUntil = performance.now() + 160;
        playHitSound();
        addShotMark(scene, shotMarks, hit.point);
        spawnParticles(scene, particles, hit.point, 0xc42b2b);
      }
      spawnMuzzleFlash(weapon, weaponId);
    };
    const onResize = () => {
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("resize", onResize);
    renderer.domElement.addEventListener("click", onClick);

    let frameId = 0;
    const animate = (now: number) => {
      const delta = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      if (overviewModeRef.current) {
        wasOverviewMode = true;
        updateOverviewCamera(camera, now);
        weapon.visible = false;
        syncBots(scene, botMeshes, stateRef.current, tracers, botShotSeen);
        updateTracers(tracers);
        updateAiDebug(debugPanelRef.current, stateRef.current);
        mount.classList.remove("death-view", "hit-marker", "hit-flash");
        renderer.render(scene, camera);
        frameId = requestAnimationFrame(animate);
        return;
      }

      const currentRoundNumber = stateRef.current?.match.roundNumber ?? lastRoundNumber;
      const currentMatchStartedAt = stateRef.current?.match.startedAt ?? lastMatchStartedAt;
      const roundChanged = currentRoundNumber !== lastRoundNumber || currentMatchStartedAt !== lastMatchStartedAt;
      const currentTeam = stateRef.current?.match.selectedTeam ?? lastLocalTeam;
      const teamChanged = currentTeam !== lastLocalTeam;
      const exitedOverview = wasOverviewMode;
      wasOverviewMode = false;
      syncLocalPlayerCamera(camera, stateRef.current, lastAlive, roundChanged || teamChanged || exitedOverview, () => {
        clearShotMarks(scene, shotMarks);
        velocity.set(0, 0, 0);
        yaw = 0;
        pitch = 0;
      });
      lastRoundNumber = currentRoundNumber;
      lastMatchStartedAt = currentMatchStartedAt;
      lastLocalTeam = currentTeam;
      const alive = isLocalPlayerAlive(stateRef.current);
      const diedThisFrame = lastAlive && !alive;
      if (diedThisFrame) {
        keys.clear();
        velocity.set(0, 0, 0);
        wishVelocity.set(0, 0, 0);
        action = { kind: "death", startedAt: now };
        shakeUntil = 0;
        shakeStrength = 0;
        if (document.pointerLockElement === renderer.domElement) {
          document.exitPointerLock();
        }
      }
      lastAlive = alive;
      weapon.visible = alive;
      if (alive) {
        mount.classList.remove("death-view");
      }
      const movementKind =
        alive && !uiLockedRef.current ? updateMovement(camera, keys, velocity, wishVelocity, forward, right, delta) : "death";
      if (isLocalPlayerAlive(stateRef.current) && !uiLockedRef.current && now - lastPositionSentAt > 500) {
        lastPositionSentAt = now;
        onPlayerPositionRef.current({ x: camera.position.x, y: 0, z: camera.position.z });
      }
      const nextWeapon = getLocalWeapon(stateRef.current);
      if (nextWeapon !== currentWeapon) {
        camera.remove(weapon);
        disposeObject(weapon);
        currentWeapon = nextWeapon;
        weapon = createWeapon(currentWeapon);
        camera.add(weapon);
      }
      if (action.kind === "idle" || now - action.startedAt > 700) {
        action = { kind: movementKind, startedAt: action.startedAt };
      }
      updateWeapon(weapon, now, action, currentWeapon);
      syncBots(scene, botMeshes, stateRef.current, tracers, botShotSeen);
      updateParticles(scene, particles);
      updateTracers(tracers);
      if (alive) {
        updateCameraBob(camera, velocity, now);
        applyScreenShake(camera, now, shakeUntil, shakeStrength);
      } else {
        updateDeathFeedback(mount, camera, stateRef.current, now);
      }
      updateAiDebug(debugPanelRef.current, stateRef.current);
      updateHitFlash(mount, now < hitFlashUntil);
      mount.classList.toggle("hit-marker", now < hitMarkerUntil);

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("click", onClick);
      for (const mesh of botMeshes.values()) {
        disposeObject(mesh);
      }
      for (const particle of particles) {
        particle.geometry.dispose();
        disposeMaterial(particle.material);
      }
      debugPanel.remove();
      for (const tracer of tracers) {
        scene.remove(tracer);
        tracer.geometry.dispose();
        disposeMaterial(tracer.material);
      }
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="scene-mount" />;
}

function addForestTownMap(scene: THREE.Scene): void {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(mapBounds.maxX - mapBounds.minX, mapBounds.maxZ - mapBounds.minZ, 12, 8),
    new THREE.MeshLambertMaterial({ color: 0x263924 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.02, 0);
  scene.add(ground);

  for (const zone of zones) {
    const marker = new THREE.Mesh(
      new THREE.PlaneGeometry(zone.size.x, zone.size.z),
      new THREE.MeshBasicMaterial({ color: zone.color, transparent: true, opacity: 0.16, depthWrite: false })
    );
    marker.rotation.x = -Math.PI / 2;
    marker.position.copy(zone.center);
    scene.add(marker);
  }

  for (const collider of colliders) {
    const width = collider.maxX - collider.minX;
    const depth = collider.maxZ - collider.minZ;
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(width, collider.height, depth),
      new THREE.MeshLambertMaterial({ color: getColliderColor(collider.kind) })
    );
    mesh.position.set(collider.minX + width / 2, collider.height / 2, collider.minZ + depth / 2);
    scene.add(mesh);
    addColliderTrim(scene, mesh.position.x, mesh.position.z, width, depth, collider.height, collider.kind);
  }

  addForestTownDetails(scene);
  addTreeLine(scene);
}

function getColliderColor(kind: "wall" | "cover" | "gate"): number {
  if (kind === "cover") {
    return 0x3f4633;
  }

  if (kind === "gate") {
    return 0x343b40;
  }

  return 0x5d5749;
}

function addColliderTrim(scene: THREE.Scene, x: number, z: number, width: number, depth: number, height: number, kind: "wall" | "cover" | "gate"): void {
  const trimColor = kind === "gate" ? 0x1e2a31 : 0x4b5148;
  const trim = new THREE.Mesh(new THREE.BoxGeometry(width + 0.04, 0.08, depth + 0.04), new THREE.MeshLambertMaterial({ color: trimColor }));
  trim.position.set(x, height + 0.04, z);
  scene.add(trim);

  if (kind === "cover") {
    const strap = new THREE.Mesh(new THREE.BoxGeometry(width + 0.08, 0.06, Math.min(depth, 0.12)), new THREE.MeshLambertMaterial({ color: 0x2f3430 }));
    strap.position.set(x, height * 0.62, z);
    scene.add(strap);
  }
}

function addForestTownDetails(scene: THREE.Scene): void {
  const props = [
    [-8.4, 0.42, 3.1, 2.8, 0.84, 1.7, 0x263745],
    [8.4, 0.42, -3.1, 2.8, 0.84, 1.7, 0x4a302d],
    [-13.5, 0.5, -15.4, 4.8, 1.0, 0.8, 0x5a4631],
    [12.4, 0.48, -8.1, 4.2, 0.95, 0.7, 0x654f34],
    [4.8, 0.55, 9.1, 3.8, 1.1, 1.2, 0x37454a],
    [-1.4, 0.32, 4.9, 2.2, 0.64, 0.42, 0x6a6351],
    [1.4, 0.32, 4.9, 2.2, 0.64, 0.42, 0x6a6351]
  ] as const;

  for (const [x, y, z, w, h, d, color] of props) {
    const prop = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }));
    prop.position.set(x, y, z);
    scene.add(prop);
  }

  const roads = [
    [0, -4, 9, 37],
    [0, 5, 40, 7],
    [-14, -2, 5, 19],
    [14, 2, 5, 19]
  ] as const;
  for (const [x, z, w, d] of roads) {
    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(w, d),
      new THREE.MeshBasicMaterial({ color: 0x252827, transparent: true, opacity: 0.64, depthWrite: false })
    );
    road.rotation.x = -Math.PI / 2;
    road.position.set(x, 0.012, z);
    scene.add(road);
  }

  addRuinedCityDetails(scene);
}

function addTreeLine(scene: THREE.Scene): void {
  const treePositions = [
    [-32, -23], [-24, -25], [-11, -25], [9, -25], [24, -24], [32, -20],
    [-33, -10], [-32, 4], [-33, 18], [-25, 24], [-9, 25], [8, 25], [23, 24], [32, 18],
    [33, 5], [32, -8], [-18, 22], [18, -23], [-28, 6], [27, -4]
  ] as const;
  const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x352719 });
  const crownMaterial = new THREE.MeshLambertMaterial({ color: 0x18331e });

  for (const [x, z] of treePositions) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 1.6, 5), trunkMaterial);
    trunk.position.set(x, 0.8, z);
    const crown = new THREE.Mesh(new THREE.ConeGeometry(1.15, 2.9, 6), crownMaterial);
    crown.position.set(x, 2.6, z);
    scene.add(trunk, crown);
  }
}

function addRuinedCityDetails(scene: THREE.Scene): void {
  const ash = new THREE.MeshLambertMaterial({ color: 0x1f2220 });
  const rust = new THREE.MeshLambertMaterial({ color: 0x6a3c24 });
  const ember = new THREE.MeshBasicMaterial({ color: 0xff6c2d, transparent: true, opacity: 0.84 });
  const vine = new THREE.MeshLambertMaterial({ color: 0x243b22 });

  const rubble = [
    [-3.5, 0.12, 2.7, 1.2, 0.24, 0.8, 0.25],
    [3.2, 0.1, 1.2, 1.6, 0.2, 0.7, -0.35],
    [-18.4, 0.14, -8.4, 1.8, 0.28, 0.9, 0.2],
    [20.8, 0.13, 7.8, 1.5, 0.26, 1.1, -0.12],
    [7.5, 0.1, -11.5, 1.7, 0.2, 0.6, 0.45]
  ] as const;
  for (const [x, y, z, w, h, d, rot] of rubble) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), ash);
    mesh.position.set(x, y, z);
    mesh.rotation.y = rot;
    scene.add(mesh);
  }

  const wrecks = [
    [-8.6, 0.34, 3.0, 0.2],
    [8.4, 0.34, -3.1, -0.25],
    [10.2, 0.34, 9.4, 0.7]
  ] as const;
  for (const [x, y, z, rot] of wrecks) {
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.42, 0.9), rust);
    body.position.set(x, y, z);
    body.rotation.y = rot;
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.36, 0.72), ash);
    cabin.position.set(x - Math.sin(rot) * 0.12, y + 0.36, z - Math.cos(rot) * 0.12);
    cabin.rotation.y = rot;
    scene.add(body, cabin);
  }

  const fires = [
    [-2.2, 0.04, 4.2],
    [13.4, 0.04, -13.6],
    [-22.5, 0.04, 12.5]
  ] as const;
  for (const [x, y, z] of fires) {
    const glow = new THREE.Mesh(new THREE.CircleGeometry(0.48, 8), ember);
    glow.rotation.x = -Math.PI / 2;
    glow.position.set(x, y + 0.018, z);
    const light = new THREE.PointLight(0xff6c2d, 0.65, 10, 2);
    light.position.set(x, 1.1, z);
    scene.add(glow, light);
  }

  const vines = [
    [-20, 1.65, 1.2, 0.08, 1.7, 0.08],
    [20.5, 1.45, -0.5, 0.08, 1.55, 0.08],
    [-1.5, 0.08, -11.5, 5.6, 0.08, 0.12],
    [5.3, 0.08, 17.4, 4.2, 0.08, 0.12]
  ] as const;
  for (const [x, y, z, w, h, d] of vines) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), vine);
    mesh.position.set(x, y, z);
    scene.add(mesh);
  }
}

function createWeapon(weapon: WeaponId): THREE.Group {
  const group = new THREE.Group();
  group.name = `viewmodel:${weapon}`;
  const skin = new THREE.MeshLambertMaterial({ color: 0xd0a88a });
  const glove = new THREE.MeshLambertMaterial({ color: 0x1f2529 });
  const metal = new THREE.MeshLambertMaterial({ color: 0x202326 });
  const dark = new THREE.MeshLambertMaterial({ color: 0x111315 });
  const accent = new THREE.MeshLambertMaterial({ color: 0x9aa8a8 });

  const leftHand = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.14, 0.28), glove);
  leftHand.position.set(weapon === "knife" ? -0.12 : 0.12, -0.32, -0.54);
  const rightHand = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.14, 0.3), skin);
  rightHand.position.set(0.38, -0.34, -0.45);
  group.add(leftHand, rightHand);

  if (weapon === "knife") {
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.42), dark);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.025, 0.76), accent);
    handle.position.set(0.26, -0.26, -0.58);
    blade.position.set(0.23, -0.2, -0.98);
    blade.rotation.x = -0.2;
    group.add(handle, blade);
    return group;
  }

  const dimensions = {
    pistol: { body: [0.22, 0.15, 0.34], barrel: [0.075, 0.065, 0.26], stock: [0.12, 0.2, 0.09], scope: false },
    rifle: { body: [0.18, 0.16, 0.82], barrel: [0.055, 0.055, 0.72], stock: [0.24, 0.18, 0.32], scope: false },
    sniper: { body: [0.18, 0.16, 1.0], barrel: [0.045, 0.045, 1.05], stock: [0.26, 0.18, 0.36], scope: true }
  }[weapon];

  const body = new THREE.Mesh(new THREE.BoxGeometry(dimensions.body[0], dimensions.body[1], dimensions.body[2]), metal);
  const barrel = new THREE.Mesh(new THREE.BoxGeometry(dimensions.barrel[0], dimensions.barrel[1], dimensions.barrel[2]), dark);
  const magazine = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.32, 0.16), dark);
  const stock = new THREE.Mesh(new THREE.BoxGeometry(dimensions.stock[0], dimensions.stock[1], dimensions.stock[2]), dark);
  body.position.set(0.34, -0.26, -0.58);
  barrel.position.set(0.34, -0.25, weapon === "pistol" ? -0.82 : -1.14);
  magazine.position.set(0.33, weapon === "pistol" ? -0.43 : -0.48, weapon === "pistol" ? -0.5 : -0.48);
  magazine.scale.set(weapon === "pistol" ? 0.75 : 1, weapon === "pistol" ? 0.62 : 1, weapon === "pistol" ? 0.8 : 1);
  magazine.rotation.x = weapon === "rifle" ? -0.18 : 0;
  stock.position.set(0.34, -0.26, weapon === "pistol" ? -0.3 : -0.12);
  group.add(body, barrel, magazine);
  if (weapon !== "pistol") {
    group.add(stock);
  }

  if (dimensions.scope) {
    const scope = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.42), new THREE.MeshLambertMaterial({ color: 0x111820 }));
    scope.position.set(0.34, -0.12, -0.58);
    group.add(scope);
  }

  return group;
}

function updateMovement(
  camera: THREE.PerspectiveCamera,
  keys: Set<string>,
  velocity: THREE.Vector3,
  wishVelocity: THREE.Vector3,
  forward: THREE.Vector3,
  right: THREE.Vector3,
  delta: number
): ActionState["kind"] {
  forward.set(0, 0, -1).applyQuaternion(camera.quaternion);
  forward.y = 0;
  forward.normalize();
  right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
  wishVelocity.set(0, 0, 0);

  const strafeLeft = keys.has("KeyA");
  const strafeRight = keys.has("KeyD");
  if (keys.has("KeyW")) wishVelocity.add(forward);
  if (keys.has("KeyS")) wishVelocity.sub(forward);
  if (strafeRight) wishVelocity.add(right);
  if (strafeLeft) wishVelocity.sub(right);

  const running = keys.has("ShiftLeft") || keys.has("ShiftRight");
  const targetSpeed = maxMoveSpeed * (running ? 1.22 : 1);

  if (wishVelocity.lengthSq() > 0) {
    wishVelocity.normalize().multiplyScalar(targetSpeed);
    velocity.x = THREE.MathUtils.lerp(velocity.x, wishVelocity.x, Math.min(1, acceleration * delta));
    velocity.z = THREE.MathUtils.lerp(velocity.z, wishVelocity.z, Math.min(1, acceleration * delta));
  } else {
    const damp = Math.exp(-friction * delta);
    velocity.x *= damp;
    velocity.z *= damp;
    if (Math.hypot(velocity.x, velocity.z) < 0.02) {
      velocity.set(0, 0, 0);
    }
  }

  if (wishVelocity.lengthSq() === 0 && Math.hypot(velocity.x, velocity.z) > 0.01) {
    velocity.x *= 1 + airControl * delta;
    velocity.z *= 1 + airControl * delta;
  }

  const dx = velocity.x * delta;
  const dz = velocity.z * delta;
  moveAxis(camera.position, dx, 0);
  moveAxis(camera.position, 0, dz);

  if (wishVelocity.lengthSq() === 0) {
    return keys.has("ControlLeft") || keys.has("ControlRight") ? "crouch" : "idle";
  }
  if (strafeLeft && !keys.has("KeyW")) return "strafe-left";
  if (strafeRight && !keys.has("KeyW")) return "strafe-right";
  return running ? "run" : "walk";
}

function moveAxis(position: THREE.Vector3, dx: number, dz: number): void {
  const nextX = THREE.MathUtils.clamp(position.x + dx, mapBounds.minX + 1.3, mapBounds.maxX - 1.3);
  const nextZ = THREE.MathUtils.clamp(position.z + dz, mapBounds.minZ + 1.3, mapBounds.maxZ - 1.3);

  if (!intersectsCollider(nextX, nextZ)) {
    position.x = nextX;
    position.z = nextZ;
  }
}

function intersectsCollider(x: number, z: number): boolean {
  return colliders.some(
    (collider) =>
      x + playerRadius > collider.minX &&
      x - playerRadius < collider.maxX &&
      z + playerRadius > collider.minZ &&
      z - playerRadius < collider.maxZ
  );
}

function updateWeapon(weapon: THREE.Group, now: number, action: ActionState, weaponId: WeaponId): void {
  const elapsed = now - action.startedAt;
  const bob = action.kind === "run" ? 0.022 : action.kind === "walk" ? 0.012 : 0.005;
  const recoil = action.kind === "shoot" ? Math.max(0, 1 - elapsed / 180) : 0;
  const slash = action.kind === "knife" ? Math.sin(Math.min(Math.PI, elapsed / 230)) : 0;
  const reload = action.kind === "reload" ? Math.sin(Math.min(Math.PI, elapsed / 650)) : 0;
  const crouch = action.kind === "crouch" ? 0.08 : 0;
  const jump = action.kind === "jump" ? Math.sin(Math.min(Math.PI, elapsed / 420)) * 0.06 : 0;
  const strafe = action.kind === "strafe-left" ? -0.035 : action.kind === "strafe-right" ? 0.035 : 0;
  const weight = weaponId === "sniper" ? 1.35 : weaponId === "rifle" ? 1.1 : 0.85;

  weapon.position.x = strafe + Math.sin(now * 0.006) * bob;
  weapon.position.y = -crouch + jump + Math.cos(now * 0.005) * bob * 0.7 - reload * 0.08;
  weapon.position.z = -recoil * 0.18 * weight - slash * 0.22;
  weapon.rotation.x = reload * -0.45 + recoil * 0.08;
  weapon.rotation.y = slash * -0.75 + strafe * -0.8;
  weapon.rotation.z = reload * 0.22 + slash * 0.35;
}

function syncBots(
  scene: THREE.Scene,
  botMeshes: Map<string, THREE.Group>,
  state: GameState | null,
  tracers: THREE.Line[],
  botShotSeen: Map<string, number>
): void {
  if (!state) {
    return;
  }

  const activeIds = new Set<string>();

  for (const player of state.players) {
    if (player.kind !== "bot") {
      continue;
    }

    activeIds.add(player.id);
    const mesh = getBotMesh(scene, botMeshes, player);
    mesh.visible = true;
    mesh.position.lerp(new THREE.Vector3(player.position.x, 0, player.position.z), 0.38);
    mesh.rotation.y = lerpAngle(mesh.rotation.y, player.yaw + Math.PI, 0.28);
    animateCharacter(mesh, player, performance.now());

    if ((player.animation === "shoot" || player.animation === "knife") && player.lastActionAt > (botShotSeen.get(player.id) ?? 0)) {
      botShotSeen.set(player.id, player.lastActionAt);
      if (player.animation === "shoot" && state.serverTime - player.lastActionAt < 450) {
        addBotShotVisual(scene, tracers, mesh, player);
      }
    }
  }

  for (const [id, mesh] of botMeshes) {
    if (!activeIds.has(id)) {
      scene.remove(mesh);
      botMeshes.delete(id);
      botShotSeen.delete(id);
    }
  }
}

function addBotShotVisual(scene: THREE.Scene, tracers: THREE.Line[], mesh: THREE.Group, player: PlayerState): void {
  const muzzleLocal = new THREE.Vector3(0.08, 1.18, -1.18);
  mesh.updateMatrixWorld();
  const muzzleWorld = muzzleLocal.clone().applyMatrix4(mesh.matrixWorld);
  const direction = new THREE.Vector3(Math.sin(player.yaw), 0.02, Math.cos(player.yaw)).normalize();
  const end = muzzleWorld.clone().add(direction.multiplyScalar(player.weapon === "sniper" ? 18 : 11));
  addTracer(scene, tracers, muzzleWorld, end);

  const flash = new THREE.Mesh(
    new THREE.ConeGeometry(0.09, player.weapon === "sniper" ? 0.45 : 0.3, 6),
    new THREE.MeshBasicMaterial({ color: 0xffc65a, transparent: true, opacity: 0.95 })
  );
  flash.name = "botMuzzleFlash";
  flash.rotation.x = Math.PI / 2;
  flash.position.copy(muzzleLocal);
  mesh.add(flash);
  window.setTimeout(() => {
    mesh.remove(flash);
    flash.geometry.dispose();
    disposeMaterial(flash.material);
  }, 55);
}

function spawnParticles(scene: THREE.Scene, particles: THREE.Mesh[], origin: THREE.Vector3, color: number, count = 8): void {
  for (let index = 0; index < count; index += 1) {
    const particle = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.045, 0.045), new THREE.MeshBasicMaterial({ color }));
    particle.position.copy(origin);
    particle.userData.velocity = new THREE.Vector3((Math.random() - 0.5) * 0.08, Math.random() * 0.08, (Math.random() - 0.5) * 0.08);
    particle.userData.life = 1;
    scene.add(particle);
    particles.push(particle);
  }
}

function spawnMuzzleFlash(weapon: THREE.Group, weaponId: WeaponId): void {
  if (weaponId === "knife") {
    return;
  }

  const flash = new THREE.Mesh(
    new THREE.ConeGeometry(0.07, weaponId === "sniper" ? 0.42 : 0.28, 6),
    new THREE.MeshBasicMaterial({ color: 0xffd36a, transparent: true, opacity: 0.9 })
  );
  flash.name = "muzzleFlash";
  flash.rotation.x = Math.PI / 2;
  flash.position.set(0.34, -0.25, weaponId === "pistol" ? -1.16 : -1.66);
  weapon.add(flash);
  window.setTimeout(() => {
    weapon.remove(flash);
    flash.geometry.dispose();
    disposeMaterial(flash.material);
  }, 45);
}

function getLocalWeapon(state: GameState | null): WeaponId {
  return state?.players.find((player) => player.id === "player")?.loadout.equipped ?? state?.players.find((player) => player.id === "player")?.weapon ?? "pistol";
}

function isLocalPlayerAlive(state: GameState | null): boolean {
  return state?.players.find((player) => player.id === "player")?.alive ?? true;
}

function updateOverviewCamera(camera: THREE.PerspectiveCamera, now: number): void {
  const heightPulse = Math.sin(now * 0.0004) * 0.8;
  const target = new THREE.Vector3(0, 52 + heightPulse, 0);
  camera.position.lerp(target, 0.035);
  camera.rotation.set(-Math.PI / 2, 0, 0, "YXZ");
}

function updateDeathFeedback(mount: HTMLDivElement, camera: THREE.PerspectiveCamera, state: GameState | null, now: number): void {
  const player = state?.players.find((candidate) => candidate.id === "player");
  const dead = Boolean(player && !player.alive);
  mount.classList.toggle("death-view", dead);

  if (!dead || !player) {
    return;
  }

  const elapsed = now - player.lastActionAt;
  const progress = THREE.MathUtils.smoothstep(THREE.MathUtils.clamp(elapsed / 2300, 0, 1), 0, 1);
  camera.position.y = THREE.MathUtils.lerp(camera.position.y, THREE.MathUtils.lerp(playerHeight, 0.32, progress), 0.08);
  camera.rotation.x = THREE.MathUtils.lerp(camera.rotation.x, 0.32, 0.025 + progress * 0.03);
  camera.rotation.z = THREE.MathUtils.lerp(camera.rotation.z, 1.05, 0.035 + progress * 0.035);
}

function syncLocalPlayerCamera(
  camera: THREE.PerspectiveCamera,
  state: GameState | null,
  wasAlive: boolean,
  roundChanged: boolean,
  onRespawn: () => void
): void {
  const player = state?.players.find((candidate) => candidate.id === "player");

  if (!state || !player) {
    return;
  }

  if (player.alive && (!wasAlive || roundChanged)) {
    camera.position.set(player.position.x, playerHeight, player.position.z);
    camera.rotation.set(0, 0, 0, "YXZ");
    onRespawn();
  }
}

function updateParticles(scene: THREE.Scene, particles: THREE.Mesh[]): void {
  for (let index = particles.length - 1; index >= 0; index -= 1) {
    const particle = particles[index];
    const velocity = particle.userData.velocity as THREE.Vector3;
    particle.position.add(velocity);
    particle.userData.life -= 0.055;
    particle.scale.setScalar(Math.max(0.1, particle.userData.life));

    if (particle.userData.life <= 0) {
      scene.remove(particle);
      particle.geometry.dispose();
      disposeMaterial(particle.material);
      particles.splice(index, 1);
    }
  }
}

function addTracer(scene: THREE.Scene, tracers: THREE.Line[], from: THREE.Vector3, to: THREE.Vector3): void {
  const geometry = new THREE.BufferGeometry().setFromPoints([from.clone(), to.clone()]);
  const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.85 }));
  line.userData.life = 1;
  scene.add(line);
  tracers.push(line);
  while (tracers.length > 16) {
    const old = tracers.shift();
    if (old) {
      scene.remove(old);
      old.geometry.dispose();
      disposeMaterial(old.material);
    }
  }
}

function updateTracers(tracers: THREE.Line[]): void {
  for (let index = tracers.length - 1; index >= 0; index -= 1) {
    const tracer = tracers[index];
    tracer.userData.life -= 0.12;
    const material = tracer.material as THREE.LineBasicMaterial;
    material.opacity = Math.max(0, tracer.userData.life);
    if (tracer.userData.life <= 0) {
      tracer.parent?.remove(tracer);
      tracer.geometry.dispose();
      material.dispose();
      tracers.splice(index, 1);
    }
  }
}

function updateCameraBob(camera: THREE.PerspectiveCamera, velocity: THREE.Vector3, now: number): void {
  const speed = Math.hypot(velocity.x, velocity.z);
  const bob = speed > 0.5 ? Math.sin(now * 0.012) * 0.04 * Math.min(1, speed / 4) : 0;
  camera.position.y = playerHeight + bob;
}

function applyScreenShake(camera: THREE.PerspectiveCamera, now: number, shakeUntil: number, strength: number): void {
  if (now >= shakeUntil) {
    camera.rotation.z = THREE.MathUtils.lerp(camera.rotation.z, 0, 0.15);
    return;
  }
  const t = (shakeUntil - now) / 140;
  camera.rotation.z = (Math.random() - 0.5) * strength * t * 4;
}

function updateAiDebug(panel: HTMLDivElement | null, state: GameState | null): void {
  if (!panel || panel.hidden || !state) {
    return;
  }

  const lines = state.agents.slice(0, 8).map((agent) => {
    const player = state.players.find((candidate) => candidate.id === agent.playerId);
    return `${player?.name ?? agent.playerId}: ${agent.brain.state} → ${agent.brain.targetNavPointId} | conf ${agent.brain.combatConfidence.toFixed(2)} vis ${agent.perception.visibilityScore.toFixed(2)}`;
  });

  const events = state.combatEvents
    .slice(-4)
    .map((event) => `${event.type} @ ${Math.round(event.at % 100000)}`)
    .join("\n");

  panel.textContent = `AI DEBUG (L)\n${lines.join("\n")}\n--- events ---\n${events}`;
}

function getBotMesh(scene: THREE.Scene, botMeshes: Map<string, THREE.Group>, player: PlayerState): THREE.Group {
  const existing = botMeshes.get(player.id);

  if (existing) {
    return existing;
  }

  const group = createCharacter(player.team);
  group.name = `${botMeshNamePrefix}${player.id}`;
  scene.add(group);
  botMeshes.set(player.id, group);
  return group;
}

function createCharacter(team: TeamId): THREE.Group {
  const group = new THREE.Group();
  const palette = team === "CT"
    ? { cloth: 0x1f3345, vest: 0x101820, accent: 0x3f82d2, skin: 0xb58b72, gear: 0x242b30 }
    : { cloth: 0x6f6246, vest: 0x39472d, accent: 0xb7864d, skin: 0xb48a66, gear: 0x2d2720 };
  const cloth = new THREE.MeshLambertMaterial({ color: palette.cloth });
  const vest = new THREE.MeshLambertMaterial({ color: palette.vest });
  const accent = new THREE.MeshLambertMaterial({ color: palette.accent });
  const skin = new THREE.MeshLambertMaterial({ color: palette.skin });
  const gear = new THREE.MeshLambertMaterial({ color: palette.gear });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.82, 0.34), cloth);
  torso.position.set(0, 1.08, 0);
  const armor = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.55, 0.38), vest);
  armor.position.set(0, 1.13, -0.02);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.34, 0.34), skin);
  head.position.set(0, 1.72, 0);
  const helmet = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.18, 0.38), gear);
  helmet.position.set(0, 1.94, 0);
  const mask = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.16, 0.08), team === "CT" ? gear : accent);
  mask.position.set(0, 1.66, -0.17);
  const radio = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.28, 0.08), gear);
  radio.position.set(-0.42, 1.22, 0.02);

  const limbs = [
    ["armL", -0.49, 1.18, -0.04, 0.18, 0.68, 0.18, cloth],
    ["armR", 0.49, 1.18, -0.04, 0.18, 0.68, 0.18, cloth],
    ["legL", -0.18, 0.43, 0, 0.2, 0.76, 0.2, cloth],
    ["legR", 0.18, 0.43, 0, 0.2, 0.76, 0.2, cloth]
  ] as const;

  group.add(torso, armor, head, helmet, mask, radio);
  for (const [name, x, y, z, w, h, d, material] of limbs) {
    const limb = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    limb.name = name;
    limb.position.set(x, y, z);
    group.add(limb);
  }

  const weapon = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.92), new THREE.MeshLambertMaterial({ color: 0x16191b }));
  weapon.name = "heldWeapon";
  weapon.position.set(0.06, 1.16, -0.82);
  weapon.rotation.x = -0.04;
  group.add(weapon);

  const badge = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.04), accent);
  badge.position.set(0.22, 1.28, -0.2);
  group.add(badge);
  return group;
}

function animateCharacter(group: THREE.Group, player: PlayerState, now: number): void {
  const phase = now * 0.006 + player.position.x * 0.2 + player.position.z * 0.1;
  const moving = player.animation === "walk" || player.animation === "run" || player.animation === "strafe_left" || player.animation === "strafe_right";
  const velocity = Math.hypot(player.velocity.x, player.velocity.z);
  const speed = player.alive && moving ? Math.sin(phase) * (player.animation === "run" ? 1.35 : 0.9 + velocity * 1.8) : 0;
  const shooting = player.animation === "shoot" || player.animation === "knife";
  const hit = player.animation === "hit";
  group.position.y = player.alive ? Math.abs(speed) * 0.035 : 0;
  if (!player.alive) {
    group.rotation.x = THREE.MathUtils.lerp(group.rotation.x, -Math.PI / 2, 0.06);
    group.rotation.z = THREE.MathUtils.lerp(group.rotation.z, (Math.random() - 0.5) * 0.3, 0.04);
  } else {
    group.rotation.x = THREE.MathUtils.lerp(group.rotation.x, 0, 0.12);
    group.rotation.z = hit ? 0.12 : THREE.MathUtils.lerp(group.rotation.z, 0, 0.1);
  }
  for (const child of group.children) {
    if (child.name === "armL") {
      child.position.set(-0.28, 1.18, -0.36);
      child.rotation.x = -1.12 + speed * 0.08;
      child.rotation.z = -0.22;
    }
    if (child.name === "armR") {
      child.position.set(0.28, 1.14, -0.42);
      child.rotation.x = -1.22 + (shooting ? -0.22 : speed * 0.06);
      child.rotation.z = 0.2;
    }
    if (child.name === "legR") child.rotation.x = speed * 0.38;
    if (child.name === "legL") child.rotation.x = -speed * 0.38;
    if (child.name === "heldWeapon") {
      child.position.set(0.06, 1.16 + Math.abs(speed) * 0.01, shooting ? -0.88 : -0.82);
      child.rotation.x = shooting ? -0.12 : -0.04;
      child.rotation.y = 0;
      child.rotation.z = 0;
    }
  }
}

function lerpAngle(current: number, target: number, alpha: number): number {
  return current + Math.atan2(Math.sin(target - current), Math.cos(target - current)) * alpha;
}

function addShotMark(scene: THREE.Scene, marks: THREE.Mesh[], point: THREE.Vector3): void {
  const mark = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 6, 4),
    new THREE.MeshBasicMaterial({ color: 0xffef8a })
  );
  mark.position.copy(point);
  scene.add(mark);
  marks.push(mark);

  while (marks.length > 12) {
    const oldMark = marks.shift();

    if (oldMark) {
      scene.remove(oldMark);
    }
  }
}

function clearShotMarks(scene: THREE.Scene, marks: THREE.Mesh[]): void {
  while (marks.length > 0) {
    const mark = marks.pop();
    if (mark) {
      scene.remove(mark);
      mark.geometry.dispose();
      disposeMaterial(mark.material);
    }
  }
}

function updateHitFlash(mount: HTMLDivElement, active: boolean): void {
  mount.classList.toggle("hit-flash", active);
}

function disposeMaterial(material: THREE.Material | THREE.Material[]): void {
  if (Array.isArray(material)) {
    for (const item of material) {
      item.dispose();
    }
    return;
  }

  material.dispose();
}

function disposeObject(object: THREE.Object3D): void {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }
    if (mesh.material) {
      disposeMaterial(mesh.material);
    }
  });
}
