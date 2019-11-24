#version 120

varying vec3 lightsTransformed[3];
varying vec3 normal;
varying vec3 cameraPos;
varying vec4 vertexColor;

uniform vec4 lightColors[3] = vec4[3](
    vec4(1, 0, 0, 0),
    vec4(0, 1, 0, 0),
    vec4(0, 0, 1, 0)
);

const float ia = 0.5;
const float ka = 0.2;
const float kd = 0.3;
const float ks = 0.4;

void main() {
    float light = (ka * ia + ks * dot(normal, cameraPos));
    gl_FragColor = vec4(0, 0, 0, 1);
    for (int i = 0; i < 3; ++i) {
        gl_FragColor += (light + kd * dot(normal, lightsTransformed[i])) * lightColors[i];
    }
}
