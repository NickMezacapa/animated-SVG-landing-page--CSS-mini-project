const vertexShaderSource = `#version 300 es

    uniform float u_time;
    uniform float u_timeOffset;

    in vec2 a_position;

    out vec4 v_position;

    ${document.getElementById("shader-snoise2d").textContent}
    
    void main () {
        float noiseX = snoise(a_position * 0.5 + u_time * 0.5) * 0.3;
        float noiseY = snoise(a_position * noiseX * 2.5 + u_time * 0.5) * 0.3;
        gl_Position = vec4(a_position + vec2(noiseX, noiseY), 0.0, 1.0);
        gl_PointSize = noiseY * 5.0 + 2.0;

        v_position = gl_Position;
    }
`;

const fragmentShaderSource = `#version 300 es
    precision highp float;

    in vec4 v_position;

    out vec4 outColor;

    void main() {
        outColor = vec4(v_position.xyz + 0.5, 1.0);
    }
`;

const webglUtils = {
	makeShader(gl, type, source) {
		let shader = gl.createShader(type);
		gl.shaderSource(shader, source);
		gl.compileShader(shader);

		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			// If the shader failed to compile, alert the info log.
			let shaderType = type === gl.VERTEX_SHADER ? "VERTEX" : "FRAGMENT";
			console.error(
				`Error compiling ${shaderType} shader: 
                ${gl.getShaderInfoLog(shader)}`,
			);
			gl.deleteShader(shader);

			return;
		}

		return shader;
	},

	// Creating a program from the given vertex and fragment shader.
	makeProgram(gl, vertexShader, fragmentShader, doValidate = false) {
		let program = gl.createProgram();
		gl.attachShader(program, vertexShader);
		gl.attachShader(program, fragmentShader);
		gl.linkProgram(program);

		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			// If the program failed to link, alert the info log.
			console.error(`Error linking program: ${gl.getProgramInfoLog(program)}`);
			gl.deleteProgram(program);
			return;
		}

		if (doValidate) {
			// If the program failed to validate, alert the info log.
			gl.validateProgram(program);
			if (!gl.getProgramParameter(program, gl.VALIDATE_STATUS)) {
				console.error(
					`Error validating program ${gl.getProgramInfoLog(program)}`,
				);
				gl.deleteProgram(program);
				return;
			}
		}

		gl.deleteShader(vertexShader);
		gl.deleteShader(fragmentShader);

		return program;
	},

	// Creating a buffer from the given data.
	// The data is an array of numbers.
	makeBuffer(gl, { bufferType, typedArray, drawType }) {
		const buffer = gl.createBuffer();
		gl.bindBuffer(bufferType, buffer);
		gl.bufferData(bufferType, typedArray, drawType);
		// gl.bindBuffer(bufferType, null)

		buffer.typedArray = typedArray;

		return buffer;
	},

	// Creating a texture from the given html image.
	bindBuffer(
		gl,
		buffer,
		{ bufferType, attribLocation, attribType, itemsPerVert },
	) {
		gl.bindBuffer(bufferType, buffer);
		if (!buffer) return;
		gl.enableVertexAttribArray(attribLocation);
		gl.vertexAttribPointer(
			attribLocation,
			itemsPerVert,
			attribType,
			false,
			0,
			0,
		);
		gl.bindBuffer(bufferType, null);
	},
	makeVAO(gl, attribs) {
		const rtn = {
			buffers: [],
			vao: gl.createVertexArray(),
		};

		gl.bindVertexArray(rtn.vao);

		rtn.buffers = attribs.map((attrib) => {
			// For each attribute, create a buffer and bind it to the attribute.
			const buffer = this.makeBuffer(gl, attrib);
			if (attrib.bufferType !== gl.ELEMENT_ARRAY_BUFFER) {
				// If the buffer is not an index buffer, bind it to the attribute.
				this.bindBuffer(gl, buffer, attrib);
			}
			return buffer;
		});

		gl.bindVertexArray(null);

		return rtn; // { buffers, vao }
	},
};

// Initialize the canvas and start the animation.
class Blob {
	constructor({ numPoints, vShaderSource, fShaderSource }) {
		this._numPoints = numPoints;
		this._vShaderSource = vShaderSource;
		this._fShaderSource = fShaderSource;
		this._uniformLocations = {};

		this._targetTimeOffset = 1;
		this._timeOffset = 1;

		this._gl = null;
		this._program = null;
		this._rtn = null;
	}

