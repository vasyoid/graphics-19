#version 130

const int MAX_STEPS = 200;
const float EPS = 0.0001;
const float NEAR = 1;
const float FAR = 100;

uniform float myTimer;

in vec3 position;

float sphere(vec3 pos, float r, vec3 p) {
    return length(p - pos) - r * r * r;
}

float scene(vec3 p) {
    return sphere(vec3(0, 0, 0), 1, p);
}

float getDist(vec3 eye, vec3 dir) {
    float depth = NEAR;
    for (int i = 0; i < MAX_STEPS; ++i) {
        float dist = scene(eye + depth * dir);
        if (dist < EPS) {
            return depth;
        }
        depth += dist;
    }
    return FAR;
}

vec3 normal(vec3 p) {
    return normalize(vec3(
        scene(vec3(p.x + EPS, p.y, p.z)) - scene(vec3(p.x - EPS, p.y, p.z)),
        scene(vec3(p.x, p.y + EPS, p.z)) - scene(vec3(p.x, p.y - EPS, p.z)),
        scene(vec3(p.x, p.y, p.z  + EPS)) - scene(vec3(p.x, p.y, p.z - EPS))
    ));
}

void main() {
    vec3 eye = vec3(0, 0, sin(myTimer) * 2 + 5);
    float dist = getDist(eye, normalize(position - eye));

    float light = 0.1 + 0.3 * dot(normal(position), normalize(eye)) + 0.4 * dot(normal(position), vec3(1, 0, 0));

    if (NEAR < dist && dist < FAR) {
        gl_FragColor = vec4(light, light, 0, 1);
    } else {
        gl_FragColor = vec4(0, 0, 0, 1);
    }
}
