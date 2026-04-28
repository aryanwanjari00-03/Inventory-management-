import * as faceapi from 'face-api.js';
import { BloomEffect, ChromaticAberrationEffect, EffectComposer, EffectPass, RenderPass } from 'postprocessing';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { vert, frag } from './shaders.js';
import './GridScan.css';

export const GridScan = ({
  enableWebcam = false, showPreview = false,
  modelsPath = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights',
  sensitivity = 0.55, lineThickness = 1, linesColor = '#2F293A',
  scanColor = '#FF9FFC', scanOpacity = 0.4, gridScale = 0.1,
  lineStyle = 'solid', lineJitter = 0.1, scanDirection = 'pingpong',
  enablePost = true, bloomIntensity = 0, bloomThreshold = 0, bloomSmoothing = 0,
  chromaticAberration = 0.002, noiseIntensity = 0.01,
  scanGlow = 0.5, scanSoftness = 2, scanPhaseTaper = 0.9,
  scanDuration = 2.0, scanDelay = 2.0, enableGyro = false,
  scanOnClick = false, snapBackDelay = 250, className, style
}) => {
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const rendererRef = useRef(null);
  const materialRef = useRef(null);
  const composerRef = useRef(null);
  const bloomRef = useRef(null);
  const chromaRef = useRef(null);
  const rafRef = useRef(null);
  const [modelsReady, setModelsReady] = useState(false);
  const [uiFaceActive, setUiFaceActive] = useState(false);
  const lookTarget = useRef(new THREE.Vector2(0, 0));
  const tiltTarget = useRef(0);
  const yawTarget = useRef(0);
  const lookCurrent = useRef(new THREE.Vector2(0, 0));
  const lookVel = useRef(new THREE.Vector2(0, 0));
  const tiltCurrent = useRef(0);
  const tiltVel = useRef(0);
  const yawCurrent = useRef(0);
  const yawVel = useRef(0);
  const MAX_SCANS = 8;
  const scanStartsRef = useRef([]);

  const pushScan = t => {
    const arr = scanStartsRef.current.slice();
    if (arr.length >= MAX_SCANS) arr.shift();
    arr.push(t);
    scanStartsRef.current = arr;
    if (materialRef.current) {
      const u = materialRef.current.uniforms;
      const buf = new Array(MAX_SCANS).fill(0);
      for (let i = 0; i < arr.length && i < MAX_SCANS; i++) buf[i] = arr[i];
      u.uScanStarts.value = buf;
      u.uScanCount.value = arr.length;
    }
  };

  const bufX = useRef([]);
  const bufY = useRef([]);
  const bufT = useRef([]);
  const bufYaw = useRef([]);
  const s = THREE.MathUtils.clamp(sensitivity, 0, 1);
  const skewScale = THREE.MathUtils.lerp(0.06, 0.2, s);
  const tiltScale = THREE.MathUtils.lerp(0.12, 0.3, s);
  const yawScale = THREE.MathUtils.lerp(0.1, 0.28, s);
  const depthResponse = THREE.MathUtils.lerp(0.25, 0.45, s);
  const smoothTime = THREE.MathUtils.lerp(0.45, 0.12, s);
  const maxSpeed = Infinity;
  const yBoost = THREE.MathUtils.lerp(1.2, 1.6, s);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let leaveTimer = null;
    const onMove = e => {
      if (uiFaceActive) return;
      if (leaveTimer) { clearTimeout(leaveTimer); leaveTimer = null; }
      const rect = el.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      lookTarget.current.set(nx, ny);
    };
    const onClick = async () => {
      const nowSec = performance.now() / 1000;
      if (scanOnClick) pushScan(nowSec);
      if (enableGyro && typeof window !== 'undefined' && window.DeviceOrientationEvent && DeviceOrientationEvent.requestPermission) {
        try { await DeviceOrientationEvent.requestPermission(); } catch {}
      }
    };
    const onEnter = () => { if (leaveTimer) { clearTimeout(leaveTimer); leaveTimer = null; } };
    const onLeave = () => {
      if (uiFaceActive) return;
      if (leaveTimer) clearTimeout(leaveTimer);
      leaveTimer = window.setTimeout(() => {
        lookTarget.current.set(0, 0);
        tiltTarget.current = 0;
        yawTarget.current = 0;
      }, Math.max(0, snapBackDelay || 0));
    };
    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseenter', onEnter);
    if (scanOnClick) el.addEventListener('click', onClick);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseenter', onEnter);
      el.removeEventListener('mouseleave', onLeave);
      if (scanOnClick) el.removeEventListener('click', onClick);
      if (leaveTimer) clearTimeout(leaveTimer);
    };
  }, [uiFaceActive, snapBackDelay, scanOnClick, enableGyro]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    rendererRef.current = renderer;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.autoClear = false;
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const uniforms = {
      iResolution: { value: new THREE.Vector3(container.clientWidth, container.clientHeight, renderer.getPixelRatio()) },
      iTime: { value: 0 },
      uSkew: { value: new THREE.Vector2(0, 0) },
      uTilt: { value: 0 }, uYaw: { value: 0 },
      uLineThickness: { value: lineThickness },
      uLinesColor: { value: srgbColor(linesColor) },
      uScanColor: { value: srgbColor(scanColor) },
      uGridScale: { value: gridScale },
      uLineStyle: { value: lineStyle === 'dashed' ? 1 : lineStyle === 'dotted' ? 2 : 0 },
      uLineJitter: { value: Math.max(0, Math.min(1, lineJitter || 0)) },
      uScanOpacity: { value: scanOpacity },
      uNoise: { value: noiseIntensity },
      uBloomOpacity: { value: bloomIntensity },
      uScanGlow: { value: scanGlow },
      uScanSoftness: { value: scanSoftness },
      uPhaseTaper: { value: scanPhaseTaper },
      uScanDuration: { value: scanDuration },
      uScanDelay: { value: scanDelay },
      uScanDirection: { value: scanDirection === 'backward' ? 1 : scanDirection === 'pingpong' ? 2 : 0 },
      uScanStarts: { value: new Array(MAX_SCANS).fill(0) },
      uScanCount: { value: 0 }
    };
    const material = new THREE.ShaderMaterial({ uniforms, vertexShader: vert, fragmentShader: frag, transparent: true, depthWrite: false, depthTest: false });
    materialRef.current = material;
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(quad);

    let composer = null;
    if (enablePost) {
      composer = new EffectComposer(renderer);
      composerRef.current = composer;
      composer.addPass(new RenderPass(scene, camera));
      const bloom = new BloomEffect({ intensity: 1.0, luminanceThreshold: bloomThreshold, luminanceSmoothing: bloomSmoothing });
      bloom.blendMode.opacity.value = Math.max(0, bloomIntensity);
      bloomRef.current = bloom;
      const chroma = new ChromaticAberrationEffect({ offset: new THREE.Vector2(chromaticAberration, chromaticAberration), radialModulation: true, modulationOffset: 0.0 });
      chromaRef.current = chroma;
      const effectPass = new EffectPass(camera, bloom, chroma);
      effectPass.renderToScreen = true;
      composer.addPass(effectPass);
    }

    const onResize = () => {
      renderer.setSize(container.clientWidth, container.clientHeight);
      material.uniforms.iResolution.value.set(container.clientWidth, container.clientHeight, renderer.getPixelRatio());
      if (composerRef.current) composerRef.current.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', onResize);

    let last = performance.now();
    const tick = () => {
      const now = performance.now();
      const dt = Math.max(0, Math.min(0.1, (now - last) / 1000));
      last = now;
      lookCurrent.current.copy(smoothDampVec2(lookCurrent.current, lookTarget.current, lookVel.current, smoothTime, maxSpeed, dt));
      const tiltSm = smoothDampFloat(tiltCurrent.current, tiltTarget.current, { v: tiltVel.current }, smoothTime, maxSpeed, dt);
      tiltCurrent.current = tiltSm.value; tiltVel.current = tiltSm.v;
      const yawSm = smoothDampFloat(yawCurrent.current, yawTarget.current, { v: yawVel.current }, smoothTime, maxSpeed, dt);
      yawCurrent.current = yawSm.value; yawVel.current = yawSm.v;
      const skew = new THREE.Vector2(lookCurrent.current.x * skewScale, -lookCurrent.current.y * yBoost * skewScale);
      material.uniforms.uSkew.value.set(skew.x, skew.y);
      material.uniforms.uTilt.value = tiltCurrent.current * tiltScale;
      material.uniforms.uYaw.value = THREE.MathUtils.clamp(yawCurrent.current * yawScale, -0.6, 0.6);
      material.uniforms.iTime.value = now / 1000;
      renderer.clear(true, true, true);
      if (composerRef.current) composerRef.current.render(dt);
      else renderer.render(scene, camera);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', onResize);
      material.dispose(); quad.geometry.dispose();
      if (composerRef.current) { composerRef.current.dispose(); composerRef.current = null; }
      renderer.dispose(); renderer.forceContextLoss();
      container.removeChild(renderer.domElement);
    };
  }, [sensitivity, lineThickness, linesColor, scanColor, scanOpacity, gridScale, lineStyle, lineJitter, scanDirection, enablePost, noiseIntensity, bloomIntensity, scanGlow, scanSoftness, scanPhaseTaper, scanDuration, scanDelay, bloomThreshold, bloomSmoothing, chromaticAberration, smoothTime, maxSpeed, skewScale, yBoost, tiltScale, yawScale]);

  useEffect(() => {
    const m = materialRef.current;
    if (m) {
      const u = m.uniforms;
      u.uLineThickness.value = lineThickness;
      u.uLinesColor.value.copy(srgbColor(linesColor));
      u.uScanColor.value.copy(srgbColor(scanColor));
      u.uGridScale.value = gridScale;
      u.uLineStyle.value = lineStyle === 'dashed' ? 1 : lineStyle === 'dotted' ? 2 : 0;
      u.uLineJitter.value = Math.max(0, Math.min(1, lineJitter || 0));
      u.uBloomOpacity.value = Math.max(0, bloomIntensity);
      u.uNoise.value = Math.max(0, noiseIntensity);
      u.uScanGlow.value = scanGlow;
      u.uScanOpacity.value = Math.max(0, Math.min(1, scanOpacity));
      u.uScanDirection.value = scanDirection === 'backward' ? 1 : scanDirection === 'pingpong' ? 2 : 0;
      u.uScanSoftness.value = scanSoftness;
      u.uPhaseTaper.value = scanPhaseTaper;
      u.uScanDuration.value = Math.max(0.05, scanDuration);
      u.uScanDelay.value = Math.max(0.0, scanDelay);
    }
    if (bloomRef.current) {
      bloomRef.current.blendMode.opacity.value = Math.max(0, bloomIntensity);
      bloomRef.current.luminanceMaterial.threshold = bloomThreshold;
      bloomRef.current.luminanceMaterial.smoothing = bloomSmoothing;
    }
    if (chromaRef.current) chromaRef.current.offset.set(chromaticAberration, chromaticAberration);
  }, [lineThickness, linesColor, scanColor, gridScale, lineStyle, lineJitter, bloomIntensity, bloomThreshold, bloomSmoothing, chromaticAberration, noiseIntensity, scanGlow, scanOpacity, scanDirection, scanSoftness, scanPhaseTaper, scanDuration, scanDelay]);

  useEffect(() => {
    if (!enableGyro) return;
    const handler = e => {
      if (uiFaceActive) return;
      const gamma = e.gamma ?? 0; const beta = e.beta ?? 0;
      lookTarget.current.set(THREE.MathUtils.clamp(gamma / 45, -1, 1), THREE.MathUtils.clamp(-beta / 30, -1, 1));
      tiltTarget.current = THREE.MathUtils.degToRad(gamma) * 0.4;
    };
    window.addEventListener('deviceorientation', handler);
    return () => window.removeEventListener('deviceorientation', handler);
  }, [enableGyro, uiFaceActive]);

  useEffect(() => {
    let canceled = false;
    const load = async () => {
      try {
        await Promise.all([faceapi.nets.tinyFaceDetector.loadFromUri(modelsPath), faceapi.nets.faceLandmark68TinyNet.loadFromUri(modelsPath)]);
        if (!canceled) setModelsReady(true);
      } catch { if (!canceled) setModelsReady(false); }
    };
    load();
    return () => { canceled = true; };
  }, [modelsPath]);

  useEffect(() => {
    let stop = false; let lastDetect = 0;
    const video = videoRef.current;
    const start = async () => {
      if (!enableWebcam || !modelsReady || !video) return;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
        video.srcObject = stream; await video.play();
      } catch { return; }
      const opts = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });
      const detect = async ts => {
        if (stop) return;
        if (ts - lastDetect >= 33) {
          lastDetect = ts;
          try {
            const res = await faceapi.detectSingleFace(video, opts).withFaceLandmarks(true);
            if (res && res.detection) {
              const box = res.detection.box;
              const vw = video.videoWidth || 1; const vh = video.videoHeight || 1;
              const nx = ((box.x + box.width * 0.5) / vw) * 2 - 1;
              const ny = ((box.y + box.height * 0.5) / vh) * 2 - 1;
              medianPush(bufX.current, nx, 5); medianPush(bufY.current, ny, 5);
              const look = new THREE.Vector2(Math.tanh(median(bufX.current)), Math.tanh(median(bufY.current)));
              const faceSize = Math.min(1, Math.hypot(box.width / vw, box.height / vh));
              lookTarget.current.copy(look.multiplyScalar(1 + depthResponse * (faceSize - 0.25)));
              const lc = centroid(res.landmarks.getLeftEye()); const rc = centroid(res.landmarks.getRightEye());
              medianPush(bufT.current, Math.atan2(rc.y - lc.y, rc.x - lc.x), 5);
              tiltTarget.current = median(bufT.current);
              const nose = res.landmarks.getNose(); const tip = nose[nose.length - 1] || nose[Math.floor(nose.length / 2)];
              const jaw = res.landmarks.getJawOutline();
              const eyeDist = Math.hypot(rc.x - lc.x, rc.y - lc.y) + 1e-6;
              let yawSignal = THREE.MathUtils.clamp((dist2(tip, jaw[13] || jaw[14]) - dist2(tip, jaw[3] || jaw[2])) / (eyeDist * 1.6), -1, 1);
              medianPush(bufYaw.current, Math.tanh(yawSignal), 5);
              yawTarget.current = median(bufYaw.current);
              setUiFaceActive(true);
            } else setUiFaceActive(false);
          } catch { setUiFaceActive(false); }
        }
        if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) video.requestVideoFrameCallback(() => detect(performance.now()));
        else requestAnimationFrame(detect);
      };
      requestAnimationFrame(detect);
    };
    start();
    return () => { stop = true; if (video) { const s = video.srcObject; if (s) s.getTracks().forEach(t => t.stop()); video.pause(); video.srcObject = null; } };
  }, [enableWebcam, modelsReady, depthResponse]);

  return (
    <div ref={containerRef} className={`gridscan${className ? ` ${className}` : ''}`} style={style}>
      {showPreview && (
        <div className="gridscan__preview">
          <video ref={videoRef} muted playsInline autoPlay className="gridscan__video" />
          <div className="gridscan__badge">{enableWebcam ? modelsReady ? uiFaceActive ? 'Face: tracking' : 'Face: searching' : 'Loading models' : 'Webcam disabled'}</div>
        </div>
      )}
    </div>
  );
};

