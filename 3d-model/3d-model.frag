#version 130

uniform vec3 lights[3];

varying vec3 normal;
varying vec3 cameraPos;
varying vec4 vertexColor;

uniform vec4 lightColors[3] = vec4[3](
    vec4(1, 0, 0, 0),
    vec4(0, 1, 0, 0),
    vec4(0, 0, 1, 0)
);

uniform sampler2D noiseTexture;
uniform float threshold;

uniform float ia = 0.5;
uniform float ka = 0.2;
uniform float kd = 0.4;
uniform float ks = 0.3;

in vec2 fragTexCoord;

void main() {
    if (texture(noiseTexture, fragTexCoord)[0] > threshold) {
        discard;
    }
    float light = (ka * ia + ks * dot(normal, cameraPos));
    gl_FragColor = vec4(0, 0, 0, 1);
    for (int i = 0; i < 3; ++i) {
        gl_FragColor += (light + kd * dot(normal, lights[i])) * lightColors[i];
    }
}
