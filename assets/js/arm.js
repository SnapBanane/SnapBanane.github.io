/* Robot arm in 3D: scroll -> damped progress -> keyframed gripper target -> yaw + two-link IK -> joint rotations.
   Model: assets/models/robot-arm.glb, converted from the STEP file; one node per part, all in world space (metres, y up, arm faces +z). */
import * as THREE from 'three';
import { toCreasedNormals } from '../vendor/BufferGeometryUtils.js';
import { RoomEnvironment } from '../vendor/RoomEnvironment.js';

const scene = document.getElementById('armScene'), canvas = document.getElementById('arm3d'), $ = id => document.getElementById(id);
const caps = [...scene.querySelectorAll('.arm-cap')];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v)), deg = r => r * 180 / Math.PI, rad = d => d * Math.PI / 180;
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

// joint pivots measured from the model (y, z in metres), rotation axes: base about y, the rest about x
const SH = [.0856, .0836], EL = [.2229, -.0257], WR = [.2496, .1541];
const L1 = Math.hypot(EL[0] - SH[0], EL[1] - SH[1]), L2 = Math.hypot(WR[0] - EL[0], WR[1] - EL[1]);
const PHI1 = Math.atan2(EL[0] - SH[0], EL[1] - SH[1]), PHI2 = Math.atan2(WR[0] - EL[0], WR[1] - EL[1]);
// point between the finger teeth, measured from the wrist pivot: down, sideways (the gripper sits off the arm's centre plane), forward
const GRIP = .1146, PX = .0161, PZ = .003, TEETH_GAP = .017;          // gap between the teeth in the model's rest pose
const FLOOR = -.0345, BALL_R = .0095, STAND_H = .05;
const BALL_Y = FLOOR + BALL_R, STAND_Y = FLOOR + STAND_H + BALL_R, PICK = 55, PLACE = -55, REACH = .2;
// progress, base yaw (deg), reach (m), height (m), grip (0 open .. 1 closed)
const K = [[0, 18, .17, .13, 0], [.18, PICK, REACH, BALL_Y + .06, 0], [.28, PICK, REACH, BALL_Y, 0], [.36, PICK, REACH, BALL_Y, 1],
           [.5, 20, .17, .14, 1], [.64, PLACE, REACH, STAND_Y + .05, 1], [.76, PLACE, REACH, STAND_Y, 1], [.82, PLACE, REACH, STAND_Y, 0], [1, -22, .16, .14, 0]];

async function loadParts(url) {                                        // tiny GLB reader: this file only has positions + indices
    const buf = await (await fetch(url)).arrayBuffer(), dv = new DataView(buf);
    const jlen = dv.getUint32(12, true), gl = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 20, jlen))), bin = 20 + jlen + 8;
    const read = (a, T) => { const acc = gl.accessors[a], v = gl.bufferViews[acc.bufferView]; return new T(buf.slice(bin + v.byteOffset, bin + v.byteOffset + v.byteLength)); };
    return gl.meshes.map(m => {
        const p = m.primitives[0], g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(read(p.attributes.POSITION, Float32Array), 3));
        g.setIndex(new THREE.BufferAttribute(read(p.indices, Uint32Array), 1));
        return toCreasedNormals(g, rad(32));
    });
}

function solve(r, y) {                                                 // planar two-link IK, elbow up
    const wz = r - PZ, wy = y + GRIP, dz = wz - SH[1], dy = wy - SH[0];
    const d = clamp(Math.hypot(dz, dy), Math.abs(L1 - L2) + 1e-4, L1 + L2 - 1e-4), a = Math.atan2(dy, dz);
    const b = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
    let best;
    for (const A1 of [a + b, a - b]) {
        const ey = SH[0] + L1 * Math.sin(A1), ez = SH[1] + L1 * Math.cos(A1);
        if (!best || ey > best.ey) best = { A1, ey, A2: Math.atan2(wy - ey, wz - ez) };
    }
    const s = PHI1 - best.A1, e = PHI2 - best.A2 - s;                 // rotation.x turns a direction angle by -theta
    return { s, e, w: -(s + e), A1: best.A1, A2: best.A2 };
}

