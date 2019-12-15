#version 130

const int MAX_STEPS = 1000;
const float EPS = 0.0001;
const float NEAR = 0;
const float FAR = 10000;

uniform float time;
uniform vec3 eye;
uniform vec3 eyeDir;

in vec2 fragCoord;

float cube(vec3 p, vec3 pos, float r) {
    vec3 d = abs(p - pos) - r;
    return min(max(max(d.x, d.y), d.z), 0.0) + length(max(d, 0.0));
}

float cylinder(vec3 p, vec3 pos, float h, float r) {
    p -= pos;
    vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(h,r);
    return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
}

float sphere(vec3 p, vec3 pos, float r) {
    return length(p - pos) - r;
}

float torus(vec3 p, vec3 pos, float r1, float r2) {
    p -= pos;
    vec2 q = vec2(length(p.xz) - r2, p.y);
    return length(q) - r1;
}

float plane(vec3 p, vec3 pos, vec3 n) {
    return dot(p - pos, n);
}

float jump(float x) {
    return (0.25 - pow((x - 0.5), 2)) * 4;
}

float sawtooth(float x) {
    return mod(x, 1.0);
}

float scene(vec3 p) {
    float figures = min(
        min(
            cube(p, vec3(-2, 0, 0), 0.5),
            cylinder(p, vec3(-2, 1 + jump(sawtooth(time / 1.5)), 0), 0.5, 0.5)
        ),
        min(
            sphere(p, vec3(sin(time), cos(time), 0), 0.4),
            torus(p, vec3(1, 0, 0), 0.5, 1.0)
        )
    );
    return figures;
}

float getDist(vec3 eye, vec3 dir) {
    float depth = NEAR;
    for (int i = 0; i < MAX_STEPS; ++i) {
        float dist = scene(eye + depth * dir);
        if (dist < EPS) {
            return depth;
        }
        depth += dist;
        if (depth >= FAR) {
            return FAR;
        }
    }
    return FAR;
}

vec3 getNormal(vec3 p) {
    return normalize(vec3(
        scene(vec3(p.x + EPS, p.y, p.z)) - scene(vec3(p.x - EPS, p.y, p.z)),
        scene(vec3(p.x, p.y + EPS, p.z)) - scene(vec3(p.x, p.y - EPS, p.z)),
        scene(vec3(p.x, p.y, p.z  + EPS)) - scene(vec3(p.x, p.y, p.z - EPS))
    ));
}

void main() {
    vec3 side = cross(eyeDir, vec3(0, 1, 0));
    vec3 up = cross(side, eyeDir);
    vec3 ray = normalize(eyeDir + side * fragCoord.x + up * fragCoord.y);
    float dist = getDist(eye, ray);

    if (dist < FAR) {
        vec3 normal = getNormal(eye + ray * dist);
        float light = 0.3 + 0.4 * dot(normal, -eyeDir) + 0.3 * dot(normal, normalize(vec3(1, 1, 1)));
        gl_FragColor = vec4(light, light, light, 1);
    } else {
        gl_FragColor = vec4(0, 0, 0, 1);
    }
}
