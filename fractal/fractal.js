let gl;

let aVertexPosition;
let aPlotPosition;

let typeLoc;
let iterLoc;
let tholdLoc;
let aLoc;
let bLoc;
let samplerLoc;
let nColorsLoc;

let centerOffsetX = 0;
let centerOffsetY = 0;

let zoom = 1;
let vertexPositionBuffer;
let baseCorners = [
    [1.5, 1],
    [-1.5, 1],
    [1.5, -1],
    [-1.5, -1],
];

let mousePos;
let canvasOffset;

let typeStrings = ["Мандельброт", "Жюлиа"];
typeParams = [[0, 0], [-0.71, 0.3]];
let type = 1;

let intervalId = null;

let texture;

function initGL(canvas) {
    try {
        gl = canvas.getContext("experimental-webgl");
        gl.viewportWidth = canvas.width;
        gl.viewportHeight = canvas.height;
    } catch (e) {
        alert("WebGL error: " + e);
        return;
    }
    if (!gl) {
        alert("WebGL is not supported");
    }
}

function createShader(id) {
    let shaderScript = document.getElementById(id);
    if (!shaderScript) {
        return null;
    }

    let shader;
    if (shaderScript.type === "x-shader/x-fragment") {
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    } else if (shaderScript.type === "x-shader/x-vertex") {
        shader = gl.createShader(gl.VERTEX_SHADER);
    } else {
        return null;
    }

    gl.shaderSource(shader, shaderScript.innerText);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert("Shader error: " + gl.getShaderInfoLog(shader));
        return null;
    }

    return shader;
}

function initShaders() {
    let shaderProgram = gl.createProgram();

    gl.attachShader(shaderProgram, createShader("shader-fs"));
    gl.attachShader(shaderProgram, createShader("shader-vs"));

    gl.linkProgram(shaderProgram);
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert("Could not initialize shaders");
    }

    typeLoc = gl.getUniformLocation(shaderProgram, "type");
    iterLoc = gl.getUniformLocation(shaderProgram, "iter");
    tholdLoc = gl.getUniformLocation(shaderProgram, "thold");
    aLoc = gl.getUniformLocation(shaderProgram, "a");
    bLoc = gl.getUniformLocation(shaderProgram, "b");
    samplerLoc = gl.getUniformLocation(shaderProgram, "uSampler");
    nColorsLoc = gl.getUniformLocation(shaderProgram, "nColors");

    gl.useProgram(shaderProgram);

    aVertexPosition = gl.getAttribLocation(shaderProgram, "aVertexPosition");
    gl.enableVertexAttribArray(aVertexPosition);

    aPlotPosition = gl.getAttribLocation(shaderProgram, "aPlotPosition");
    gl.enableVertexAttribArray(aPlotPosition);
}

function initBuffers() {
    vertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
    const vertices = [
        1.0, 1.0,
        -1.0, 1.0,
        1.0, -1.0,
        -1.0, -1.0,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    vertexPositionBuffer.itemSize = 2;
    vertexPositionBuffer.numItems = 4;
}

function drawScene() {
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(samplerLoc, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
    gl.vertexAttribPointer(aVertexPosition, vertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);


    let plotPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, plotPositionBuffer);
    let cornerIx;
    let corners = [];
    for (cornerIx in baseCorners) {
        let x = baseCorners[cornerIx][0];
        let y = baseCorners[cornerIx][1];
        corners.push(x / zoom + centerOffsetX);
        corners.push(y / zoom + centerOffsetY);
    }

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(corners), gl.STATIC_DRAW);
    gl.vertexAttribPointer(aPlotPosition, 2, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    gl.deleteBuffer(plotPositionBuffer);
}

function resizeCanvas(canvas) {
    canvas.height = window.innerHeight - 2 * canvasOffset;
    canvas.width = window.innerHeight * 1.5;
}

function onZoom(event) {
    let delta;
    if (event.deltaY < 0){
        delta = 1 - event.deltaY * 0.01;
    } else {
        delta = 1 / (1 + event.deltaY * 0.01);
    }
    let pos = globalToLocal(event.clientX, event.clientY);
    centerOffsetX += (delta - 1) * pos[0] / zoom / delta;
    centerOffsetY -= (delta - 1) * pos[1] / zoom / delta;
    zoom *= delta;
    drawScene();
}

function onDragBegin(event) {
    mousePos = globalToLocal(event.clientX, event.clientY);
}

function onDrag(event) {
    if (event.buttons !== 1) return;
    let pos = globalToLocal(event.clientX, event.clientY);
    let deltaX = pos[0] - mousePos[0];
    let deltaY = pos[1] - mousePos[1];
    centerOffsetX -= deltaX / zoom;
    centerOffsetY += deltaY / zoom;
    mousePos = pos;
    drawScene();
}

function globalToLocal(x, y) {
    return [
        (x - canvasOffset) / gl.viewportWidth * 3 - 1.5,
        (y - canvasOffset) / gl.viewportHeight * 2 - 1
    ];
}

function initTexture() {
    let gradient = new Uint8Array([255, 255, 255, 0, 0, 0, 0, 255, 0]);
    gl.uniform1f(nColorsLoc, gradient.length / 3);    
    texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gradient.length / 3, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, gradient);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
}

function webGLStart(bodyMargin) {
    canvasOffset = bodyMargin;
    let canvas = document.getElementById("fractal-canvas");
    resizeCanvas(canvas);

    canvas.addEventListener("wheel", onZoom);
    canvas.addEventListener("mousedown", onDragBegin);
    canvas.addEventListener("mousemove", onDrag);

    initGL(canvas);
    initShaders();
    initBuffers();
    initTexture();

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    switchType();
}

function update() {
    let t = Date.now() * 0.001;
    document.getElementById("paramA").value = Math.sin(t * 0.5) * 0.5;
    document.getElementById("paramB").value = Math.cos(t * 0.3) * 0.5;
    onSettingsChange();
}

function onSettingsChange() {
    let iter = document.getElementById("iter").value;
    let thold = document.getElementById("thold").value;
    let paramA = document.getElementById("paramA").value;
    let paramB = document.getElementById("paramB").value;

    gl.uniform1i(iterLoc, iter);
    gl.uniform1f(tholdLoc, thold);
    gl.uniform1f(aLoc, paramA);
    gl.uniform1f(bLoc, paramB);

    drawScene();
}

function switchType() {
    document.getElementById("desc" + type).style.display = "none";
    type = 1 - type;
    document.getElementById("desc" + type).style.display = "block";
    gl.uniform1i(typeLoc, type);
    document.getElementById("bType").value = typeStrings[type];
    document.getElementById("paramA").value = typeParams[type][0];
    document.getElementById("paramB").value = typeParams[type][1];
    onSettingsChange();
}

function switchAuto() {
    let value;
    if (intervalId === null) {
        value = "Стоп";
        intervalId = setInterval(update, 50);
    } else {
        value = "Авто";
        clearInterval(intervalId);
        intervalId = null;
    }
    document.getElementById("bAuto").value = value;
}