try {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.05;   // neutral keeps the white paint white without ACES clipping it flat
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const world = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    world.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture; world.environmentIntensity = .7;
    const key = new THREE.DirectionalLight(0xfff4e8, 2.2); key.position.set(.5, 1.1, .7); key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 6; key.shadow.bias = -.0004; key.shadow.normalBias = .002;
    Object.assign(key.shadow.camera, { left: -.45, right: .45, top: .45, bottom: -.45, near: .1, far: 3 });
    const rim = new THREE.DirectionalLight(0xffb27a, 1.6); rim.position.set(-.8, .5, -.9);
    const fill = new THREE.DirectionalLight(0x9fb4ff, .35); fill.position.set(-.6, .2, .8);
    world.add(key, rim, fill);

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), new THREE.ShadowMaterial({ opacity: .55 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = FLOOR; floor.receiveShadow = true; world.add(floor);

    const paint = new THREE.MeshPhysicalMaterial({ color: 0xe6e4df, roughness: .5, clearcoat: .6, clearcoatRoughness: .22 });
    const alu = new THREE.MeshPhysicalMaterial({ color: 0xd2d0cb, metalness: 1, roughness: .42 });   // satin, so the studio boxes don't show as blotches
    const graphite = new THREE.MeshPhysicalMaterial({ color: 0x222225, metalness: .25, roughness: .55, clearcoat: .35, clearcoatRoughness: .3 });
    const orange = new THREE.MeshPhysicalMaterial({ color: 0xff7a2a, roughness: .35, clearcoat: .8, clearcoatRoughness: .1 });
    const MAT = [graphite, paint, alu, paint, alu, graphite, alu, alu, graphite];   // base, turret, upper arm, elbow, fork, gripper, fingers x2, wrist

    // joint hierarchy; each group sits on its pivot, meshes are shifted back so world-space vertices line up
    const at = (g, abs, parentAbs) => { g.position.set(abs[0] - parentAbs[0], abs[1] - parentAbs[1], abs[2] - parentAbs[2]); return g; };
    const O = [0, 0, 0], pS = [0, SH[0], SH[1]], pE = [0, EL[0], EL[1]], pW = [0, WR[0], WR[1]];
    const base = new THREE.Group(), yaw = new THREE.Group(), sh = at(new THREE.Group(), pS, O), el = at(new THREE.Group(), pE, pS), wr = at(new THREE.Group(), pW, pE);
    base.add(yaw); yaw.add(sh); sh.add(el); el.add(wr); world.add(base);
    const host = [base, yaw, sh, el, el, wr, wr, wr, wr], hostAbs = [O, O, pS, pE, pE, pW, pW, pW, pW];

    const geos = await loadParts('assets/models/robot-arm.glb');
    const parts = geos.map((g, i) => {
        const m = new THREE.Mesh(g, MAT[i]); m.castShadow = m.receiveShadow = true;
        const o = hostAbs[i]; m.position.set(-o[0], -o[1], -o[2]); host[i].add(m); return m;
    });
    const fingerRest = [parts[6].position.z, parts[7].position.z];

    const ball = new THREE.Mesh(new THREE.SphereGeometry(BALL_R, 48, 32), orange); ball.castShadow = true; world.add(ball);
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(.018, .024, STAND_H - .004, 48), graphite);
    const standCap = new THREE.Mesh(new THREE.CylinderGeometry(.022, .022, .004, 48), alu);
    // where the pinch point lands for a base angle, reach and height (includes the gripper's sideways offset)
    const polar = (deg_, r, y) => { const c = Math.cos(rad(deg_)), n = Math.sin(rad(deg_)); return new THREE.Vector3(PX * c + r * n, y, -PX * n + r * c); };
    stand.position.copy(polar(PLACE, REACH, FLOOR + (STAND_H - .004) / 2)); standCap.position.copy(polar(PLACE, REACH, FLOOR + STAND_H - .002));
    stand.castShadow = stand.receiveShadow = standCap.castShadow = true; world.add(stand, standCap);
    const pinch = new THREE.Object3D(); pinch.position.set(PX, -GRIP, PZ); wr.add(pinch);

    const camera = new THREE.PerspectiveCamera(26, 1, .05, 10), look = new THREE.Vector3(0, .14, .03), lift = () => camera.aspect >= 1 ? .06 : 0       // aimed above the arm so it sits low, under the captions;
    function size() {
        const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return;
        renderer.setSize(w, h, false); camera.aspect = w / h;
        const R = camera.aspect >= 1 ? .37 : .25;                       // landscape needs room for captions above and the readout below
        const fit = R / Math.tan(rad(camera.fov / 2)) / Math.min(1, camera.aspect * .85);
        camera.userData.dist = fit; camera.updateProjectionMatrix();
    }

    let target = 0, shown = 0, last = 0, running = false;
    const tmp = new THREE.Vector3();
    function pose(p) {
        let i = 1; while (i < K.length - 1 && p > K[i][0]) i++;
        const a = K[i - 1], b = K[i], t = ease(clamp((p - a[0]) / (b[0] - a[0]))), mix = j => a[j] + (b[j] - a[j]) * t;
        const yawDeg = mix(1), r = mix(2), y = mix(3), grip = mix(4), ik = solve(r, y);
        yaw.rotation.y = rad(yawDeg); sh.rotation.x = ik.s; el.rotation.x = ik.e; wr.rotation.x = ik.w;
        const open = (2 * BALL_R - TEETH_GAP) / 2 + .005 * (1 - grip);  // closed: teeth just touch the ball; open: 5 mm of clearance each side
        parts[6].position.z = fingerRest[0] + open; parts[7].position.z = fingerRest[1] - open;

        world.updateMatrixWorld(true);
        const held = p >= .36 && p < .82;
        if (held) pinch.getWorldPosition(ball.position);
        else ball.position.copy(p < .36 ? polar(PICK, REACH, BALL_Y) : polar(PLACE, REACH, STAND_Y));

        // camera: a slow orbit and push-in across the scroll, like a turntable product shot
        const az = rad(14 - 28 * p), el_ = rad(17 - 5 * Math.sin(p * Math.PI)), dist = camera.userData.dist * (1.05 - .1 * Math.sin(p * Math.PI));
        camera.position.set(look.x + dist * Math.cos(el_) * Math.sin(az), look.y + dist * Math.sin(el_), look.z + dist * Math.cos(el_) * Math.cos(az));
        camera.lookAt(look.x, look.y + lift(), look.z);
        renderer.render(world, camera);

        caps.forEach((c, k) => {
            const mid = (k + .5) / caps.length, w = 1 / caps.length;
            const v = clamp(1 - (Math.abs(p - mid) - w * .3) / (w * .2)), o = k === 0 && p < mid ? 1 : k === caps.length - 1 && p > mid ? 1 : v;   // one caption at a time
            c.style.opacity = o.toFixed(3);
            c.style.transform = `translateY(${((p - mid) * -60 * (o < 1 ? 1 : 0)).toFixed(1)}px)`;
            c.style.filter = o > .98 ? 'none' : `blur(${((1 - o) * 8).toFixed(1)}px)`;
        });
        $('rBase').textContent = Math.round(yawDeg) + '°';
        $('rShoulder').textContent = Math.round(deg(ik.A1)) + '°';
        $('rElbow').textContent = Math.round(Math.abs(deg(ik.A2 - ik.A1))) + '°';
        $('rGrip').textContent = grip > .5 ? 'Closed' : 'Open';
    }

    const measure = () => { target = clamp((scrollY - scene.offsetTop) / (scene.offsetHeight - innerHeight)); };
    function frame(now) {
        const dt = Math.min(.05, (now - last) / 1000 || .016); last = now;
        shown += (target - shown) * (1 - Math.exp(-dt * 6));           // damped follow: wheel steps turn into one glide
        if (Math.abs(target - shown) < 1e-4) shown = target;
        pose(shown);
        if (shown !== target) requestAnimationFrame(frame); else running = false;
    }
    const kick = () => { measure(); if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); } };
    addEventListener('scroll', kick, { passive: true });
    addEventListener('resize', () => { size(); pose(shown); });

    size(); measure(); shown = target; pose(shown);
    // self-check: the solved pose must put the fingertips where the keyframe asked
    { const ik = solve(REACH, BALL_Y); yaw.rotation.y = rad(PICK); sh.rotation.x = ik.s; el.rotation.x = ik.e; wr.rotation.x = ik.w; world.updateMatrixWorld(true);
      pinch.getWorldPosition(tmp); console.assert(tmp.distanceTo(polar(PICK, REACH, BALL_Y)) < .003, 'IK misses the ball by', tmp.distanceTo(polar(PICK, REACH, BALL_Y))); pose(shown); }
    canvas.classList.add('ready');
} catch (err) {
    console.error('3D arm unavailable:', err);                          // captions and readout still work without the canvas
}
