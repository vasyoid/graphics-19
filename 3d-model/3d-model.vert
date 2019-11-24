#version 120

uniform vec4 lights[3];

varying vec3 lightsTransformed[3];
varying vec3 normal;
varying vec3 cameraPos;
varying vec4 vertexColor;

void main() {
    for (int i = 0; i < 3; ++i) {
        lightsTransformed[i] = normalize(vec3(gl_ModelViewMatrix * lights[i]));
    }
    cameraPos = normalize(vec3(gl_ModelViewMatrix * gl_Vertex));
    normal = normalize(gl_NormalMatrix * gl_Normal);
    gl_Position = ftransform();
    vertexColor = gl_Color;
}
