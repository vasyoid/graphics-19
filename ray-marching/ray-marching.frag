#version 130

const vec3 COLOR_RED = vec3(1, 0, 0);
const vec3 COLOR_GREEN = vec3(0, 1, 0);
const vec3 COLOR_BLUE = vec3(0, 0, 1);
const vec3 COLOR_BLACK = vec3(0, 0, 0);
const vec3 COLOR_WHITE = vec3(1, 1, 1);

const float EPS = 0.0001;
const float NEAR = 0;
const float FAR = 10000;

uniform float time;
uniform vec3 eye;
uniform vec3 eyeDir;
uniform int maxSteps;

in vec2 fragCoord;

struct MarchResult {
    float dist;
    vec3 color;
};

MarchResult cube(vec3 p, vec3 pos, float r, vec3 color) {
    vec3 d = abs(p - pos) - r;
    return MarchResult(min(max(max(d.x, d.y), d.z), 0.0) + length(max(d, 0.0)), color);
}

MarchResult cylinder(vec3 p, vec3 pos, float h, float r, vec3 color) {
    p -= pos;
    vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(h, r);
    return MarchResult(min(max(d.x, d.y), 0.0) + length(max(d, 0.0)), color);
}

MarchResult sphere(vec3 p, vec3 pos, float r, vec3 color) {
    return MarchResult(length(p - pos) - r, color);
}

MarchResult torus(vec3 p, vec3 pos, float r1, float r2, vec3 color) {
    p -= pos;
    vec2 q = vec2(length(p.xz) - r2, p.y);
    return MarchResult(length(q) - r1, color);
}

MarchResult plane(vec3 p, vec3 pos, vec3 n, vec3 color) {
    return MarchResult(dot(p - pos, n), color);
}

float jump(float x) {
    return (0.25 - pow((x - 0.5), 2)) * 4;
}

float sawtooth(float x) {
    return mod(x, 1.0);
}

MarchResult intersect(MarchResult a, MarchResult b) {
    return a.dist > b.dist ? a : b;
}

MarchResult unite(MarchResult a, MarchResult b) {
    return a.dist < b.dist ? a : b;
}

MarchResult subtract(MarchResult a, MarchResult b) {
    b.dist *= -1;
    return intersect(a, b);
}

MarchResult unite_smooth(MarchResult a, MarchResult b, float k) {
    float h = clamp(0.5 + 0.5 * (b.dist - a.dist) / k, 0.0, 1.0);
    return MarchResult(mix(b.dist, a.dist, h) - k * h * (1.0 - h), mix(b.color, a.color, h) - k * h * (1.0 - h));
}

MarchResult intersect_smooth(MarchResult a, MarchResult b, float k) {
    float h = clamp(0.5 + 0.5 * (b.dist - a.dist) / k, 0.0, 1.0);
    return MarchResult(mix(a.dist, b.dist, h) + k * h * (1.0 - h), mix(a.color, b.color, h) + k * h * (1.0 - h));
}

MarchResult subtract_smooth(MarchResult a, MarchResult b, float k) {
    b.dist *= -1;
    return intersect_smooth(a, b, k);
}

MarchResult old_scene(vec3 p) {
    return unite(
        unite(
            cube(p, vec3(-2, 0, 0), 0.5, COLOR_WHITE),
            cylinder(p, vec3(-2, 1 + jump(sawtooth(time / 1.5)), 0), 0.5, 0.5, COLOR_BLUE)
        ),
        unite(
            sphere(p, vec3(sin(time), cos(time), 0), 0.4, COLOR_WHITE),
            torus(p, vec3(1, 0, 0), 0.5, 1.0, COLOR_WHITE)
        )
    );
}

MarchResult simple_csg(vec3 p) {
    vec3 pos = vec3(-2, 0, 2);
    vec3 offset = vec3(0.5, 0, 0);
    return unite(
        subtract(
            intersect(cube(p, pos, 0.5, COLOR_WHITE), sphere(p, pos, 0.7, COLOR_RED)),
            cylinder(p, pos, 0.2, 0.6, COLOR_GREEN)
        ),
        unite(sphere(p, pos + offset, 0.25, COLOR_BLUE), sphere(p, pos - offset, 0.25, COLOR_BLUE))
    );
}

MarchResult smooth_csg(vec3 p) {
    vec3 pos = vec3(-2, 0, 4);
    vec3 offset = vec3(0.5, 0, 0);
    float k = (1 + sin(time)) * 0.1;
    return unite_smooth(
        subtract_smooth(
            intersect_smooth(cube(p, pos, 0.5, COLOR_WHITE), sphere(p, pos, 0.7, COLOR_RED), k),
            cylinder(p, pos, 0.2, 0.6, COLOR_GREEN),
            k
        ),
        unite_smooth(sphere(p, pos + offset, 0.25, COLOR_BLUE), sphere(p, pos - offset, 0.25, COLOR_BLUE), k),
        k
    );
}

MarchResult scene(vec3 p) {
    MarchResult old = old_scene(p);
    MarchResult simple = simple_csg(p);
    MarchResult smth = smooth_csg(p);

    return unite(unite(simple, smth), old);
}

MarchResult ray_marching(vec3 eye, vec3 dir) {
    float depth = NEAR;
    for (int i = 0; i < maxSteps; ++i) {
        MarchResult marchResult = scene(eye + depth * dir);
        if (marchResult.dist < EPS) {
            return MarchResult(depth, marchResult.color);
        }
        depth += marchResult.dist;
        if (depth >= FAR) {
            return MarchResult(FAR, COLOR_BLACK);
        }
    }
    return MarchResult(FAR, COLOR_BLACK);
}

vec3 get_normal(vec3 p) {
    return normalize(vec3(
        scene(vec3(p.x + EPS, p.y, p.z)).dist - scene(vec3(p.x - EPS, p.y, p.z)).dist,
        scene(vec3(p.x, p.y + EPS, p.z)).dist - scene(vec3(p.x, p.y - EPS, p.z)).dist,
        scene(vec3(p.x, p.y, p.z  + EPS)).dist - scene(vec3(p.x, p.y, p.z - EPS)).dist
    ));
}

void main() {
    vec3 side = cross(eyeDir, vec3(0, 1, 0));
    vec3 up = cross(side, eyeDir);
    vec3 ray = normalize(eyeDir + side * fragCoord.x + up * fragCoord.y);
    MarchResult marchResult = ray_marching(eye, ray);

    if (marchResult.dist < FAR) {
        vec3 normal = get_normal(eye + ray * marchResult.dist);
        float light = 0.3 + 0.4 * dot(normal, -eyeDir) + 0.3 * dot(normal, normalize(vec3(1, 1, 1)));
        gl_FragColor = vec4(marchResult.color * light, 1);
    } else {
        gl_FragColor = vec4(0, 0, 0, 1);
    }
}