function srgbColor(hex) { const c = new THREE.Color(hex); return c.convertSRGBToLinear(); }

function smoothDampVec2(current, target, currentVelocity, smoothTime, maxSpeed, deltaTime) {
  const out = current.clone(); smoothTime = Math.max(0.0001, smoothTime);
  const omega = 2 / smoothTime; const x = omega * deltaTime;
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  let change = current.clone().sub(target); const maxChange = maxSpeed * smoothTime;
  if (change.length() > maxChange) change.setLength(maxChange);
  const tgt = current.clone().sub(change);
  const temp = currentVelocity.clone().addScaledVector(change, omega).multiplyScalar(deltaTime);
  currentVelocity.sub(temp.clone().multiplyScalar(omega)); currentVelocity.multiplyScalar(exp);
  out.copy(tgt.clone().add(change.add(temp).multiplyScalar(exp)));
  if (target.clone().sub(current).dot(out.clone().sub(target)) > 0) { out.copy(target); currentVelocity.set(0, 0); }
  return out;
}

function smoothDampFloat(current, target, velRef, smoothTime, maxSpeed, deltaTime) {
  smoothTime = Math.max(0.0001, smoothTime);
  const omega = 2 / smoothTime; const x = omega * deltaTime;
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  let change = current - target; const maxChange = maxSpeed * smoothTime;
  change = Math.sign(change) * Math.min(Math.abs(change), maxChange);
  const tgt = current - change;
  const temp = (velRef.v + omega * change) * deltaTime;
  velRef.v = (velRef.v - omega * temp) * exp;
  let out = tgt + (change + temp) * exp;
  if ((target - current) * (out - target) > 0) { out = target; velRef.v = 0; }
  return { value: out, v: velRef.v };
}

function medianPush(buf, v, maxLen) { buf.push(v); if (buf.length > maxLen) buf.shift(); }
function median(buf) { if (!buf.length) return 0; const a = [...buf].sort((x, y) => x - y); const mid = Math.floor(a.length / 2); return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) * 0.5; }
function centroid(points) { let x = 0, y = 0; const n = points.length || 1; for (const p of points) { x += p.x; y += p.y; } return { x: x / n, y: y / n }; }
function dist2(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

export default GridScan;