	// Creating a new vertex array object (VAO) and binding it to the WebGL context.
	// We are also creating a new buffer object (VBO) and binding it to the WebGL context.
	_setupVAO() {
		const { _gl: gl } = this;
		const positions = new Float32Array(this._numPoints * 2);

		const step = (Math.PI * 200) / this._numPoints;

		for (let i = 0; i < this._numPoints; i += 1) {
			positions[i * 2 + 0] = Math.sin(i * step) * (i / 85000);
			positions[i * 2 + 1] = Math.cos(i * step) * (i / 85000);
		}

		const attribs = [
			{
				bufferType: gl.ARRAY_BUFFER,
				typedArray: positions,
				drawType: gl.STREAM_DRAW,
				attribType: gl.FLOAT,
				itemsPerVert: 2,
				attribLocation: gl.getAttribLocation(this._program, "a_position"),
			},
		];

		this._rtn = webglUtils.makeVAO(gl, attribs);
	}
	_setupUniforms() {
		// Setting up the uniform locations for the shader program.
		// We are also setting up the timeOffset uniform.
		// The timeOffset uniform is used to offset the time value in the shader.
		// This is done to make the animation look more natural.
		// The timeOffset uniform is set to 1.
		const { _gl: gl } = this;
		gl.useProgram(this._program);
		this._uniformLocations["u_time"] = gl.getUniformLocation(
			this._program,
			"u_time",
		);
		this._uniformLocations["u_timeOffset"] = gl.getUniformLocation(
			this._program,
			"u_timeOffset",
		);
		gl.useProgram(null);
	}
	init(gl) {
		// Initializing the WebGL context.
		this._gl = gl;

		// Creating the shader program.
		const vertexShader = webglUtils.makeShader(
			gl, // WebGL context
			gl.VERTEX_SHADER, // shader type
			this._vShaderSource, // shader source
		);
		const fragmentShader = webglUtils.makeShader(
			gl,
			gl.FRAGMENT_SHADER,
			this._fShaderSource,
		);
		this._program = webglUtils.makeProgram(gl, vertexShader, fragmentShader);

		this._setupVAO();
		this._setupUniforms();

		const timeOffsetInterval = setInterval(() => {
			// Setting the targetTimeOffset to a random value between -1 and 1.
			// The targetTimeOffset is used to offset the time value in the shader.
			this._targetTimeOffset = (Math.random() * 2 - 1) * 2;
		}, 3000);

		return this; // Returning the Blob object.
	}

	renderFrame(dt, now) {
		const { _gl: gl } = this;

		this._timeOffset +=
			(this._targetTimeOffset - this._timeOffset) * (dt * 2.25);
		// Easing the timeOffset.

		gl.useProgram(this._program);

		gl.uniform1f(this._uniformLocations["u_time"], now);
		gl.uniform1f(this._uniformLocations["u_timeOffset"], this._timeOffset);

		gl.bindVertexArray(this._rtn.vao);
		gl.drawArrays(0, 0, this._numPoints);
		gl.bindVertexArray(null);
		gl.useProgram(null);
	}
}
// Create the canvas and get the WebGL context.
const canvas = document.createElement("canvas");
const gl = canvas.getContext("webgl2");
const dpr = window.devicePixelRatio || 1; // Retrieve the devicePixelRatio.

const blob = new Blob({
	numPoints: 70000, // Number of points in the blob.
	vShaderSource: vertexShaderSource,
	fShaderSource: fragmentShaderSource,
}).init(gl);

let oldTimeMs = 0; // The previous time in milliseconds.

// Render the canvas
const renderFrame = () => {
	window.requestAnimationFrame(renderFrame);

	// The current time in milliseconds.
	// The number we divide by slows down the animation. The higher the number, the slower the animation.
	const currentTimeMs = window.performance.now() / 3000;

	// The time difference between the current and the previous frame.
	const dt = currentTimeMs - oldTimeMs;
	// Updating the old time.
	oldTimeMs = currentTimeMs;

	// Setting the viewport.
	gl.viewport(0, 0, window.innerWidth * dpr, window.innerHeight * dpr);
	gl.clearColor(0, 0, 0, 1);
	gl.clear(gl.COLOR_BUFFER_BIT);

	blob.renderFrame(dt, currentTimeMs); // Rendering the frame.
};

// Resize the canvas when the window is resized.
const init = () => {
	canvas.width = window.innerWidth * dpr;
	canvas.height = window.innerHeight * dpr;
	canvas.style.width = `${window.innerWidth}px`;
	canvas.style.height = `${window.innerHeight}px`;
	document.body.appendChild(canvas);
};

// Initialize the canvas and start the animation.
window.onload = () => {
	init();
	renderFrame();
};
window.onresize = init;

setTimeout(() => {
	document.body.style.opacity = 1;
}, 500);
setTimeout(() => {
	document.querySelector(".name").style.transform = "scale(1)";
	document.querySelector(".name").style.opacity = 1;
}, 1200);
setTimeout(() => {
	document.querySelectorAll(".description").forEach((el) => {
		el.style.transform = "scale(1)";
		el.style.opacity = 1;
	});
}, 2200);
