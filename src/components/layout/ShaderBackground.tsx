import { useEffect, useRef } from 'react'

const VERTEX_SHADER = `attribute vec2 a_position;
varying vec2 v_texCoord;
void main() {
  v_texCoord = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`

// Exact "breathing pastel waves" fragment shader from the approved Stitch
// loading-screen prototype (loading_screen/code.html) — soft sky/peach/mint
// pastel bands drifting via layered sine waves, matching the "cute lightweight
// animation, soft breathing color waves, pastel colors" requirement verbatim.
const FRAGMENT_SHADER = `precision highp float;
varying vec2 v_texCoord;
uniform float u_time;
uniform vec2 u_resolution;

void main() {
    vec2 uv = v_texCoord;

    float wave1 = sin(uv.x * 3.0 + u_time * 0.5) * 0.1;
    float wave2 = sin(uv.y * 2.5 - u_time * 0.3) * 0.1;
    float wave3 = cos((uv.x + uv.y) * 2.0 + u_time * 0.4) * 0.05;

    float noise = wave1 + wave2 + wave3;

    vec3 color1 = vec3(0.92, 0.96, 1.0); // Soft Sky
    vec3 color2 = vec3(1.0, 0.92, 0.92); // Soft Peach
    vec3 color3 = vec3(0.92, 1.0, 0.96); // Soft Mint

    vec3 finalColor = mix(color1, color2, uv.y + noise);
    finalColor = mix(finalColor, color3, uv.x - noise);

    float dist = distance(uv, vec2(0.5));
    finalColor += (1.0 - dist) * 0.05;

    gl_FragColor = vec4(finalColor, 1.0);
}`

function compileShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  return shader
}

/**
 * The approved loading-screen background: a tiny WebGL fragment shader
 * painting slow, organic pastel waves. Falls back to a static CSS
 * gradient (see .shader-fallback in LoadingScreen.css) when WebGL isn't
 * available — the canvas simply never draws over it in that case.
 */
export function ShaderBackground({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const glContext = canvas.getContext('webgl') ?? canvas.getContext('experimental-webgl')
    if (!glContext || !(glContext instanceof WebGLRenderingContext)) return
    // Re-bound to a fully-typed const so the nested `render` closure below
    // keeps the WebGLRenderingContext narrowing (TS doesn't always retain
    // control-flow narrowing of an outer `const` across a nested function).
    const gl: WebGLRenderingContext = glContext

    let frameId = 0
    let disposed = false

    function syncSize() {
      if (!canvas) return
      const w = canvas.clientWidth || 1280
      const h = canvas.clientHeight || 720
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
    }

    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(syncSize) : null
    resizeObserver?.observe(canvas)
    syncSize()

    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER)
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER)
    const program = gl.createProgram()
    if (!program || !vertexShader || !fragmentShader) return
    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)
    gl.useProgram(program)

    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const positionLoc = gl.getAttribLocation(program, 'a_position')
    gl.enableVertexAttribArray(positionLoc)
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0)

    const uTime = gl.getUniformLocation(program, 'u_time')
    const uRes = gl.getUniformLocation(program, 'u_resolution')

    function render(t: number) {
      if (disposed || !canvas || !gl) return
      if (!resizeObserver) syncSize()
      gl.viewport(0, 0, canvas.width, canvas.height)
      if (uTime) gl.uniform1f(uTime, t * 0.001)
      if (uRes) gl.uniform2f(uRes, canvas.width, canvas.height)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      frameId = requestAnimationFrame(render)
    }
    frameId = requestAnimationFrame(render)

    return () => {
      disposed = true
      cancelAnimationFrame(frameId)
      resizeObserver?.disconnect()
    }
  }, [])

  return (
    <div className={className} aria-hidden="true">
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
    </div>
  )
}
