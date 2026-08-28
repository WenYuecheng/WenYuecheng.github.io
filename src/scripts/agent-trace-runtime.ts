import {
  BufferGeometry, CatmullRomCurve3, Group, Mesh, MeshBasicMaterial, PerspectiveCamera,
  Points, PointsMaterial, Scene, SphereGeometry, TubeGeometry, Vector3, WebGLRenderer,
} from 'three';

export function initializeAgentTrace(shell: HTMLElement, canvas: HTMLCanvasElement) {
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  const scene = new Scene();
  const camera = new PerspectiveCamera(38, 1, .1, 100);
  camera.position.z = 7.4;
  const group = new Group();
  scene.add(group);
  const curve = new CatmullRomCurve3([
    new Vector3(0, 2.2, 0), new Vector3(2.1, .2, .4), new Vector3(.1, -2.15, -.15),
    new Vector3(-2.1, 0, .45), new Vector3(0, 2.2, 0),
  ], true, 'catmullrom', .35);
  group.add(new Mesh(new TubeGeometry(curve, 96, .018, 5, true), new MeshBasicMaterial({ color: 0x8fe8ff, transparent: true, opacity: .58 })));
  group.add(new Points(new BufferGeometry().setFromPoints(curve.getPoints(96)), new PointsMaterial({ color: 0x8fe8ff, size: .055, transparent: true, opacity: .42 })));
  const nodeGeometry = new SphereGeometry(.075, 14, 14);
  const nodeMaterial = new MeshBasicMaterial({ color: 0x8fe8ff });
  [0, .25, .5, .75].forEach((position, index) => {
    const node = new Mesh(nodeGeometry, index === 0 ? new MeshBasicMaterial({ color: 0xff9a62 }) : nodeMaterial);
    node.position.copy(curve.getPointAt(position));
    group.add(node);
  });
  const signal = new Mesh(new SphereGeometry(.115, 16, 16), new MeshBasicMaterial({ color: 0xff9a62 }));
  group.add(signal);
  const startedAt = performance.now();
  let running = true;
  let visible = true;
  let frame = 0;
  const resize = () => {
    renderer.setSize(shell.clientWidth, shell.clientHeight, false);
    camera.aspect = shell.clientWidth / shell.clientHeight;
    camera.updateProjectionMatrix();
  };
  resize();
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(shell);
  const render = () => {
    if (!running) return;
    if (visible && !document.hidden) {
      const elapsed = (performance.now() - startedAt) / 1000;
      signal.position.copy(curve.getPointAt((elapsed * .065) % 1));
      group.rotation.z = Math.sin(elapsed * .18) * .035;
      group.rotation.y = Math.sin(elapsed * .14) * .12;
      renderer.render(scene, camera);
    }
    frame = requestAnimationFrame(render);
  };
  const visibilityObserver = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    shell.dataset.tracePaused = String(!visible);
  }, { threshold: .05 });
  visibilityObserver.observe(shell);
  document.addEventListener('visibilitychange', () => { shell.dataset.tracePaused = String(document.hidden || !visible); });
  shell.dataset.traceMode = 'webgl';
  shell.dataset.tracePaused = 'false';
  render();
  addEventListener('pagehide', () => {
    running = false;
    cancelAnimationFrame(frame);
    resizeObserver.disconnect();
    visibilityObserver.disconnect();
    renderer.dispose();
  }, { once: true });
}
